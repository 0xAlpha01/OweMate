import type { Debt, DebtStatus, Repayment } from "../types";

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDebtStatus(debt: Debt, today = new Date()): DebtStatus {
  if (debt.paidAt) return "paid";
  const todayKey = localDateKey(today);
  if (debt.dueDate < todayKey) return "overdue";
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 3);
  return debt.dueDate <= localDateKey(soon) ? "due_soon" : "upcoming";
}

export function getOutstandingDebts(debts: Debt[]) {
  return debts.filter((debt) => getDebtStatus(debt) !== "paid");
}

export function sortByDueDate(debts: Debt[]) {
  return [...debts].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getFinanceSummary(debts: Debt[], repayments: Repayment[]) {
  const active = getOutstandingDebts(debts);
  const currentMonth = new Date().toISOString().slice(0, 7);
  return {
    owedToMe: active
      .filter((debt) => debt.direction === "owed_to_me")
      .reduce((total, debt) => total + debt.amount, 0),
    iOwe: active
      .filter((debt) => debt.direction === "i_owe")
      .reduce((total, debt) => total + debt.amount, 0),
    overdue: active
      .filter((debt) => getDebtStatus(debt) === "overdue")
      .reduce((total, debt) => total + debt.amount, 0),
    repaidThisMonth: repayments
      .filter((repayment) => repayment.date.slice(0, 7) === currentMonth)
      .reduce((total, repayment) => total + repayment.amount, 0),
  };
}
