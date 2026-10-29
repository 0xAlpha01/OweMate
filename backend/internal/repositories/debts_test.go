package repositories

import (
	"testing"
	"time"

	"github.com/0xAlpha01/OweMate/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestNormalizePagination(t *testing.T) {
	page, limit := NormalizePagination(0, 0)
	if page != 1 || limit != DefaultPageSize {
		t.Errorf("NormalizePagination(0, 0) = %d, %d; want 1, %d", page, limit, DefaultPageSize)
	}
	page, limit = NormalizePagination(3, MaximumPageSize+1)
	if page != 3 || limit != MaximumPageSize {
		t.Errorf("NormalizePagination(3, max+1) = %d, %d; want 3, %d", page, limit, MaximumPageSize)
	}
}

func TestBuildMongoFilterAlwaysScopesOwnerAndAppliesFilters(t *testing.T) {
	filter := models.DebtFilter{Direction: models.DirectionOwedToMe, Status: models.StatusOverdue}
	query := BuildMongoFilter("owner-1", filter, time.Date(2026, time.October, 29, 12, 0, 0, 0, time.UTC))
	if query["owner_id"] != "owner-1" || query["direction"] != models.DirectionOwedToMe {
		t.Fatalf("query missing owner/direction: %#v", query)
	}
	conditions, ok := query["$and"].(bson.A)
	if !ok || len(conditions) != 2 {
		t.Fatalf("overdue conditions = %#v, want outstanding and due date clauses", query["$and"])
	}
	dateClause, ok := conditions[1].(bson.M)
	if !ok {
		t.Fatalf("overdue date clause type = %T, want bson.M", conditions[1])
	}
	dueDate, ok := dateClause["due_date"].(bson.M)
	if !ok || dueDate["$lt"] == nil {
		t.Errorf("overdue date filter = %#v, want due_date < start of today", dateClause)
	}
}

func TestBuildMongoFilterForPaidStatus(t *testing.T) {
	query := BuildMongoFilter("owner-2", models.DebtFilter{Status: models.StatusPaid}, time.Now())
	if query["owner_id"] != "owner-2" {
		t.Errorf("owner_id = %#v, want owner-2", query["owner_id"])
	}
	paid, ok := query["outstanding_amount_kobo"].(bson.M)
	if !ok || paid["$lte"] != 0 {
		t.Errorf("paid filter = %#v, want outstanding_amount_kobo <= 0", query["outstanding_amount_kobo"])
	}
}