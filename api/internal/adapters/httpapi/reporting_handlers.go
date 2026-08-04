package httpapi

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/sakuplan/api/internal/application"
)

func (s *Server) dashboard(c fiber.Ctx) error {
	u, err := s.svc.Profiles.Get(c, userID(c))
	if err != nil {
		return err
	}
	v, err := s.svc.Reporting.Dashboard(c, u, time.Time{})
	if err != nil {
		return err
	}
	return c.JSON(mapDashboard(v))
}

func (s *Server) cashFlowReport(c fiber.Ctx) error {
	u, err := s.svc.Profiles.Get(c, userID(c))
	if err != nil {
		return err
	}
	start, err := dateQuery(c, "start")
	if err != nil {
		return err
	}
	end, err := dateQuery(c, "end")
	if err != nil {
		return err
	}
	v, err := s.svc.Reporting.CashFlow(c, u, application.CashFlowInput{Start: start, End: end, GroupBy: c.Query("group_by")})
	if err != nil {
		return err
	}
	return c.JSON(mapCashFlowReport(v))
}

func (s *Server) createExport(c fiber.Ctx) error {
	u, err := s.svc.Profiles.Get(c, userID(c))
	if err != nil {
		return err
	}
	v, err := s.svc.Reporting.Export(c, u)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(mapExport(v))
}
