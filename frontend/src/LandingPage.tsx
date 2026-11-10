import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import "./landing.css";

type DemoDirection = "owed_to_me" | "i_owe";
type DemoFilter = "all" | DemoDirection;

interface DemoDebt {
  id: number;
  name: string;
  description: string;
  amount: number;
  direction: DemoDirection;
  dueDate: string;
}

const navigation = [
  { label: "Features", id: "features" },
  { label: "How it works", id: "how-it-works" },
  { label: "Demo", id: "interactive-demo" },
  { label: "Pricing", id: "pricing" },
];

const starterDebts: DemoDebt[] = [
  { id: 1, name: "Chinedu Okafor", description: "Shared trip expenses", amount: 85000, direction: "owed_to_me", dueDate: "2026-11-18" },
  { id: 2, name: "Amara Eze", description: "November utilities", amount: 32000, direction: "i_owe", dueDate: "2026-11-15" },
  { id: 3, name: "Tobi Adebayo", description: "Market supplies", amount: 120000, direction: "owed_to_me", dueDate: "2026-11-24" },
];

const faqs = [
  {
    question: "What can I track with OweMate?",
    answer: "Keep a clear record of money owed to you and money you owe, including who it is with, what it is for, due dates, and repayments.",
  },
  {
    question: "How do repayments work?",
    answer: "Record repayments against a debt to keep its outstanding balance and your activity history up to date. The interactive preview on this page is a local demo.",
  },
  {
    question: "Will OweMate send reminders on WhatsApp?",
    answer: "Reminders are part of the product direction, but WhatsApp messaging is not connected yet. OweMate will clearly indicate when delivery options are available.",
  },
  {
    question: "How is my financial information handled?",
    answer: "The interactive demo on this page stays in your browser and does not send records to a server. Review the product's privacy information before using any future account features.",
  },
  {
    question: "Can I use the AI assistant today?",
    answer: "Not yet. The AI assistant is marked as coming soon and is not available in this demo.",
  },
];

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${isVisible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function AnimatedAmount({ value }: { value: number }) {
  const { ref, isVisible } = useInView<HTMLSpanElement>();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setCount(value);
      return;
    }

    let frame = 0;
    let startTime = 0;
    const duration = 950;
    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, value]);

  return <span ref={ref}>{formatNaira(count)}</span>;
}

function LandingPage() {
  const [activeSection, setActiveSection] = useState("features");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [debts, setDebts] = useState(starterDebts);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DemoFilter>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState("");
  const [repaymentAmounts, setRepaymentAmounts] = useState<Record<number, string>>({});
  const [newDebtName, setNewDebtName] = useState("");
  const [newDebtDescription, setNewDebtDescription] = useState("");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtDirection, setNewDebtDirection] = useState<DemoDirection>("owed_to_me");
  const [newDebtDueDate, setNewDebtDueDate] = useState("");

  useEffect(() => {
    const sectionIds = navigation.map(({ id }) => id);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;
    const timer = window.setTimeout(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

  function showMessage(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function addDemoDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(newDebtAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setDebts((current) => [
      {
        id: Date.now(),
        name: newDebtName.trim(),
        description: newDebtDescription.trim(),
        amount,
        direction: newDebtDirection,
        dueDate: newDebtDueDate,
      },
      ...current,
    ]);
    setNewDebtName("");
    setNewDebtDescription("");
    setNewDebtAmount("");
    setNewDebtDueDate("");
    setShowAddForm(false);
    showMessage("Demo debt added in this browser");
  }

  function recordRepayment(debt: DemoDebt) {
    const repayment = Number(repaymentAmounts[debt.id]);
    if (!Number.isFinite(repayment) || repayment <= 0) {
      showMessage("Enter a repayment amount greater than zero");
      return;
    }
    if (repayment > debt.amount) {
      showMessage("Repayment cannot exceed the outstanding balance");
      return;
    }
    setDebts((current) =>
      current.map((item) =>
        item.id === debt.id ? { ...item, amount: item.amount - repayment } : item,
      ),
    );
    setRepaymentAmounts((current) => ({ ...current, [debt.id]: "" }));
    showMessage("Sample repayment recorded locally");
  }

  const visibleDebts = debts.filter((debt) => {
    const matchesSearch = `${debt.name} ${debt.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || debt.direction === filter;
    return matchesSearch && matchesFilter;
  });
  const owedToMe = debts
    .filter((debt) => debt.direction === "owed_to_me")
    .reduce((sum, debt) => sum + debt.amount, 0);
  const iOwe = debts
    .filter((debt) => debt.direction === "i_owe")
    .reduce((sum, debt) => sum + debt.amount, 0);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <div className="nav-inner">
          <a className="landing-brand" href="/" aria-label="OweMate home">
            <span className="brand-icon"><HandCoins size={19} strokeWidth={2.2} /></span>
            <span>Owe<span className="brand-accent">Mate</span></span>
          </a>
          <nav className={`nav-links ${mobileMenuOpen ? "nav-links-open" : ""}`} aria-label="Main navigation">
            {navigation.map(({ label, id }) => (
              <a
                key={id}
                href={`#${id}`}
                className={activeSection === id ? "nav-link nav-link-active" : "nav-link"}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <div className="mobile-nav-actions">
              <a href="/login" className="button button-outline">Log in</a>
              <a href="/demo#interactive-demo" className="button button-primary">Get started <ArrowRight size={16} /></a>
            </div>
          </nav>
          <div className="desktop-nav-actions">
            <a href="/login" className="nav-login">Log in</a>
            <a href="/demo#interactive-demo" className="button button-primary nav-cta">Get started <ArrowRight size={16} /></a>
          </div>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-inner page-container">
            <div className="hero-copy">
              <div className="hero-badge"><span className="badge-dot" /> A calmer way to manage what’s owed</div>
              <h1 className="hero-title">
                Good money habits<br />
                <span>start with clarity.</span>
              </h1>
              <p className="hero-description">
                Keep every debt, repayment, and due date in one simple place.
                Less awkward follow-up. More peace of mind.
              </p>
              <div className="hero-actions">
                <a className="button button-primary button-large button-glow" href="/demo#interactive-demo">
                  Try the interactive demo <ArrowRight size={17} />
                </a>
                <a className="button button-text button-large" href="#how-it-works">
                  See how it works <span className="play-icon">▶</span>
                </a>
              </div>
              <div className="hero-proof">
                <span className="proof-avatars"><i>A</i><i>K</i><i>T</i></span>
                <span><strong>A clearer picture</strong><br />of money between people</span>
              </div>
            </div>

            <div className="hero-product" aria-label="OweMate dashboard preview">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="dashboard-preview">
                <div className="preview-topbar">
                  <div className="preview-brand"><span><HandCoins size={13} /></span> OweMate</div>
                  <div className="preview-top-actions"><span className="preview-search" /><span className="preview-bell"><Bell size={13} /><i /></span><span className="preview-avatar">AO</span></div>
                </div>
                <div className="preview-content">
                  <div className="preview-welcome"><div><small>MONDAY, NOVEMBER 10</small><h3>Good morning, Ada</h3></div><span className="preview-add"><Plus size={13} /> Add debt</span></div>
                  <div className="preview-metrics">
                    <div className="preview-metric"><span className="metric-icon purple"><ArrowDownLeft size={13} /></span><small>OWED TO YOU</small><strong>₦487,000</strong><em>Across active debts</em></div>
                    <div className="preview-metric"><span className="metric-icon peach"><ArrowUpRight size={13} /></span><small>YOU OWE</small><strong>₦140,000</strong><em>Across active debts</em></div>
                  </div>
                  <div className="preview-chart-card">
                    <div className="chart-heading"><div><b>Money overview</b><small>Your activity at a glance</small></div><span>This month⌄</span></div>
                    <div className="chart-area">
                      <div className="chart-y-labels"><span>₦500k</span><span>₦300k</span><span>₦100k</span></div>
                      <div className="chart-plot">
                        <div className="chart-gridline line-one" /><div className="chart-gridline line-two" /><div className="chart-gridline line-three" />
                        <svg viewBox="0 0 360 100" preserveAspectRatio="none" aria-hidden="true">
                          <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7958d8" stopOpacity=".19" /><stop offset="100%" stopColor="#7958d8" stopOpacity="0" /></linearGradient></defs>
                          <path className="chart-fill" d="M0 75 C34 65 38 78 70 61 S115 70 145 48 S184 56 216 38 S260 53 292 27 S332 33 360 16 L360 100 L0 100Z" />
                          <path className="chart-line" d="M0 75 C34 65 38 78 70 61 S115 70 145 48 S184 56 216 38 S260 53 292 27 S332 33 360 16" />
                        </svg>
                        <div className="chart-x-labels"><span>Oct 14</span><span>Oct 21</span><span>Oct 28</span><span>Nov 4</span><span>Nov 10</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="preview-reminder">
                    <span className="reminder-icon"><Bell size={13} /></span>
                    <span><b>Payment coming up</b><small>Chinedu · Shared expenses</small></span>
                    <strong>₦85,000</strong>
                  </div>
                </div>
              </div>
              <div className="phone-preview">
                <div className="phone-speaker" />
                <div className="phone-screen">
                  <div className="phone-status"><span>9:41</span><span>●●● ▰</span></div>
                  <div className="phone-app-heading"><span className="phone-logo"><HandCoins size={15} /></span><b>OweMate</b><span className="phone-menu">···</span></div>
                  <small className="phone-eyebrow">YOUR BALANCE</small>
                  <strong className="phone-balance">₦347,000</strong>
                  <span className="phone-balance-note">owed to you</span>
                  <div className="phone-divider" />
                  <div className="phone-list-heading"><b>Recent debts</b><span>See all</span></div>
                  <div className="phone-debt"><i>CO</i><span><b>Chinedu</b><small>Shared expenses</small></span><strong>₦85,000</strong></div>
                  <div className="phone-debt"><i className="phone-avatar-lilac">TA</i><span><b>Tobi</b><small>Market supplies</small></span><strong>₦120,000</strong></div>
                  <div className="phone-add"><Plus size={14} /> Add a debt</div>
                </div>
              </div>
              <div className="floating-note"><span><Check size={13} /></span> You’re all caught up</div>
            </div>
          </div>
          <div className="hero-bottom page-container">
            <span>Made for everyday money moments</span>
            <div><span><ShieldCheck size={14} /> Clear records</span><span><Wallet size={14} /> Your overview</span><span><CircleHelp size={14} /> Less guesswork</span></div>
          </div>
        </section>

        <section className="features-section section-pad" id="features">
          <div className="page-container">
            <Reveal className="section-heading">
              <span className="eyebrow">A LITTLE MORE CLARITY</span>
              <h2>Money conversations,<br /><span>made more comfortable.</span></h2>
              <p>Simple tools to help you keep track without making things complicated.</p>
            </Reveal>
            <div className="feature-grid">
              <Reveal className="feature-reveal" delay={0}><article className="feature-card"><div className="feature-icon icon-purple"><ClipboardList size={21} /></div><h3>Track debts</h3><p>Keep a clear record of who owes what, what it was for, and when it’s due.</p><span className="feature-link">Every detail, in one place <ArrowRight size={14} /></span><div className="feature-decoration debt-decoration"><span>₦ 48,000</span><i /><i /><i /></div></article></Reveal>
              <Reveal className="feature-reveal" delay={90}><article className="feature-card"><div className="feature-icon icon-peach"><Bell size={21} /></div><h3>Thoughtful reminders</h3><p>See due dates coming up and stay on top of follow-ups at your own pace.</p><span className="feature-link">Stay in the know <ArrowRight size={14} /></span><div className="feature-decoration reminder-decoration"><Bell size={15} /><span>Due in 2 days</span><i /></div></article></Reveal>
              <Reveal className="feature-reveal" delay={180}><article className="feature-card"><div className="feature-icon icon-blue"><TrendingUp size={21} /></div><h3>Clear insights</h3><p>Understand what’s owed to you and what you owe with a useful overview.</p><span className="feature-link">See the bigger picture <ArrowRight size={14} /></span><div className="feature-decoration insight-decoration"><span>+12.8%</span><div><i /><i /><i /><i /><i /><i /></div></div></article></Reveal>
              <Reveal className="feature-reveal" delay={270}><article className="feature-card feature-card-ai"><div className="feature-icon icon-lilac"><Sparkles size={21} /></div><span className="coming-soon">COMING SOON</span><h3>AI assistant</h3><p>A smarter way to understand your money habits is on the horizon.</p><span className="feature-link">Not available yet <ArrowRight size={14} /></span><div className="feature-decoration ai-decoration"><Sparkles size={26} /><i /><i /></div></article></Reveal>
            </div>
          </div>
        </section>

        <section className="how-section section-pad" id="how-it-works">
          <div className="page-container how-layout">
            <Reveal className="how-intro">
              <span className="eyebrow">THREE SIMPLE STEPS</span>
              <h2>Know where you<br /><span>stand, always.</span></h2>
              <p>OweMate helps you bring the little details together, so money feels a little less awkward.</p>
              <a className="button button-outline" href="/demo#interactive-demo">Explore the demo <ArrowRight size={16} /></a>
            </Reveal>
            <div className="steps-list">
              <Reveal className="step-reveal" delay={0}><article className="step-item"><span className="step-number">01</span><div className="step-icon"><ClipboardList size={20} /></div><div><h3>Record a debt</h3><p>Add who it’s with, the amount, and a due date. A clear note now can save confusion later.</p></div><span className="step-check"><Check size={15} /></span></article></Reveal>
              <Reveal className="step-reveal" delay={120}><article className="step-item"><span className="step-number">02</span><div className="step-icon"><CreditCard size={20} /></div><div><h3>Track repayments</h3><p>Update the balance as money moves, and keep a simple history of what’s been repaid.</p></div><span className="step-check"><Check size={15} /></span></article></Reveal>
              <Reveal className="step-reveal" delay={240}><article className="step-item"><span className="step-number">03</span><div className="step-icon"><HandCoins size={20} /></div><div><h3>Get paid, stay organized</h3><p>See upcoming dates and your full picture at a glance, whenever you need it.</p></div><span className="step-check"><Check size={15} /></span></article></Reveal>
            </div>
          </div>
        </section>

        <section className="demo-section section-pad" id="interactive-demo">
          <div className="page-container">
            <Reveal className="section-heading demo-heading">
              <span className="eyebrow">TAKE IT FOR A SPIN</span>
              <h2>Get a feel for <span>OweMate.</span></h2>
              <p>A safe, local-only preview. Try adding a debt or recording a sample repayment.</p>
            </Reveal>
            <Reveal className="demo-reveal">
              <div className="demo-window">
                <div className="demo-window-top"><div className="window-dots"><i /><i /><i /></div><span><span className="demo-lock"><ShieldCheck size={12} /></span> Interactive demo · local sample data</span><span className="demo-window-menu">•••</span></div>
                <div className="demo-content">
                  <div className="demo-welcome"><div><span className="eyebrow">YOUR DEMO WORKSPACE</span><h3>Your money, in perspective.</h3><p>Try it out — changes stay in this browser only.</p></div><button className="button button-primary demo-add-button" onClick={() => setShowAddForm((open) => !open)}><Plus size={16} /> Add a debt</button></div>
                  <div className="demo-summary">
                    <div className="demo-stat"><span className="demo-stat-icon icon-purple"><ArrowDownLeft size={16} /></span><span className="demo-stat-label">Owed to you</span><strong><AnimatedAmount value={owedToMe} /></strong><small>From {debts.filter((debt) => debt.direction === "owed_to_me" && debt.amount > 0).length} active records</small></div>
                    <div className="demo-stat"><span className="demo-stat-icon icon-peach"><ArrowUpRight size={16} /></span><span className="demo-stat-label">You owe</span><strong><AnimatedAmount value={iOwe} /></strong><small>Across {debts.filter((debt) => debt.direction === "i_owe" && debt.amount > 0).length} active records</small></div>
                    <div className="demo-stat"><span className="demo-stat-icon icon-blue"><ClipboardList size={16} /></span><span className="demo-stat-label">Total records</span><strong>{debts.length}</strong><small>In this sample workspace</small></div>
                  </div>
                  {showAddForm && (
                    <form className="demo-add-form" onSubmit={addDemoDebt}>
                      <div className="demo-form-heading"><div><b>Add a sample debt</b><small>It will only exist in this browser session.</small></div><button type="button" className="demo-close-form" aria-label="Close add debt form" onClick={() => setShowAddForm(false)}><X size={17} /></button></div>
                      <div className="demo-form-fields">
                        <label>Name<input required maxLength={70} value={newDebtName} onChange={(event) => setNewDebtName(event.target.value)} placeholder="e.g. Alex Morgan" /></label>
                        <label>What for?<input required maxLength={90} value={newDebtDescription} onChange={(event) => setNewDebtDescription(event.target.value)} placeholder="e.g. Dinner" /></label>
                        <label>Amount (NGN)<input required type="number" min="1" step="1" value={newDebtAmount} onChange={(event) => setNewDebtAmount(event.target.value)} placeholder="25000" /></label>
                        <label>Due date<input required type="date" value={newDebtDueDate} onChange={(event) => setNewDebtDueDate(event.target.value)} /></label>
                        <label>Direction<select value={newDebtDirection} onChange={(event) => setNewDebtDirection(event.target.value as DemoDirection)}><option value="owed_to_me">They owe me</option><option value="i_owe">I owe them</option></select></label>
                        <button className="button button-primary demo-submit" type="submit"><Plus size={15} /> Save sample</button>
                      </div>
                    </form>
                  )}
                  <div className="demo-records-heading"><div><h4>Recent records</h4><span>Sample information only</span></div><div className="demo-tools"><label className="demo-search"><Search size={15} /><input aria-label="Search demo debts" placeholder="Search..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="demo-filter"><span className="sr-only">Filter debts</span><select value={filter} onChange={(event) => setFilter(event.target.value as DemoFilter)}><option value="all">All records</option><option value="owed_to_me">Owed to me</option><option value="i_owe">I owe</option></select></label></div></div>
                  <div className="demo-table-wrap"><table className="demo-table"><thead><tr><th>PERSON</th><th>DESCRIPTION</th><th>DUE DATE</th><th>OUTSTANDING</th><th>DIRECTION</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
                    {visibleDebts.map((debt) => (
                      <tr key={debt.id}>
                        <td><span className="demo-person"><i>{initials(debt.name)}</i><b>{debt.name}</b></span></td>
                        <td>{debt.description}</td>
                        <td>{formatDate(debt.dueDate)}</td>
                        <td><strong className="demo-balance">{formatNaira(debt.amount)}</strong></td>
                        <td><span className={`direction-pill ${debt.direction}`}>{debt.direction === "owed_to_me" ? "Owed to me" : "I owe"}</span></td>
                        <td>{debt.amount > 0 ? <div className="repayment-action"><label><span className="sr-only">Repayment amount for {debt.name}</span><input aria-label={`Repayment amount for ${debt.name}`} type="number" min="1" max={debt.amount} placeholder="Amount" value={repaymentAmounts[debt.id] ?? ""} onChange={(event) => setRepaymentAmounts((current) => ({ ...current, [debt.id]: event.target.value }))} /></label><button type="button" onClick={() => recordRepayment(debt)}>Record</button></div> : <span className="paid-pill"><Check size={12} /> Settled</span>}</td>
                      </tr>
                    ))}
                    {!visibleDebts.length && <tr><td className="empty-demo" colSpan={6}>No matching demo records. Try another search or filter.</td></tr>}
                  </tbody></table></div>
                  <p className="demo-disclaimer"><ShieldCheck size={14} /> Demo actions only change sample data in your browser. No real payments, messages, or backend requests are made.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="pricing-section section-pad" id="pricing">
          <div className="page-container">
            <Reveal className="section-heading">
              <span className="eyebrow">SIMPLE, WHEN YOU’RE READY</span>
              <h2>Plans that make <span>sense.</span></h2>
              <p>We’re still shaping the right plans. No prices or payment features are being offered yet.</p>
            </Reveal>
            <div className="pricing-grid">
              {[
                { name: "Starter", intro: "For getting a clearer picture.", icon: ClipboardList, features: ["Keep your records together", "Track due dates", "See your overview"], recommended: false },
                { name: "Standard", intro: "For more everyday organization.", icon: LayoutDashboard, features: ["Everything in Starter", "Repayment history", "More helpful insights"], recommended: true },
                { name: "Business", intro: "For keeping a team in sync.", icon: Wallet, features: ["Everything in Standard", "Team-ready workflows", "Designed to grow with you"], recommended: false },
              ].map(({ name, intro, icon: Icon, features, recommended }, index) => (
                <Reveal key={name} className="price-reveal" delay={index * 100}>
                  <article className={`pricing-card ${recommended ? "pricing-recommended" : ""}`}>
                    {recommended && <span className="recommended-label">A GOOD PLACE TO START</span>}
                    <div className="pricing-icon"><Icon size={20} /></div>
                    <h3>{name}</h3><p>{intro}</p>
                    <div className="price-placeholder">Coming soon</div>
                    <span className="price-caption">Pricing has not been finalized</span>
                    <ul>{features.map((feature) => <li key={feature}><Check size={15} /> {feature}</li>)}</ul>
                    <a className={recommended ? "button button-primary pricing-button" : "button button-outline pricing-button"} href="/demo#interactive-demo">Explore the demo <ArrowRight size={15} /></a>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="faq-section section-pad">
          <div className="page-container faq-layout">
            <Reveal className="faq-intro"><span className="eyebrow">GOOD QUESTIONS</span><h2>A few things<br /><span>you might wonder.</span></h2><p>Still curious? Try the interactive demo or explore the product preview.</p><a href="/demo#interactive-demo" className="faq-help-link">Try the demo <ArrowRight size={15} /></a></Reveal>
            <div className="faq-list">
              {faqs.map(({ question, answer }, index) => (
                <Reveal key={question} delay={index * 45}>
                  <div className={`faq-item ${openFaq === index ? "faq-item-open" : ""}`}>
                    <button className="faq-question" aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq((current) => current === index ? null : index)}>
                      <span>{question}</span><ChevronDown size={18} />
                    </button>
                    <div id={`faq-answer-${index}`} className="faq-answer" aria-hidden={openFaq !== index}><div><p>{answer}</p></div></div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta-section">
          <Reveal className="page-container">
            <div className="final-cta">
              <div className="cta-decoration cta-decoration-one" /><div className="cta-decoration cta-decoration-two" />
              <span className="eyebrow">A LITTLE CLARITY GOES A LONG WAY</span>
              <h2>Make money moments<br />feel a little simpler.</h2>
              <p>Start with the interactive demo. No account needed, and every change stays right here.</p>
              <div className="final-cta-actions"><a className="button button-white" href="/demo#interactive-demo">Try the demo <ArrowRight size={16} /></a><a className="button button-cta-outline" href="/dashboard">Explore the dashboard</a></div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="page-container">
          <div className="footer-main">
            <div className="footer-brand-block"><a className="landing-brand" href="/"><span className="brand-icon"><HandCoins size={19} /></span><span>Owe<span className="brand-accent">Mate</span></span></a><p>More clarity for the money you share.</p></div>
            <div className="footer-links"><div><b>Explore</b><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a></div><div><b>Product</b><a href="/demo#interactive-demo">Interactive demo</a><a href="/dashboard">Dashboard preview</a><a href="/login">Log in</a></div></div>
          </div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} OweMate. All rights reserved.</span><span>Demo data is local to this browser.</span></div>
        </div>
      </footer>
      {toast && <div role="status" className="demo-toast"><Check size={16} />{toast}</div>}
    </div>
  );
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default LandingPage;
