package repositories

import (
	"context"
	"errors"
	"math"
	"time"

	"github.com/0xAlpha01/OweMate/backend/internal/models"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

const (
	DefaultPageSize int64 = 20
	MaximumPageSize int64 = 100
)

var ErrNotFound = errors.New("debt not found")

type DebtRepository interface {
	Create(context.Context, *models.Debt) error
	List(context.Context, string, models.DebtFilter, time.Time) (models.DebtPage, error)
	Find(context.Context, string, bson.ObjectID) (*models.Debt, error)
	Update(context.Context, string, bson.ObjectID, *models.Debt) (*models.Debt, error)
	Delete(context.Context, string, bson.ObjectID) error
}

type MongoDebtRepository struct {
	collection *mongo.Collection
}

func NewMongoDebtRepository(database *mongo.Database) *MongoDebtRepository {
	return &MongoDebtRepository{collection: database.Collection("debts")}
}

func (r *MongoDebtRepository) EnsureIndexes(ctx context.Context) error {
	_, err := r.collection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "owner_id", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("owner_created_at")},
		{Keys: bson.D{{Key: "owner_id", Value: 1}, {Key: "status", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("owner_status_created_at")},
		{Keys: bson.D{{Key: "owner_id", Value: 1}, {Key: "direction", Value: 1}, {Key: "created_at", Value: -1}}, Options: options.Index().SetName("owner_direction_created_at")},
	})
	return err
}

func (r *MongoDebtRepository) Create(ctx context.Context, debt *models.Debt) error {
	_, err := r.collection.InsertOne(ctx, debt)
	return err
}

func (r *MongoDebtRepository) List(ctx context.Context, ownerID string, filter models.DebtFilter, now time.Time) (models.DebtPage, error) {
	page, limit := NormalizePagination(filter.Page, filter.Limit)
	query := BuildMongoFilter(ownerID, filter, now)
	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return models.DebtPage{}, err
	}

	findOptions := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}, {Key: "_id", Value: -1}}).
		SetSkip((page - 1) * limit).
		SetLimit(limit)
	cursor, err := r.collection.Find(ctx, query, findOptions)
	if err != nil {
		return models.DebtPage{}, err
	}
	defer cursor.Close(ctx)

	debts := make([]models.Debt, 0)
	if err := cursor.All(ctx, &debts); err != nil {
		return models.DebtPage{}, err
	}
	for i := range debts {
		if err := debts[i].Recalculate(now); err != nil {
			return models.DebtPage{}, err
		}
	}
	return models.DebtPage{Debts: debts, Page: page, Limit: limit, Total: total}, nil
}

func (r *MongoDebtRepository) Find(ctx context.Context, ownerID string, id bson.ObjectID) (*models.Debt, error) {
	var debt models.Debt
	if err := r.collection.FindOne(ctx, bson.M{"_id": id, "owner_id": ownerID}).Decode(&debt); err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if err := debt.Recalculate(time.Now()); err != nil {
		return nil, err
	}
	return &debt, nil
}

func (r *MongoDebtRepository) Update(ctx context.Context, ownerID string, id bson.ObjectID, debt *models.Debt) (*models.Debt, error) {
	update := bson.M{"$set": bson.M{
		"person_name":             debt.PersonName,
		"direction":               debt.Direction,
		"description":             debt.Description,
		"original_amount_kobo":    debt.OriginalAmount,
		"outstanding_amount_kobo": debt.OutstandingAmount,
		"due_date":                debt.DueDate,
		"status":                  debt.Status,
		"notes":                   debt.Notes,
		"updated_at":              debt.UpdatedAt,
	}}
	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": id, "owner_id": ownerID}, update)
	if err != nil {
		return nil, err
	}
	if result.MatchedCount == 0 {
		return nil, ErrNotFound
	}
	return debt, nil
}

func (r *MongoDebtRepository) Delete(ctx context.Context, ownerID string, id bson.ObjectID) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"_id": id, "owner_id": ownerID})
	if err != nil {
		return err
	}
	if result.DeletedCount == 0 {
		return ErrNotFound
	}
	return nil
}

func NormalizePagination(page, limit int64) (int64, int64) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = DefaultPageSize
	}
	if limit > MaximumPageSize {
		limit = MaximumPageSize
	}
	maximumPage := math.MaxInt64/limit + 1
	if page > maximumPage {
		page = maximumPage
	}
	return page, limit
}

func BuildMongoFilter(ownerID string, filter models.DebtFilter, now time.Time) bson.M {
	query := bson.M{"owner_id": ownerID}
	if filter.Direction != "" {
		query["direction"] = filter.Direction
	}
	if filter.Status == "" {
		return query
	}

	today := now.UTC()
	startOfToday := time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, time.UTC)
	notOverdue := bson.M{"$or": bson.A{
		bson.M{"due_date": bson.M{"$exists": false}},
		bson.M{"due_date": bson.M{"$gte": startOfToday}},
	}}
	positiveOutstanding := bson.M{"outstanding_amount_kobo": bson.M{"$gt": 0}}
	nonPaidStatuses := bson.M{"status": bson.M{"$in": bson.A{
		models.StatusPending, models.StatusPartiallyPaid, models.StatusOverdue,
	}}}

	switch filter.Status {
	case models.StatusPending:
		query["$and"] = bson.A{
			bson.M{"status": bson.M{"$in": bson.A{models.StatusPending, models.StatusOverdue}}},
			bson.M{"amount_paid_kobo": 0}, positiveOutstanding, notOverdue,
		}
	case models.StatusPartiallyPaid:
		query["$and"] = bson.A{
			bson.M{"status": bson.M{"$in": bson.A{models.StatusPartiallyPaid, models.StatusOverdue}}},
			bson.M{"amount_paid_kobo": bson.M{"$gt": 0}}, positiveOutstanding, notOverdue,
		}
	case models.StatusPaid:
		query["$and"] = bson.A{
			bson.M{"status": models.StatusPaid},
			bson.M{"outstanding_amount_kobo": bson.M{"$lte": 0}},
		}
	case models.StatusOverdue:
		query["$and"] = bson.A{nonPaidStatuses, positiveOutstanding, bson.M{"due_date": bson.M{"$lt": startOfToday}}}
	}
	return query
}