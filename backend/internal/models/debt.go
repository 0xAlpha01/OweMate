package models

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type DebtDirection string

const (
	DirectionOwedToMe DebtDirection = "owed_to_me"
	DirectionIOwe     DebtDirection = "i_owe"
)

type DebtStatus string

const (
	StatusPending      DebtStatus = "pending"
	StatusPartiallyPaid DebtStatus = "partially_paid"
	StatusPaid         DebtStatus = "paid"
	StatusOverdue      DebtStatus = "overdue"
)

// Money stores integer kobo. Its JSON representation is a decimal naira number.
type Money int64

type Date struct {
	time.Time
}

func (d *Date) UnmarshalJSON(data []byte) error {
	var value string
	if err := json.Unmarshal(data, &value); err != nil {
		return errors.New("due_date must be an ISO date or RFC3339 timestamp")
	}
	parsed, err := time.Parse(time.DateOnly, value)
	if err != nil {
		parsed, err = time.Parse(time.RFC3339, value)
	}
	if err != nil {
		return errors.New("due_date must be an ISO date or RFC3339 timestamp")
	}
	d.Time = parsed.UTC()
	return nil
}

func (m Money) MarshalJSON() ([]byte, error) {
	value := int64(m)
	negative := value < 0
	var magnitude uint64
	if negative {
		magnitude = uint64(-(value + 1)) + 1
	} else {
		magnitude = uint64(value)
	}
	encoded := fmt.Sprintf("%d.%02d", magnitude/100, magnitude%100)
	if negative {
		encoded = "-" + encoded
	}
	return []byte(encoded), nil
}

func (m *Money) UnmarshalJSON(data []byte) error {
	value := strings.TrimSpace(string(data))
	if len(value) > 0 && value[0] == '"' {
		if err := json.Unmarshal(data, &value); err != nil {
			return errors.New("amount must be a decimal naira value")
		}
	}
	parsed, err := ParseNaira(value)
	if err != nil {
		return err
	}
	*m = parsed
	return nil
}

func ParseNaira(value string) (Money, error) {
	value = strings.TrimSpace(value)
	if value == "" || strings.ContainsAny(value, "eE+") {
		return 0, errors.New("amount must be a decimal naira value with at most two decimal places")
	}

	negative := strings.HasPrefix(value, "-")
	if negative {
		value = value[1:]
	}
	whole, fraction, hasDecimal := strings.Cut(value, ".")
	if whole == "" || (hasDecimal && (fraction == "" || len(fraction) > 2)) || !isDigits(whole) || (fraction != "" && !isDigits(fraction)) {
		return 0, errors.New("amount must be a decimal naira value with at most two decimal places")
	}
	wholeValue, err := strconv.ParseInt(whole, 10, 64)
	if err != nil {
		return 0, errors.New("amount is too large")
	}
	if len(fraction) == 1 {
		fraction += "0"
	}
	var fractionalValue int64
	if fraction != "" {
		fractionalValue, err = strconv.ParseInt(fraction, 10, 64)
		if err != nil {
			return 0, errors.New("amount is too large")
		}
	}
	if wholeValue > (math.MaxInt64-fractionalValue)/100 {
		return 0, errors.New("amount is too large")
	}
	amount := wholeValue*100 + fractionalValue
	if negative {
		amount = -amount
	}
	return Money(amount), nil
}

func isDigits(value string) bool {
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return value != ""
}

type Debt struct {
	ID                bson.ObjectID     `json:"id" bson:"_id,omitempty"`
	OwnerID           string             `json:"owner_id" bson:"owner_id"`
	PersonName        string             `json:"person_name" bson:"person_name"`
	Direction         DebtDirection      `json:"direction" bson:"direction"`
	Description       string             `json:"description" bson:"description"`
	OriginalAmount    Money              `json:"original_amount" bson:"original_amount_kobo"`
	AmountPaid        Money              `json:"amount_paid" bson:"amount_paid_kobo"`
	OutstandingAmount Money              `json:"outstanding_amount" bson:"outstanding_amount_kobo"`
	DueDate           *time.Time         `json:"due_date,omitempty" bson:"due_date,omitempty"`
	Status            DebtStatus         `json:"status" bson:"status"`
	Notes             string             `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt         time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at" bson:"updated_at"`
}

func (d *Debt) Recalculate(now time.Time) error {
	if d.OriginalAmount <= 0 {
		return errors.New("original amount must be greater than zero")
	}
	if d.AmountPaid < 0 || d.AmountPaid > d.OriginalAmount {
		return errors.New("amount paid must be between zero and the original amount")
	}
	d.OutstandingAmount = d.OriginalAmount - d.AmountPaid
	d.Status = DeriveStatus(d.AmountPaid, d.OutstandingAmount, d.DueDate, now)
	return nil
}

func DeriveStatus(amountPaid, outstanding Money, dueDate *time.Time, now time.Time) DebtStatus {
	if outstanding <= 0 {
		return StatusPaid
	}
	if IsOverdue(dueDate, now) {
		return StatusOverdue
	}
	if amountPaid > 0 {
		return StatusPartiallyPaid
	}
	return StatusPending
}

func IsOverdue(dueDate *time.Time, now time.Time) bool {
	if dueDate == nil {
		return false
	}
	utcDueDate := dueDate.UTC()
	utcToday := now.UTC()
	startOfToday := time.Date(utcToday.Year(), utcToday.Month(), utcToday.Day(), 0, 0, 0, 0, time.UTC)
	return utcDueDate.Before(startOfToday)
}

type DebtPatch struct {
	PersonName  *string
	Direction   *DebtDirection
	Description *string
	OriginalAmount *Money
	DueDate     *time.Time
	Notes       *string
}

type DebtFilter struct {
	Direction DebtDirection
	Status    DebtStatus
	Page      int64
	Limit     int64
}

type DebtPage struct {
	Debts []Debt `json:"debts"`
	Page  int64  `json:"page"`
	Limit int64  `json:"limit"`
	Total int64  `json:"total"`
}

type CreateDebtRequest struct {
	PersonName     string        `json:"person_name"`
	Direction      DebtDirection `json:"direction"`
	Description    string        `json:"description"`
	OriginalAmount Money         `json:"original_amount"`
	DueDate        *Date         `json:"due_date"`
	Notes          string        `json:"notes"`
}

type UpdateDebtRequest struct {
	PersonName     *string        `json:"person_name"`
	Direction      *DebtDirection `json:"direction"`
	Description    *string        `json:"description"`
	OriginalAmount *Money         `json:"original_amount"`
	DueDate        *Date          `json:"due_date"`
	Notes          *string        `json:"notes"`
}

func (r UpdateDebtRequest) Patch() DebtPatch {
	var dueDate *time.Time
	if r.DueDate != nil {
		dueDate = r.DueDate.TimePointer()
	}
	return DebtPatch{
		PersonName: r.PersonName, Direction: r.Direction, Description: r.Description,
		OriginalAmount: r.OriginalAmount, DueDate: dueDate, Notes: r.Notes,
	}
}

func (d Date) TimePointer() *time.Time {
	return &d.Time
}
