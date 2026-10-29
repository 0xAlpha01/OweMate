import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Plus,
  Search,
  Settings2,
  Wallet,
} from "lucide-react";
import { AddDebtModal } from "./components/AddDebtModal";
import { DebtTable } from "./components/DebtTable";
import { ActivityPanel, BreakdownPanel, RemindersPanel } from "./components/OverviewPanels";
import { Sidebar } from "./components/Sidebar";
import { mockDebts, mockRepayments } from "./data/mockData";
import { getDebtStatus, getFinanceSummary, getOutstandingDebts, sortByDueDate } from "./lib/finance";
import type { Debt, DebtDraft, Repayment, ViewKey } from "./types";
import "./dashboard.css";

const todayLabel = new Intl.DateTimeFormat("en-NG", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase();

const pageCopy: Record<ViewKey, { title: string; subtitle: string }> = {
  Overview: { title: "Overview", subtitle: "A clear picture of your money, all in one place." },
  "All Debts": { title: "All debts", subtitle: "Every balance you are tracking." },
  "Money Owed to Me": { title: "Money owed to you", subtitle: "Keep an eye on incoming repayments." },
  "Money I Owe": { title: "Money you owe", subtitle: "Stay ahead of your outgoing payments." },
  Repayments: { title: "Repayments", subtitle: "A record of money moving in and out." },
  Reminders: { title: "Reminders", subtitle: "Upcoming and overdue payment dates." },
  Settings: { title: "Settings", subtitle: "Your OweMate workspace preferences." },
};

const summaryConfig = [
  { key: "owedToMe", label: "Total owed to you", helper: "Across active debts", icon: ArrowDownLeft, tone: "teal" },
  { key: "iOwe", label: "Total you owe", helper: "Across active debts", icon: ArrowUpRight, tone: "blue" },
  { key: "overdue", label: "Overdue debts", helper: "Needs your attention", icon: Bell, tone: "orange" },
  { key: "repaidThisMonth", label: "Repayments this month", helper: "Recorded so far", icon: CreditCard, tone: "purple" },
] as const;

function App() {
  const [debts, setDebts] = useState<Debt[]>(mockDebts);
  const [repayments, setRepayments] = useState<Repayment[]>(mockRepayments);
  const [activeView, setActiveView] = useState<ViewKey>("Overview");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const summary = getFinanceSummary(debts, repayments);
  const activeDebts = getOutstandingDebts(debts);
  const query = search.trim().toLocaleLowerCase();
  const matchingDebts = sortByDueDate(debts.filter((debt) => {
    const matchesView = activeView === "Money Owed to Me"
      ? debt.direction === "owed_to_me"
      : activeView === "Money I Owe"
        ? debt.direction === "i_owe"
        : true;
    const matchesSearch = !query || [debt.personName, debt.description, debt.notes ?? ""]
      .some((value) => value.toLocaleLowerCase().includes(query));
    return matchesView && matchesSearch;
  }));
  const matchingRepayments = repayments.filter((repayment) =>
    !query || [repayment.personName, repayment.description]
      .some((value) => value.toLocaleLowerCase().includes(query)),
  );
  const reminders = sortByDueDate(activeDebts).filter((debt) => getDebtStatus(debt) !== "paid");
  const copy = pageCopy[activeView];

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function handleAddDebt(draft: DebtDraft) {
    const newDebt: Debt = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setDebts((current) => [newDebt, ...current]);
    setIsAddModalOpen(false);
    showToast("Debt added to your records");
  }

  function handleMarkRepaid(debt: Debt) {
    const paidAt = new Date().toISOString();
    setDebts((current) => current.map((item) => item.id === debt.id ? { ...item, paidAt } : item));
    setRepayments((current) => [{
      id: crypto.randomUUID(), debtId: debt.id, personName: debt.personName,
      description: debt.description, amount: debt.amount, date: paidAt, direction: debt.direction,
    }, ...current]);
    showToast("Repayment recorded");
  }

  function handleDeleteDebt(debt: Debt) {
    setDebts((current) => current.filter((item) => item.id !== debt.id));
    showToast("Debt removed");
  }

  const tableTitle = activeView === "Overview" ? "Recent debts" : copy.title;
  const visibleDebts = activeView === "Overview" ? matchingDebts.slice(0, 5) : matchingDebts;

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        isMobileOpen={isMobileNavOpen}
        onNavigate={(view) => { setActiveView(view); setIsMobileNavOpen(false); }}
        onClose={() => setIsMobileNavOpen(false)}
      />
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setIsMobileNavOpen(true)}><Settings2 size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{copy.title}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={17} /><input aria-label="Search debts and repayments" placeholder="Search anything..." value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
            <button className="icon-button notification-button" aria-label="View reminders" onClick={() => setActiveView("Reminders")}><Bell size={18} /><span className="notification-dot" /></button>
            <div className="user-avatar" aria-label="Account: Ada Okafor">AO</div>
          </div>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <div><p className="eyebrow">{todayLabel}</p>
              <h1>{activeView === "Overview" ? "Good morning, Ada" : copy.title}</h1>
              <p className="page-subtitle">{activeView === "Overview" ? "Here's what's happening with your money today." : copy.subtitle}</p></div>
            <button className="primary-button" onClick={() => setIsAddModalOpen(true)}><Plus size={18} /> Add debt</button>
          </div>

          {activeView === "Overview" && <>
            <section className="summary-grid" aria-label="Financial summary">
              {summaryConfig.map(({ key, label, helper, icon: Icon, tone }) => <article className="summary-card" key={key}>
                <div className={`summary-icon ${tone}`}><Icon size={19} /></div><p className="summary-label">{label}</p>
                <p className="summary-value">{formatNGN(summary[key])}</p><p className="summary-helper">{helper}</p>
              </article>)}
            </section>
            <section className="overview-grid">
              <div className="panel debt-panel"><div className="panel-heading"><div><h2>{tableTitle}</h2><p>Your latest debt records</p></div><button className="text-button" onClick={() => setActiveView("All Debts")}>View all <ChevronRight size={15} /></button></div>
                <DebtTable debts={visibleDebts} onMarkRepaid={handleMarkRepaid} onDelete={handleDeleteDebt} /></div>
              <div className="side-panels"><BreakdownPanel debts={debts} /><RemindersPanel debts={reminders.slice(0, 4)} onSelect={() => setActiveView("Reminders")} /></div>
            </section>
            <ActivityPanel repayments={matchingRepayments.slice(0, 4)} />
          </>}

          {(activeView === "All Debts" || activeView === "Money Owed to Me" || activeView === "Money I Owe") && <div className="panel full-panel">
            <div className="panel-heading"><div><h2>{tableTitle}</h2><p>{matchingDebts.length} records</p></div></div>
            <DebtTable debts={matchingDebts} onMarkRepaid={handleMarkRepaid} onDelete={handleDeleteDebt} />
          </div>}

          {activeView === "Repayments" && <div className="panel full-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>{matchingRepayments.length} repayments</p></div></div><ActivityPanel repayments={matchingRepayments} embedded /></div>}
          {activeView === "Reminders" && <div className="panel full-panel"><div className="panel-heading"><div><h2>Payment reminders</h2><p>Upcoming due dates and overdue balances</p></div></div><RemindersPanel debts={reminders.filter((debt) => matchesSearch(debt, query))} expanded /></div>}
          {activeView === "Settings" && <div className="panel settings-panel">
            <div className="settings-icon"><Wallet size={21} /></div><div><h2>Workspace preferences</h2><p>Your dashboard is set to display amounts in Nigerian naira (NGN).</p></div>
            <div className="settings-row"><span>Currency</span><strong>NGN · Nigerian naira</strong></div><div className="settings-row"><span>Workspace owner</span><strong>Ada Okafor</strong></div><div className="settings-row"><span>Data storage</span><strong>Local demo data</strong></div>
            <p className="settings-note"><CircleHelp size={15} /> Settings are for this demo workspace only.</p>
          </div>}
          {query && matchingDebts.length === 0 && matchingRepayments.length === 0 && <div className="empty-search"><Search size={22} /><strong>No matches found</strong><span>Try another name or description.</span></div>}
        </main>
      </div>
      {isAddModalOpen && <AddDebtModal onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddDebt} />}
      {toast && <div role="status" className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

function formatNGN(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

function matchesSearch(debt: Debt, query: string) {
  return !query || [debt.personName, debt.description, debt.notes ?? ""]
    .some((value) => value.toLocaleLowerCase().includes(query));
}

export default App;
