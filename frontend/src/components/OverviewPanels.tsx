import { ArrowDownLeft, ArrowUpRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { getDebtStatus, getOutstandingDebts } from "../lib/finance";
import type { Debt, Repayment } from "../types";

export function BreakdownPanel({ debts }: { debts: Debt[] }) {
  const active = getOutstandingDebts(debts);
  const incoming = active.filter((debt) => debt.direction === "owed_to_me").reduce((sum, debt) => sum + debt.amount, 0);
  const outgoing = active.filter((debt) => debt.direction === "i_owe").reduce((sum, debt) => sum + debt.amount, 0);
  const total = incoming + outgoing;
  const incomingPercent = total === 0 ? 0 : (incoming / total) * 100;
  const outgoingPercent = total === 0 ? 0 : (outgoing / total) * 100;
  return <section className="panel breakdown-panel">
    <div className="panel-heading compact-heading"><div><h2>Debt breakdown</h2><p>Outstanding balances</p></div><button className="panel-more" aria-label="Debt breakdown details">···</button></div>
    <div className="breakdown-total"><strong>{formatNGN(total)}</strong><span>Total tracked</span></div>
    <div className="breakdown-bar" aria-label={`${Math.round(incomingPercent)}% owed to you and ${Math.round(outgoingPercent)}% you owe`}><span className="bar-incoming" style={{ width: `${incomingPercent}%` }} /><span className="bar-outgoing" style={{ width: `${outgoingPercent}%` }} /></div>
    <div className="breakdown-legend"><div><span className="legend-dot incoming-dot" /><span>Owed to you</span><strong>{formatNGN(incoming)}</strong></div><div><span className="legend-dot outgoing-dot" /><span>You owe</span><strong>{formatNGN(outgoing)}</strong></div></div>
  </section>;
}

interface RemindersPanelProps { debts: Debt[]; expanded?: boolean; onSelect?: () => void }

export function RemindersPanel({ debts, expanded = false, onSelect }: RemindersPanelProps) {
  return <section className={`panel reminders-panel ${expanded ? "expanded-panel" : ""}`}>
    <div className="panel-heading compact-heading"><div><h2>Upcoming reminders</h2><p>Don't miss a payment date</p></div>{!expanded && <button className="panel-more" aria-label="View reminders" onClick={onSelect}>···</button>}</div>
    {debts.length === 0 ? <div className="panel-empty"><CheckCircle2 size={19} /><span>You're all caught up.</span></div> : <div className="reminder-list">{debts.map((debt) => {
      const status = getDebtStatus(debt);
      const dueDate = new Date(`${debt.dueDate}T12:00:00`);
      return <div className="reminder-item" key={debt.id}>
        <div className={`reminder-date ${status === "overdue" ? "reminder-date-late" : ""}`}><span>{new Intl.DateTimeFormat("en", { month: "short" }).format(dueDate)}</span><strong>{dueDate.getDate()}</strong></div>
        <div className="reminder-copy"><strong>{debt.personName}</strong><span>{debt.description}</span></div><strong className="reminder-amount">{formatNGN(debt.amount)}</strong>
      </div>;
    })}</div>}
  </section>;
}

export function ActivityPanel({ repayments, embedded = false }: { repayments: Repayment[]; embedded?: boolean }) {
  return <section className={`panel activity-panel ${embedded ? "activity-embedded" : ""}`}>
    {!embedded && <div className="panel-heading"><div><h2>Recent repayment activity</h2><p>Your latest money movements</p></div><span className="activity-period"><CalendarDays size={15} /> This month</span></div>}
    {repayments.length === 0 ? <div className="table-empty"><strong>No repayments yet</strong><span>Recorded repayments will appear here.</span></div> : <div className="activity-list">{repayments.map((repayment) => {
      const incoming = repayment.direction === "owed_to_me";
      return <div className="activity-item" key={repayment.id}>
        <div className={`activity-icon ${incoming ? "activity-incoming" : "activity-outgoing"}`}>{incoming ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div>
        <div className="activity-description"><strong>{repayment.personName}</strong><span>{repayment.description} · {formatDate(repayment.date)}</span></div>
        <strong className={`activity-amount ${incoming ? "positive-amount" : "negative-amount"}`}>{incoming ? "+" : "−"}{formatNGN(repayment.amount)}</strong>
      </div>;
    })}</div>}
  </section>;
}

function formatNGN(amount: number) { return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(new Date(value)); }