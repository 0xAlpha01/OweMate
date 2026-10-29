import { Check, MoreHorizontal, Trash2 } from "lucide-react";
import { getDebtStatus } from "../lib/finance";
import type { Debt, DebtStatus } from "../types";

interface DebtTableProps {
  debts: Debt[];
  onMarkRepaid: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}

const statusLabels: Record<DebtStatus, string> = {
  upcoming: "Upcoming",
  due_soon: "Due soon",
  overdue: "Overdue",
  paid: "Paid",
};

export function DebtTable({ debts, onMarkRepaid, onDelete }: DebtTableProps) {
  if (debts.length === 0)
    return (
      <div className="table-empty">
        <strong>No debts to show</strong>
        <span>Try another search or add a new debt.</span>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="debt-table">
        <thead>
          <tr>
            <th>PERSON</th>
            <th>DESCRIPTION</th>
            <th>AMOUNT</th>
            <th>DUE DATE</th>
            <th>STATUS</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {debts.map((debt) => {
            const status = getDebtStatus(debt);
            return (
              <tr key={debt.id}>
                <td>
                  <div className="person-cell">
                    <span
                      className={`person-avatar avatar-${debt.personName.charCodeAt(0) % 5}`}
                    >
                      {getInitials(debt.personName)}
                    </span>
                    <div>
                      <strong>{debt.personName}</strong>
                      <span>
                        {debt.direction === "owed_to_me"
                          ? "Owes you"
                          : "You owe"}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="description-cell">{debt.description}</td>
                <td className="amount-cell">{formatNGN(debt.amount)}</td>
                <td className="date-cell">{formatDate(debt.dueDate)}</td>
                <td>
                  <span className={`status-pill status-${status}`}>
                    {statusLabels[status]}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    {status !== "paid" && (
                      <button
                        className="row-action"
                        title="Mark as repaid"
                        aria-label={`Mark ${debt.personName}'s debt as repaid`}
                        onClick={() => onMarkRepaid(debt)}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      className="row-action delete-action"
                      title="Remove debt"
                      aria-label={`Remove ${debt.personName}'s debt`}
                      onClick={() => onDelete(debt)}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      className="row-action more-action"
                      aria-label={`More actions for ${debt.personName}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
