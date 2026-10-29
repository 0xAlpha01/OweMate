import type { Debt, Repayment } from "../types";

function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthDate(day: number) {
  const now = new Date();
  const safeDay = Math.min(day, now.getDate());
  return new Date(now.getFullYear(), now.getMonth(), safeDay, 12).toISOString();
}

export const mockDebts: Debt[] = [
  { id: "debt-001", personName: "Zara Bello", direction: "owed_to_me", amount: 75000, description: "Travel expenses", dueDate: dateOffset(-4), createdAt: dateOffset(-31) },
  { id: "debt-002", personName: "Chinedu Okafor", direction: "owed_to_me", amount: 185000, description: "October stock purchase", dueDate: dateOffset(4), createdAt: dateOffset(-23) },
  { id: "debt-003", personName: "Emeka Nwosu", direction: "i_owe", amount: 42000, description: "Shared utility bill", dueDate: dateOffset(1), createdAt: dateOffset(-18) },
  { id: "debt-004", personName: "Tobi Adebayo", direction: "owed_to_me", amount: 245000, description: "Laptop installment", dueDate: dateOffset(10), createdAt: dateOffset(-12) },
  { id: "debt-005", personName: "Kemi Williams", direction: "i_owe", amount: 98000, description: "Design project advance", dueDate: dateOffset(16), createdAt: dateOffset(-8) },
  { id: "debt-006", personName: "Adaeze Obi", direction: "owed_to_me", amount: 62000, description: "Market supplies", dueDate: dateOffset(23), createdAt: dateOffset(-3) },
];

export const mockRepayments: Repayment[] = [
  { id: "repayment-001", debtId: "debt-002", personName: "Chinedu Okafor", description: "October stock purchase", amount: 55000, date: monthDate(4), direction: "owed_to_me" },
  { id: "repayment-002", debtId: "debt-003", personName: "Emeka Nwosu", description: "Shared utility bill", amount: 38000, date: monthDate(14), direction: "i_owe" },
  { id: "repayment-003", debtId: "debt-004", personName: "Tobi Adebayo", description: "Laptop installment", amount: 31000, date: monthDate(22), direction: "owed_to_me" },
];