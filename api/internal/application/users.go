package application

import (
	"context"
	"strings"
	"time"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type UserService struct {
	users  domain.UserRepository
	audits domain.AuditRepository
	clock  ports.Clock
	ids    ports.IDGenerator
}

func NewUserService(users domain.UserRepository, audits domain.AuditRepository, clock ports.Clock, ids ports.IDGenerator) *UserService {
	return &UserService{users: users, audits: audits, clock: clock, ids: ids}
}

type UpdateProfileInput struct {
	DisplayName   string
	Currency      string
	Timezone      string
	Payday        int
	MinimumBuffer domain.Money
	AIConsent     bool
}

func (s *UserService) Get(ctx context.Context, userID string) (domain.User, error) {
	return s.users.GetByID(ctx, userID)
}

func (s *UserService) Update(ctx context.Context, userID string, in UpdateProfileInput) (domain.User, error) {
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	in.Currency = strings.ToUpper(strings.TrimSpace(in.Currency))
	in.Timezone = strings.TrimSpace(in.Timezone)
	if in.DisplayName == "" || len(in.DisplayName) > 100 || len(in.Currency) != 3 || in.Timezone == "" || len(in.Timezone) > 128 || in.Payday < 1 || in.Payday > 31 || in.MinimumBuffer < 0 {
		return domain.User{}, domain.ErrInvalidInput
	}
	if _, err := time.LoadLocation(in.Timezone); err != nil {
		return domain.User{}, domain.ErrInvalidInput
	}
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return domain.User{}, err
	}
	if user.Status != domain.UserStatusActive {
		return domain.User{}, domain.ErrInactiveUser
	}
	user.DisplayName = in.DisplayName
	user.Currency = in.Currency
	user.Timezone = in.Timezone
	user.Payday = in.Payday
	user.MinimumBuffer = in.MinimumBuffer
	user.AIConsent = in.AIConsent
	user.UpdatedAt = s.clock.Now()
	updated, err := s.users.UpdateProfile(ctx, user)
	if err != nil {
		return domain.User{}, err
	}
	if s.audits != nil {
		_ = s.audits.Append(ctx, domain.AuditEvent{
			ID:         s.ids.New(),
			ActorType:  "user",
			ActorID:    userID,
			Action:     "user.profile_updated",
			TargetType: "user",
			TargetID:   userID,
			OccurredAt: user.UpdatedAt,
		})
	}
	return updated, nil
}
