package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/0xAlpha01/OweMate/backend/internal/models"
	"github.com/0xAlpha01/OweMate/backend/internal/repositories"
	"go.mongodb.org/mongo-driver/v2/bson"
)

var ErrValidation = errors.New("invalid debt")

type DebtService struct {
	repository repositories.DebtRepository
	ownerID    string
	clock      func() time.Time
}

func NewDebtService(repository repositories.DebtRepository, ownerID string) *DebtService {
	return &DebtService{repository: repository, ownerID: ownerID, clock: time.Now}
}

func (s *DebtService) Create(ctx context.Context, request models.CreateDebtRequest) (*models.Debt, error) {
	if err := validatePersonName(request.PersonName); err != nil {
		return nil, err
	}
	if err := validateDirection(request.Direction); err != nil {
		return nil, err
	}
	if strings.TrimSpace(request.Description) == "" {
		return nil, validationError("description is required")
	}
	if request.OriginalAmount <= 0 {
		return nil, validationError("original_amount must be greater than zero")
	}

	now := s.clock().UTC()
	var dueDate *time.Time
	if request.DueDate != nil {
		parsedDueDate := request.DueDate.UTC()
		dueDate = &parsedDueDate
	}
	debt := &models.Debt{
		ID: bson.NewObjectID(), OwnerID: s.ownerID, PersonName: strings.TrimSpace(request.PersonName),
		Direction: request.Direction, Description: strings.TrimSpace(request.Description),
		OriginalAmount: request.OriginalAmount, DueDate: dueDate,
		Notes: strings.TrimSpace(request.Notes), CreatedAt: now, UpdatedAt: now,
	}
	if err := debt.Recalculate(now); err != nil {
		return nil, validationError(err.Error())
	}
	if err := s.repository.Create(ctx, debt); err != nil {
		return nil, err
	}
	return debt, nil
}

func (s *DebtService) List(ctx context.Context, filter models.DebtFilter) (models.DebtPage, error) {
	return s.repository.List(ctx, s.ownerID, filter, s.clock().UTC())
}

func (s *DebtService) Get(ctx context.Context, id bson.ObjectID) (*models.Debt, error) {
	return s.repository.Find(ctx, s.ownerID, id)
}

func (s *DebtService) Update(ctx context.Context, id bson.ObjectID, patch models.DebtPatch) (*models.Debt, error) {
	debt, err := s.repository.Find(ctx, s.ownerID, id)
	if err != nil {
		return nil, err
	}
	if patch.PersonName != nil {
		if err := validatePersonName(*patch.PersonName); err != nil {
			return nil, err
		}
		debt.PersonName = strings.TrimSpace(*patch.PersonName)
	}
	if patch.Direction != nil {
		if err := validateDirection(*patch.Direction); err != nil {
			return nil, err
		}
		debt.Direction = *patch.Direction
	}
	if patch.Description != nil {
		if strings.TrimSpace(*patch.Description) == "" {
			return nil, validationError("description cannot be empty")
		}
		debt.Description = strings.TrimSpace(*patch.Description)
	}
	if patch.OriginalAmount != nil {
		debt.OriginalAmount = *patch.OriginalAmount
	}
	if debt.OriginalAmount <= 0 {
		return nil, validationError("original_amount must be greater than zero")
	}
	if debt.AmountPaid > debt.OriginalAmount {
		return nil, validationError("original_amount cannot be less than amount already paid")
	}
	if patch.DueDate != nil {
		debt.DueDate = patch.DueDate
	}
	if patch.Notes != nil {
		debt.Notes = strings.TrimSpace(*patch.Notes)
	}
	debt.UpdatedAt = s.clock().UTC()
	if err := debt.Recalculate(debt.UpdatedAt); err != nil {
		return nil, validationError(err.Error())
	}
	return s.repository.Update(ctx, s.ownerID, id, debt)
}

func (s *DebtService) Delete(ctx context.Context, id bson.ObjectID) error {
	return s.repository.Delete(ctx, s.ownerID, id)
}

func validatePersonName(value string) error {
	if strings.TrimSpace(value) == "" {
		return validationError("person_name is required")
	}
	return nil
}

func validateDirection(direction models.DebtDirection) error {
	if direction != models.DirectionOwedToMe && direction != models.DirectionIOwe {
		return validationError("direction must be owed_to_me or i_owe")
	}
	return nil
}

func validationError(message string) error {
	return fmt.Errorf("%w: %s", ErrValidation, message)
}