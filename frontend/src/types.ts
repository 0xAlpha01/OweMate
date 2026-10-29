export type DebtDirection = "owed_to_me" | "i_owe";
export type DebtStatus = "upcoming" | "due_soon" | "overdue" | "paid";
export type ViewKey = "Overview" | "All Debts" | "Money Owed to Me" | "Money I Owe" | "Repayments" | "Reminders" | "Settings";

export interface Debt {
  id: string;
  personName: string;
  direction: DebtDirection;
  amount: number;
  description: string;
  dueDate: string;
  notes?: string;
  createdAt: string;
  paidAt?: string;
}

export interface DebtDraft {
  personName: string;
  direction: DebtDirection;
  amount: number;
  description: string;
  dueDate: string;
  notes?: string;
}

export interface Repayment {
  id: string;
  debtId: string;
  personName: string;
  description: string;
  amount: number;
  date: string;
  direction: DebtDirection;
}