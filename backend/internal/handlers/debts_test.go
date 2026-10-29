package handlers_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/0xAlpha01/OweMate/backend/internal/handlers"
	"github.com/0xAlpha01/OweMate/backend/internal/models"
	"github.com/0xAlpha01/OweMate/backend/internal/repositories"
	"github.com/0xAlpha01/OweMate/backend/internal/routes"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type fakeDebtService struct {
	ownerID   string
	request   models.CreateDebtRequest
	filter    models.DebtFilter
	createErr error
	getErr    error
	updateErr error
	deleteErr error
}

func (s *fakeDebtService) Create(_ context.Context, ownerID string, request models.CreateDebtRequest) (*models.Debt, error) {
	s.ownerID, s.request = ownerID, request
	return &models.Debt{ID: bson.NewObjectID(), OwnerID: ownerID, PersonName: request.PersonName, OriginalAmount: request.OriginalAmount}, s.createErr
}

func (s *fakeDebtService) List(_ context.Context, ownerID string, filter models.DebtFilter) (models.DebtPage, error) {
	s.ownerID, s.filter = ownerID, filter
	return models.DebtPage{Debts: []models.Debt{}, Page: filter.Page, Limit: filter.Limit}, nil
}

func (s *fakeDebtService) Get(_ context.Context, ownerID string, _ bson.ObjectID) (*models.Debt, error) {
	s.ownerID = ownerID
	if s.getErr != nil {
		return nil, s.getErr
	}
	return &models.Debt{}, nil
}

func (s *fakeDebtService) Update(_ context.Context, ownerID string, _ bson.ObjectID, _ models.DebtPatch) (*models.Debt, error) {
	s.ownerID = ownerID
	if s.updateErr != nil {
		return nil, s.updateErr
	}
	return &models.Debt{}, nil
}

func (s *fakeDebtService) Delete(_ context.Context, ownerID string, _ bson.ObjectID) error {
	s.ownerID = ownerID
	return s.deleteErr
}

func newDebtRouter(service *fakeDebtService) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := routes.NewRouter(nil)
	routes.RegisterDebtRoutes(router, handlers.NewDebtHandler(service), "test-development-owner")
	return router
}

func TestCreateDebtValidationAndOwnerIsolation(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "missing name", body: `{"direction":"owed_to_me","description":"loan","original_amount":10}`},
		{name: "invalid direction", body: `{"person_name":"A","direction":"incoming","description":"loan","original_amount":10}`},
		{name: "zero amount", body: `{"person_name":"A","direction":"i_owe","description":"loan","original_amount":0}`},
		{name: "negative amount", body: `{"person_name":"A","direction":"i_owe","description":"loan","original_amount":-1}`},
		{name: "body owner rejected", body: `{"owner_id":"attacker","person_name":"A","direction":"i_owe","description":"loan","original_amount":10}`},
		{name: "calculated amount rejected", body: `{"person_name":"A","direction":"i_owe","description":"loan","original_amount":10,"amount_paid":2}`},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			newDebtRouter(&fakeDebtService{}).ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/api/v1/debts", strings.NewReader(test.body)))
			if recorder.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want %d; body = %s", recorder.Code, http.StatusBadRequest, recorder.Body.String())
			}
		})
	}

	service := &fakeDebtService{}
	recorder := httptest.NewRecorder()
	body := `{"person_name":"  Ada  ","direction":"owed_to_me","description":"Invoice","original_amount":12.34,"owner_id":"ignored"}`
	newDebtRouter(service).ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/api/v1/debts", strings.NewReader(body)))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("unknown owner field status = %d, want 400", recorder.Code)
	}

	service = &fakeDebtService{}
	recorder = httptest.NewRecorder()
	body = `{"person_name":"  Ada  ","direction":"owed_to_me","description":"Invoice","original_amount":12.34}`
	newDebtRouter(service).ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/api/v1/debts", strings.NewReader(body)))
	if recorder.Code != http.StatusCreated {
		t.Fatalf("valid create status = %d, want 201; body = %s", recorder.Code, recorder.Body.String())
	}
	if service.ownerID != "test-development-owner" {
		t.Errorf("owner passed to service = %q, want middleware owner", service.ownerID)
	}
	if service.request.OriginalAmount != 1234 {
		t.Errorf("parsed amount = %d kobo, want 1234", service.request.OriginalAmount)
	}
}

func TestUpdateRejectsCalculatedFieldsAndInvalidIDs(t *testing.T) {
	service := &fakeDebtService{}
	router := newDebtRouter(service)
	validID := bson.NewObjectID().Hex()
	for _, body := range []string{`{"amount_paid":1}`, `{"outstanding_amount":9}`, `{"owner_id":"other"}`} {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(http.MethodPatch, "/api/v1/debts/"+validID, strings.NewReader(body)))
		if recorder.Code != http.StatusBadRequest {
			t.Errorf("PATCH body %s status = %d, want 400", body, recorder.Code)
		}
	}
	for _, method := range []string{http.MethodGet, http.MethodPatch, http.MethodDelete} {
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, httptest.NewRequest(method, "/api/v1/debts/not-an-object-id", strings.NewReader(`{"notes":"x"}`)))
		if recorder.Code != http.StatusBadRequest {
			t.Errorf("%s invalid id status = %d, want 400", method, recorder.Code)
		}
	}
}

func TestListFiltersAndPagination(t *testing.T) {
	service := &fakeDebtService{}
	recorder := httptest.NewRecorder()
	newDebtRouter(service).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet,
		"/api/v1/debts/?direction=owed_to_me&status=overdue&page=3&limit=500", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("list status = %d, want 200; body = %s", recorder.Code, recorder.Body.String())
	}
	if service.ownerID != "test-development-owner" || service.filter.Direction != models.DirectionOwedToMe ||
		service.filter.Status != models.StatusOverdue || service.filter.Page != 3 || service.filter.Limit != 100 {
		t.Errorf("list owner/filter = %q/%+v", service.ownerID, service.filter)
	}
}

func TestNotFoundAndDatabaseErrorsAreSafe(t *testing.T) {
	for _, test := range []struct {
		name string
		err  error
		want int
	}{
		{name: "not found", err: repositories.ErrNotFound, want: http.StatusNotFound},
		{name: "database error", err: errors.New("mongodb://user:password@db/private"), want: http.StatusInternalServerError},
	} {
		t.Run(test.name, func(t *testing.T) {
			service := &fakeDebtService{getErr: test.err}
			recorder := httptest.NewRecorder()
			newDebtRouter(service).ServeHTTP(recorder, httptest.NewRequest(http.MethodGet,
				"/api/v1/debts/"+bson.NewObjectID().Hex(), nil))
			if recorder.Code != test.want {
				t.Fatalf("status = %d, want %d", recorder.Code, test.want)
			}
			if strings.Contains(recorder.Body.String(), "password") || strings.Contains(recorder.Body.String(), "mongodb://") {
				t.Errorf("response leaked internal database details: %s", recorder.Body.String())
			}
		})
	}
}