package httpapi

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/sakuplan/api/internal/application"
	"github.com/sakuplan/api/internal/domain"
)

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (s *Server) register(c fiber.Ctx) error {
	var req registerRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	pair, err := s.svc.Auth.Register(c, application.RegisterInput{Email: req.Email, Password: req.Password, DisplayName: req.DisplayName, UserAgent: c.Get("User-Agent"), IPAddress: c.IP()})
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapTokenPair(pair))
}

func (s *Server) login(c fiber.Ctx) error {
	var req loginRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	pair, err := s.svc.Auth.Login(c, application.LoginInput{Email: req.Email, Password: req.Password, UserAgent: c.Get("User-Agent"), IPAddress: c.IP()})
	if err != nil {
		return err
	}
	return c.JSON(mapTokenPair(pair))
}

func (s *Server) refresh(c fiber.Ctx) error {
	var req refreshRequest
	if err := c.Bind().Body(&req); err != nil || strings.TrimSpace(req.RefreshToken) == "" {
		return domain.ErrInvalidInput
	}
	pair, err := s.svc.Auth.Refresh(c, req.RefreshToken, c.Get("User-Agent"), c.IP())
	if err != nil {
		return err
	}
	return c.JSON(mapTokenPair(pair))
}

func (s *Server) logout(c fiber.Ctx) error {
	var req refreshRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	if err := s.svc.Auth.Logout(c, req.RefreshToken); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (s *Server) logoutAll(c fiber.Ctx) error {
	if err := s.svc.Auth.LogoutAll(c, userID(c)); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (s *Server) me(c fiber.Ctx) error {
	u, err := s.svc.Profiles.Get(c, userID(c))
	if err != nil {
		return err
	}
	return c.JSON(mapUser(u))
}

type updateProfileRequest struct {
	DisplayName   string       `json:"display_name"`
	Currency      string       `json:"currency"`
	Timezone      string       `json:"timezone"`
	Payday        int          `json:"payday"`
	MinimumBuffer domain.Money `json:"minimum_buffer"`
	AIConsent     bool         `json:"ai_consent"`
}

func (s *Server) updateMe(c fiber.Ctx) error {
	var req updateProfileRequest
	if err := c.Bind().Body(&req); err != nil {
		return domain.ErrInvalidInput
	}
	u, err := s.svc.Profiles.Update(c, userID(c), application.UpdateProfileInput{
		DisplayName:   req.DisplayName,
		Currency:      req.Currency,
		Timezone:      req.Timezone,
		Payday:        req.Payday,
		MinimumBuffer: req.MinimumBuffer,
		AIConsent:     req.AIConsent,
	})
	if err != nil {
		return err
	}
	return c.JSON(mapUser(u))
}
