package security

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type JWTConfig struct {
	Secret   string
	Issuer   string
	Audience string
	TTL      time.Duration
}

type JWTManager struct{ cfg JWTConfig }

type accessClaims struct {
	Role domain.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func NewJWTManager(cfg JWTConfig) (*JWTManager, error) {
	if len(cfg.Secret) < 32 || cfg.Issuer == "" || cfg.Audience == "" || cfg.TTL <= 0 {
		return nil, errors.New("invalid JWT configuration")
	}
	return &JWTManager{cfg: cfg}, nil
}

func (m *JWTManager) Issue(userID string, role domain.UserRole, now time.Time) (string, time.Time, error) {
	expiresAt := now.Add(m.cfg.TTL)
	claims := accessClaims{Role: role, RegisteredClaims: jwt.RegisteredClaims{
		Issuer:    m.cfg.Issuer,
		Subject:   userID,
		Audience:  jwt.ClaimStrings{m.cfg.Audience},
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)),
	}}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(m.cfg.Secret))
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign access token: %w", err)
	}
	return signed, expiresAt, nil
}

func (m *JWTManager) Parse(raw string, now time.Time) (ports.AccessClaims, error) {
	claims := &accessClaims{}
	token, err := jwt.ParseWithClaims(raw, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(m.cfg.Secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer(m.cfg.Issuer), jwt.WithAudience(m.cfg.Audience), jwt.WithExpirationRequired(), jwt.WithTimeFunc(func() time.Time { return now }))
	if err != nil || !token.Valid || claims.Subject == "" {
		return ports.AccessClaims{}, domain.ErrUnauthorized
	}
	return ports.AccessClaims{UserID: claims.Subject, Role: claims.Role}, nil
}

type RefreshManager struct{}

func NewRefreshManager() *RefreshManager { return &RefreshManager{} }

func (m *RefreshManager) Generate() (plain, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}
	plain = base64.RawURLEncoding.EncodeToString(b)
	return plain, m.Hash(plain), nil
}

func (m *RefreshManager) Hash(plain string) string {
	sum := sha256.Sum256([]byte(plain))
	return hex.EncodeToString(sum[:])
}
