package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestParseNairaAndMarshalMoney(t *testing.T) {
	amount, err := ParseNaira("1234.5")
	if err != nil {
		t.Fatalf("ParseNaira() error = %v", err)
	}
	if amount != 123450 {
		t.Fatalf("ParseNaira() = %d kobo, want 123450", amount)
	}

	encoded, err := json.Marshal(amount)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}
	if string(encoded) != "1234.50" {
		t.Errorf("Marshal() = %s, want 1234.50", encoded)
	}
}

func TestParseNairaRejectsInexactOrInvalidAmounts(t *testing.T) {
	for _, value := range []string{"", "0.001", "1e3", "+1", "1.", "NaN", "92233720368547759"} {
		t.Run(value, func(t *testing.T) {
			if _, err := ParseNaira(value); err == nil {
				t.Errorf("ParseNaira(%q) error = nil, want error", value)
			}
		})
	}
}

func TestRecalculateAndStatusDerivation(t *testing.T) {
	today := time.Date(2026, time.October, 29, 12, 0, 0, 0, time.UTC)
	yesterday := time.Date(2026, time.October, 28, 12, 0, 0, 0, time.UTC)

	debt := Debt{OriginalAmount: 10000, AmountPaid: 2500, DueDate: &yesterday}
	if err := debt.Recalculate(today); err != nil {
		t.Fatalf("Recalculate() error = %v", err)
	}
	if debt.OutstandingAmount != 7500 || debt.Status != StatusOverdue {
		t.Errorf("Recalculate() outstanding/status = %d/%s, want 7500/%s", debt.OutstandingAmount, debt.Status, StatusOverdue)
	}

	debt.AmountPaid = debt.OriginalAmount
	if err := debt.Recalculate(today); err != nil {
		t.Fatalf("Recalculate() paid debt error = %v", err)
	}
	if debt.OutstandingAmount != 0 || debt.Status != StatusPaid {
		t.Errorf("paid debt outstanding/status = %d/%s, want 0/%s", debt.OutstandingAmount, debt.Status, StatusPaid)
	}
}

func TestRecalculateRejectsInvalidPaidAmount(t *testing.T) {
	debt := Debt{OriginalAmount: 100, AmountPaid: 101}
	if err := debt.Recalculate(time.Now()); err == nil {
		t.Fatal("Recalculate() error = nil, want overpayment error")
	}
}

func TestDueDateIsNotOverdueUntilFollowingUTCDate(t *testing.T) {
	today := time.Date(2026, time.October, 29, 12, 0, 0, 0, time.FixedZone("local", -7*60*60))
	dueToday := time.Date(2026, time.October, 29, 23, 59, 0, 0, time.UTC)
	if IsOverdue(&dueToday, today) {
		t.Fatal("due date today should not be overdue")
	}
}

func TestDateParsesDateOnlyAndPatchAllowsMissingDueDate(t *testing.T) {
	var dueDate Date
	if err := json.Unmarshal([]byte(`"2026-10-29"`), &dueDate); err != nil {
		t.Fatalf("date-only Unmarshal() error = %v", err)
	}
	if got := dueDate.UTC().Format(time.DateOnly); got != "2026-10-29" {
		t.Errorf("parsed date = %q, want 2026-10-29", got)
	}

	patch := (UpdateDebtRequest{}).Patch()
	if patch.DueDate != nil {
		t.Errorf("omitted due date = %v, want nil", patch.DueDate)
	}
}