package application

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type AuthService struct {
	users      domain.UserRepository
	sessions   domain.SessionRepository
	audits     domain.AuditRepository
	hasher     ports.PasswordHasher
	access     ports.AccessTokenManager
	refresh    ports.RefreshTokenManager
	uow        ports.UnitOfWork
	clock      ports.Clock
	ids        ports.IDGenerator
	refreshTTL time.Duration
}

func NewAuthService(users domain.UserRepository, sessions domain.SessionRepository, audits domain.AuditRepository, hasher ports.PasswordHasher, access ports.AccessTokenManager, refresh ports.RefreshTokenManager, uow ports.UnitOfWork, clock ports.Clock, ids ports.IDGenerator, refreshTTL time.Duration) *AuthService {
	return &AuthService{users: users, sessions: sessions, audits: audits, hasher: hasher, access: access, refresh: refresh, uow: uow, clock: clock, ids: ids, refreshTTL: refreshTTL}
}

type RegisterInput struct {
	Email, Password, DisplayName, UserAgent, IPAddress string
	AcceptedTermsVersion, AcceptedPrivacyVersion       string
}

type LoginInput struct {
	Email, Password, UserAgent, IPAddress string
}

type TokenPair struct {
	AccessToken   string
	AccessExpiry  time.Time
	RefreshToken  string
	RefreshExpiry time.Time
	User          domain.User
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (TokenPair, error) {
	in.Email = domain.NormalizeEmail(in.Email)
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	in.AcceptedTermsVersion = strings.TrimSpace(in.AcceptedTermsVersion)
	in.AcceptedPrivacyVersion = strings.TrimSpace(in.AcceptedPrivacyVersion)
	if in.Email == "" || len(in.Email) > 254 || !strings.Contains(in.Email, "@") || len(in.Password) < 12 || len(in.Password) > 128 || in.DisplayName == "" || len(in.DisplayName) > 100 {
		return TokenPair{}, domain.ValidationError{Fields: []domain.FieldError{{Field: "credentials", Message: "valid email, display name, and password of at least 12 characters are required"}}}
	}
	if in.AcceptedTermsVersion == "" || len(in.AcceptedTermsVersion) > 32 || in.AcceptedPrivacyVersion == "" || len(in.AcceptedPrivacyVersion) > 32 {
		return TokenPair{}, domain.ValidationError{Fields: []domain.FieldError{{Field: "consent", Message: "accepted terms and privacy policy versions are required"}}}
	}
	hash, err := s.hasher.Hash(in.Password)
	if err != nil {
		return TokenPair{}, fmt.Errorf("hash password: %w", err)
	}
	now := s.clock.Now()
	user := domain.User{ID: s.ids.New(), Email: in.Email, DisplayName: in.DisplayName, PasswordHash: hash, Status: domain.UserStatusActive, Role: domain.RoleUser, Currency: "IDR", Timezone: "Asia/Jakarta", Payday: 25, AcceptedTermsVersion: in.AcceptedTermsVersion, AcceptedPrivacyVersion: in.AcceptedPrivacyVersion, CreatedAt: now, UpdatedAt: now}
	var pair TokenPair
	err = s.uow.WithinTransaction(ctx, func(txctx context.Context) error {
		created, err := s.users.Create(txctx, user)
		if err != nil {
			return err
		}
		pair, err = s.newSession(txctx, created, in.UserAgent, in.IPAddress, now)
		if err != nil {
			return err
		}
		return s.audit(txctx, created.ID, "user.registered", "user", created.ID, now)
	})
	return pair, err
}

func (s *AuthService) Login(ctx context.Context, in LoginInput) (TokenPair, error) {
	in.Email = domain.NormalizeEmail(in.Email)
	if in.Email == "" || len(in.Email) > 254 || in.Password == "" || len(in.Password) > 128 {
		return TokenPair{}, domain.ErrInvalidCredentials
	}
	user, err := s.users.GetByEmail(ctx, in.Email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return TokenPair{}, domain.ErrInvalidCredentials
		}
		return TokenPair{}, err
	}
	if err := s.hasher.Verify(user.PasswordHash, in.Password); err != nil {
		return TokenPair{}, domain.ErrInvalidCredentials
	}
	if user.Status != domain.UserStatusActive {
		return TokenPair{}, domain.ErrInactiveUser
	}
	pair, err := s.newSession(ctx, user, in.UserAgent, in.IPAddress, s.clock.Now())
	if err != nil {
		return TokenPair{}, err
	}
	_ = s.audit(ctx, user.ID, "session.login", "user", user.ID, s.clock.Now())
	return pair, nil
}

func (s *AuthService) Refresh(ctx context.Context, plain string, userAgent, ip string) (TokenPair, error) {
	now := s.clock.Now()
	hash := s.refresh.Hash(plain)
	current, err := s.sessions.GetByTokenHash(ctx, hash)
	if err != nil {
		return TokenPair{}, domain.ErrUnauthorized
	}
	if current.RevokedAt != nil {
		if current.ReplacedByID != "" {
			_ = s.sessions.RevokeFamily(ctx, current.FamilyID, now)
		}
		return TokenPair{}, domain.ErrUnauthorized
	}
	if !current.ExpiresAt.After(now) {
		return TokenPair{}, domain.ErrUnauthorized
	}
	user, err := s.users.GetByID(ctx, current.UserID)
	if err != nil || user.Status != domain.UserStatusActive {
		return TokenPair{}, domain.ErrUnauthorized
	}
	newPlain, newHash, err := s.refresh.Generate()
	if err != nil {
		return TokenPair{}, err
	}
	replacement := domain.RefreshSession{ID: s.ids.New(), UserID: user.ID, FamilyID: current.FamilyID, TokenHash: newHash, ExpiresAt: now.Add(s.refreshTTL), CreatedAt: now, UserAgent: userAgent, IPAddress: ip}
	if _, err = s.sessions.Rotate(ctx, current.ID, replacement, now); err != nil {
		return TokenPair{}, err
	}
	access, accessExpiry, err := s.access.Issue(user.ID, user.Role, now)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, AccessExpiry: accessExpiry, RefreshToken: newPlain, RefreshExpiry: replacement.ExpiresAt, User: user}, nil
}

func (s *AuthService) Logout(ctx context.Context, plain string) error {
	session, err := s.sessions.GetByTokenHash(ctx, s.refresh.Hash(plain))
	if err != nil {
		return nil
	}
	return s.sessions.Revoke(ctx, session.ID, s.clock.Now())
}

func (s *AuthService) LogoutAll(ctx context.Context, userID string) error {
	return s.sessions.RevokeAllForUser(ctx, userID, s.clock.Now())
}

func (s *AuthService) newSession(ctx context.Context, user domain.User, userAgent, ip string, now time.Time) (TokenPair, error) {
	plain, hash, err := s.refresh.Generate()
	if err != nil {
		return TokenPair{}, err
	}
	session := domain.RefreshSession{ID: s.ids.New(), UserID: user.ID, FamilyID: s.ids.New(), TokenHash: hash, ExpiresAt: now.Add(s.refreshTTL), CreatedAt: now, UserAgent: userAgent, IPAddress: ip}
	if _, err = s.sessions.Create(ctx, session); err != nil {
		return TokenPair{}, err
	}
	access, expiry, err := s.access.Issue(user.ID, user.Role, now)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, AccessExpiry: expiry, RefreshToken: plain, RefreshExpiry: session.ExpiresAt, User: user}, nil
}

func (s *AuthService) audit(ctx context.Context, actorID, action, targetType, targetID string, now time.Time) error {
	if s.audits == nil {
		return nil
	}
	return s.audits.Append(ctx, domain.AuditEvent{ID: s.ids.New(), ActorType: "user", ActorID: actorID, Action: action, TargetType: targetType, TargetID: targetID, OccurredAt: now})
}
