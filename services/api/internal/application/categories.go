package application

import (
	"context"
	"strings"

	"github.com/sakuplan/api/internal/domain"
	"github.com/sakuplan/api/internal/ports"
)

type CategoryService struct {
	repo  domain.CategoryRepository
	clock ports.Clock
	ids   ports.IDGenerator
}

func NewCategoryService(repo domain.CategoryRepository, clock ports.Clock, ids ports.IDGenerator) *CategoryService {
	return &CategoryService{repo: repo, clock: clock, ids: ids}
}
func (s *CategoryService) Create(ctx context.Context, userID, name string, kind domain.CategoryKind, icon string) (domain.Category, error) {
	name = strings.TrimSpace(name)
	icon = strings.TrimSpace(icon)
	if name == "" || len(name) > 100 || len(icon) > 64 || (kind != domain.CategoryIncome && kind != domain.CategoryExpense) {
		return domain.Category{}, domain.ErrInvalidInput
	}
	now := s.clock.Now()
	return s.repo.Create(ctx, domain.Category{ID: s.ids.New(), UserID: userID, Name: name, Kind: kind, Icon: icon, CreatedAt: now, UpdatedAt: now})
}
func (s *CategoryService) List(ctx context.Context, userID string, kind domain.CategoryKind, archived bool) ([]domain.Category, error) {
	if kind != "" && kind != domain.CategoryIncome && kind != domain.CategoryExpense {
		return nil, domain.ErrInvalidInput
	}
	return s.repo.List(ctx, userID, kind, archived)
}
func (s *CategoryService) Archive(ctx context.Context, userID, id string) error {
	return s.repo.Archive(ctx, userID, id, s.clock.Now())
}
