package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/0xAlpha01/OweMate/backend/internal/middleware"
	"github.com/0xAlpha01/OweMate/backend/internal/models"
	"github.com/0xAlpha01/OweMate/backend/internal/repositories"
	"github.com/0xAlpha01/OweMate/backend/internal/services"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type DebtManager interface {
	Create(context.Context, string, models.CreateDebtRequest) (*models.Debt, error)
	List(context.Context, string, models.DebtFilter) (models.DebtPage, error)
	Get(context.Context, string, bson.ObjectID) (*models.Debt, error)
	Update(context.Context, string, bson.ObjectID, models.DebtPatch) (*models.Debt, error)
	Delete(context.Context, string, bson.ObjectID) error
}

type DebtHandler struct {
	service DebtManager
}

func NewDebtHandler(service DebtManager) *DebtHandler {
	return &DebtHandler{service: service}
}

func (h *DebtHandler) Create(c *gin.Context) {
	var request models.CreateDebtRequest
	if err := decodeStrictJSON(c, &request); err != nil {
		writeError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if strings.TrimSpace(request.PersonName) == "" {
		writeError(c, http.StatusBadRequest, "invalid_request", "person_name is required")
		return
	}
	if request.Direction != models.DirectionOwedToMe && request.Direction != models.DirectionIOwe {
		writeError(c, http.StatusBadRequest, "invalid_request", "direction must be owed_to_me or i_owe")
		return
	}
	if strings.TrimSpace(request.Description) == "" {
		writeError(c, http.StatusBadRequest, "invalid_request", "description is required")
		return
	}
	if request.OriginalAmount <= 0 {
		writeError(c, http.StatusBadRequest, "invalid_request", "original_amount must be greater than zero")
		return
	}

	ownerID, ok := middleware.OwnerID(c)
	if !ok {
		writeError(c, http.StatusInternalServerError, "internal_error", "request owner is unavailable")
		return
	}
	created, err := h.service.Create(c.Request.Context(), ownerID, request)
	if err != nil {	
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": created})
}

func (h *DebtHandler) List(c *gin.Context) {
	filter, err := parseDebtFilter(c)
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	ownerID, ok := middleware.OwnerID(c)
	if !ok {
		writeError(c, http.StatusInternalServerError, "internal_error", "request owner is unavailable")
		return
	}
	page, err := h.service.List(c.Request.Context(), ownerID, filter)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": page})
}

func (h *DebtHandler) Get(c *gin.Context) {
	id, ok := parseDebtID(c)
	if !ok {
		return
	}
	ownerID, ok := middleware.OwnerID(c)
	if !ok {
		writeError(c, http.StatusInternalServerError, "internal_error", "request owner is unavailable")
		return
	}
	debt, err := h.service.Get(c.Request.Context(), ownerID, id)
	if err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": debt})
}

func (h *DebtHandler) Update(c *gin.Context) {
	id, ok := parseDebtID(c)
	if !ok {
		return
	}
	var request models.UpdateDebtRequest
	if err := decodeStrictJSON(c, &request); err != nil {
		writeError(c, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	if request.PersonName == nil && request.Direction == nil && request.Description == nil &&
		request.OriginalAmount == nil && request.DueDate == nil && request.Notes == nil {
		writeError(c, http.StatusBadRequest, "invalid_request", "at least one supported field is required")
		return
	}
	ownerID, ok := middleware.OwnerID(c)
	if !ok {
		writeError(c, http.StatusInternalServerError, "internal_error", "request owner is unavailable")
		return
	}
	updated, err := h.service.Update(c.Request.Context(), ownerID, id, request.Patch())
	if err != nil {	
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": updated})
}

func (h *DebtHandler) Delete(c *gin.Context) {
	id, ok := parseDebtID(c)
	if !ok {
		return
	}
	ownerID, ok := middleware.OwnerID(c)
	if !ok {
		writeError(c, http.StatusInternalServerError, "internal_error", "request owner is unavailable")
		return
	}
	if err := h.service.Delete(c.Request.Context(), ownerID, id); err != nil {
		writeServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"deleted": true}})
}

func parseDebtID(c *gin.Context) (bson.ObjectID, bool) {
	id, err := bson.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		writeError(c, http.StatusBadRequest, "invalid_id", "debt id must be a valid ObjectID")
		return bson.NilObjectID, false
	}
	return id, true
}

func parseDebtFilter(c *gin.Context) (models.DebtFilter, error) {
	filter := models.DebtFilter{Page: 1, Limit: repositories.DefaultPageSize}
	if value := c.Query("direction"); value != "" {
		filter.Direction = models.DebtDirection(value)
		if filter.Direction != models.DirectionOwedToMe && filter.Direction != models.DirectionIOwe {
			return filter, errors.New("direction must be owed_to_me or i_owe")
		}
	}
	if value := c.Query("status"); value != "" {
		filter.Status = models.DebtStatus(value)
		switch filter.Status {
		case models.StatusPending, models.StatusPartiallyPaid, models.StatusPaid, models.StatusOverdue:
		default:
			return filter, errors.New("status must be pending, partially_paid, paid, or overdue")
		}
	}
	for key, destination := range map[string]*int64{"page": &filter.Page, "limit": &filter.Limit} {
		if value := c.Query(key); value != "" {
			parsed, err := strconv.ParseInt(value, 10, 64)
			if err != nil || parsed < 1 {
				return filter, errors.New(key + " must be a positive integer")
			}
			*destination = parsed
		}
	}
	if filter.Limit > repositories.MaximumPageSize {
		filter.Limit = repositories.MaximumPageSize
	}
	return filter, nil
}

func decodeStrictJSON(c *gin.Context, destination any) error {
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return errors.New("request body must contain valid JSON with only supported fields")
	}
	var extra any
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain one JSON object")
	}
	return nil
}

func writeServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrValidation):
		writeError(c, http.StatusBadRequest, "invalid_request", strings.TrimPrefix(err.Error(), services.ErrValidation.Error()+": "))
	case errors.Is(err, repositories.ErrNotFound):
		writeError(c, http.StatusNotFound, "not_found", "debt not found")
	default:
		writeError(c, http.StatusInternalServerError, "internal_error", "an internal error occurred")
	}
}

func writeError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}