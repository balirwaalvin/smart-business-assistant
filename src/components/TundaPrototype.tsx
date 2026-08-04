"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Lightbulb,
  Mic,
  Package,
  Plus,
  ReceiptText,
  RotateCcw,
  Sparkles,
  Target,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  applyTransaction,
  BusinessState,
  DEMO_EXAMPLES,
  DraftTransaction,
  formatUgx,
  getFeedback,
  getMetrics,
  getRecommendation,
  parseTransaction,
  SEED_STATE,
  transactionLabels,
  TransactionKind,
  validateTransaction,
} from "@/lib/demo-engine";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STORAGE_KEY = "tunda-prototype-v1";

type Language = "en" | "lg";
type DashboardView = "overview" | "records" | "stock" | "people";
type RecordFilter = "all" | "sales" | "costs" | "credit";

const copy = {
  en: {
    welcome: "Good morning",
    record: "Record a transaction",
    prompt: "Tell Tunda what happened in your business",
    placeholder: "Example: Sold 5 bottles of soda for 10,000 shillings cash",
    review: "Review what Tunda understood",
    confirm: "Save transaction",
    cancel: "Edit entry",
    goal: "Monthly break-even goal",
    recommendation: "Recommended next move",
  },
  lg: {
    welcome: "Wasuze otya",
    record: "Wandiika by'okola mu bizinensi",
    prompt: "Tegeeza Tunda ekibadde mu bizinensi yo",
    placeholder: "Okugeza: Ntunze soda 5 ku 10,000 mu nkalu",
    review: "Kebera Tunda ky'etegeedde",
    confirm: "Tereka kino",
    cancel: "Kyusa ky'owandiise",
    goal: "Ekigendererwa ky'omwezi",
    recommendation: "Ekisinga okukolebwa kati",
  },
};

const kindIcons: Record<TransactionKind, typeof CreditCard> = {
  cash_sale: ArrowUpRight,
  credit_sale: Users,
  expense: ArrowDownRight,
  purchase: Package,
  customer_payment: WalletCards,
};

function cloneSeed() {
  return structuredClone(SEED_STATE);
}

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`brand ${inverse ? "brand--inverse" : ""}`} aria-label="Tunda Business">
      <span className="brand__mark">
        <Image src="/TUNDA Favicon.png" alt="" width={36} height={36} priority />
      </span>
      <span className="brand__words">
        <strong>Tunda</strong>
        <small>Business</small>
      </span>
    </div>
  );
}

function Landing({ onEnter }: { onEnter: () => void }) {
  const landingRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .from(".landing-nav", { y: -20, opacity: 0, duration: 0.55 })
      .from(".hero__eyebrow", { y: 18, opacity: 0, duration: 0.45 }, "-=0.2")
      .from(".hero__title span", { y: 80, opacity: 0, rotate: 1, stagger: 0.08, duration: 0.75 }, "-=0.2")
      .from(".hero__copy, .hero__actions", { y: 20, opacity: 0, stagger: 0.08, duration: 0.5 }, "-=0.4")
      .from(".hero-visual", { scale: 0.94, opacity: 0, duration: 0.75 }, "-=0.7")
      .from(".floating-proof", { y: 24, opacity: 0, stagger: 0.1, duration: 0.5 }, "-=0.35");

    gsap.from(".journey__step", {
      scrollTrigger: { trigger: ".journey", start: "top 78%" },
      y: 36,
      opacity: 0,
      stagger: 0.11,
      duration: 0.6,
      ease: "power3.out",
    });
  }, { scope: landingRef });

  return (
    <div className="landing" ref={landingRef}>
      <nav className="landing-nav shell">
        <Brand />
        <div className="landing-nav__links" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#why-tunda">Why Tunda</a>
        </div>
        <button className="button button--ink button--small" onClick={onEnter}>
          Open live demo <ArrowRight size={16} />
        </button>
      </nav>

      <main>
        <section className="hero shell">
          <div className="hero__content">
            <p className="hero__eyebrow">AI financial clarity for everyday businesses</p>
            <h1 className="hero__title">
              <span>Know your business.</span>
              <span>Know what to do next.</span>
            </h1>
            <p className="hero__copy">
              Tunda turns the words you already use into organised records, live numbers, and one clear next move. No forms. No accounting language.
            </p>
            <div className="hero__actions">
              <button className="button button--gold" onClick={onEnter}>
                Try the working prototype <ArrowRight size={18} />
              </button>
              <a className="text-link" href="#how-it-works">See the simple flow <ChevronRight size={16} /></a>
            </div>
          </div>

          <div className="hero-visual" aria-label="Tunda dashboard preview">
            <div className="hero-visual__photo" />
            <div className="floating-proof floating-proof--input">
              <Mic size={18} />
              <div><small>Amina told Tunda</small><strong>“Sold 5 sodas for 10,000 cash”</strong></div>
            </div>
            <div className="floating-proof floating-proof--result">
              <span className="proof-check"><Check size={16} /></span>
              <div><small>Updated automatically</small><strong>Cash, sales and soda stock</strong></div>
            </div>
            <div className="hero-visual__metric">
              <small>Today&apos;s sales</small>
              <strong>UGX 184,000</strong>
              <span><ArrowUpRight size={14} /> On track</span>
            </div>
          </div>
        </section>

        <section className="trust-strip" id="why-tunda">
          <div className="shell trust-strip__inner">
            <p>Designed for the way small businesses already work</p>
            <div><strong>Plain language</strong><span>English or Luganda</span></div>
            <div><strong>Automatic records</strong><span>Cash, stock and credit</span></div>
            <div><strong>Useful guidance</strong><span>From your own numbers</span></div>
          </div>
        </section>

        <section className="journey shell" id="how-it-works">
          <div className="section-heading">
            <p>One natural action</p>
            <h2>The hard work stays in the background.</h2>
            <span>Tunda handles the structure. The owner sees only what they need.</span>
          </div>
          <div className="journey__grid">
            <article className="journey__step journey__step--navy">
              <Mic size={28} />
              <small>Speak or type</small>
              <h3>Say what happened in your own words.</h3>
              <p>“Grace took two loaves on credit for 7,000.”</p>
            </article>
            <article className="journey__step journey__step--blue">
              <BookOpen size={28} />
              <small>Tunda organises it</small>
              <h3>Every account updates together.</h3>
              <p>Sales rise, bread stock falls, and Grace&apos;s balance is recorded.</p>
            </article>
            <article className="journey__step journey__step--cream">
              <Lightbulb size={28} />
              <small>Act with confidence</small>
              <h3>Get one timely recommendation.</h3>
              <p>Restock before demand costs you sales, or follow a daily goal.</p>
            </article>
          </div>
          <button className="button button--ink journey__cta" onClick={onEnter}>
            Experience the full flow <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="shell"><Brand inverse /><p>Built for African business realities. Ready to grow beyond borders.</p></div>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, note, tone, icon: Icon }: { label: string; value: string; note: string; tone: string; icon: typeof CreditCard }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top"><span>{label}</span><Icon size={19} /></div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function ActivityFeed({ entries }: { entries: BusinessState["entries"] }) {
  return (
    <div className="activity-list">
      {entries.map((entry) => {
        const Icon = kindIcons[entry.kind];
        const isIncoming = ["cash_sale", "credit_sale", "customer_payment"].includes(entry.kind);
        return <article key={entry.id}>
          <span className={`activity-icon activity-icon--${entry.kind}`}><Icon size={17} /></span>
          <div><strong>{transactionLabels[entry.kind]}</strong><p>{entry.description}</p></div>
          <div className="activity-amount"><strong className={isIncoming ? "is-positive" : ""}>{isIncoming ? "+" : "-"}{formatUgx(entry.amount)}</strong><small>{relativeTime(entry.createdAt)}</small></div>
        </article>;
      })}
    </div>
  );
}

function StockList({ products }: { products: BusinessState["products"] }) {
  return (
    <div className="stock-list">
      {products.map((product) => {
        const percentage = Math.min(100, Math.round((product.quantity / (product.reorderAt * 2.5)) * 100));
        const low = product.quantity <= product.reorderAt;
        return <div className="stock-row" key={product.id}>
          <div className={`stock-row__symbol ${low ? "is-low" : ""}`}>{product.name.slice(0, 2).toUpperCase()}</div>
          <div className="stock-row__main"><div><strong>{product.name}</strong><span>{product.quantity} {product.unit}</span></div><div className="stock-bar"><span style={{ width: `${percentage}%` }} /></div></div>
          <small className={low ? "is-low" : ""}>{low ? "Restock soon" : "Healthy"}</small>
        </div>;
      })}
    </div>
  );
}

function Dashboard({ onExit }: { onExit: () => void }) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [state, setState] = useState<BusinessState>(cloneSeed);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<DraftTransaction | null>(null);
  const [parseError, setParseError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseSource, setParseSource] = useState<"gemini" | "local">("local");
  const [showHelp, setShowHelp] = useState(false);
  const c = copy[language];

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const frame = window.requestAnimationFrame(() => {
      try {
        setState(JSON.parse(stored) as BusinessState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useGSAP(() => {
    gsap.from(".dashboard-header", { y: -16, opacity: 0, duration: 0.45, ease: "power2.out" });
    gsap.from(".dashboard-view > *", { y: 24, opacity: 0, stagger: 0.055, duration: 0.48, ease: "power3.out", delay: 0.1 });
  }, { scope: dashboardRef });

  useEffect(() => {
    gsap.fromTo(".dashboard-view", { y: 12, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.32, ease: "power2.out" });
  }, [activeView]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 5600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const metrics = useMemo(() => getMetrics(state), [state]);
  const recommendation = useMemo(() => getRecommendation(state), [state]);
  const lowStockNames = metrics.lowStock.map((product) => product.name).join(", ") || "Stock levels are healthy";
  const inventoryValue = useMemo(() => state.products.reduce((sum, product) => sum + product.quantity * product.costPrice, 0), [state.products]);
  const filteredEntries = useMemo(() => state.entries.filter((entry) => {
    if (recordFilter === "sales") return ["cash_sale", "credit_sale"].includes(entry.kind);
    if (recordFilter === "costs") return ["expense", "purchase"].includes(entry.kind);
    if (recordFilter === "credit") return ["credit_sale", "customer_payment"].includes(entry.kind) || (entry.kind === "purchase" && entry.paymentMethod === "credit");
    return true;
  }), [recordFilter, state.entries]);

  const viewHeadings: Record<DashboardView, { eyebrow: string; title: string; subtitle: string }> = {
    overview: { eyebrow: `${c.welcome}, ${state.ownerName}`, title: `Here is how ${state.businessName} is doing.`, subtitle: `${state.location} · Demo business` },
    records: { eyebrow: "Business records", title: "Every transaction, organised.", subtitle: "Record what happened and review the complete money trail." },
    stock: { eyebrow: "Inventory", title: "Know what is on your shelves.", subtitle: "See what is healthy, what is running low, and what to buy next." },
    people: { eyebrow: "Credit relationships", title: "Know who owes whom.", subtitle: "Customer and supplier balances in one calm, clear place." },
  };
  const viewHeading = viewHeadings[activeView];

  function selectView(view: DashboardView) {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function prepareTransaction(event: FormEvent) {
    event.preventDefault();
    setIsParsing(true);
    let parsed: DraftTransaction | null = null;
    let source: "gemini" | "local" = "local";

    try {
      const response = await fetch("/api/prototype/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, language }),
      });
      const payload = await response.json() as { transaction?: DraftTransaction; source?: "gemini" | "local"; error?: string };
      if (!response.ok) throw new Error(payload.error || "Tunda could not understand that entry.");
      parsed = payload.transaction ?? null;
      source = payload.source ?? "local";
    } catch (error) {
      parsed = parseTransaction(input);
      if (!parsed) {
        setParseError(error instanceof Error ? error.message : "Tunda could not understand that entry.");
        setIsParsing(false);
        return;
      }
    }

    setIsParsing(false);
    if (!parsed || parsed.amount <= 0) {
      setParseError("Add what happened and an amount. You can also choose one of the examples below.");
      return;
    }
    const validationError = validateTransaction(state, parsed);
    if (validationError) {
      setParseError(validationError);
      return;
    }
    setParseError("");
    setParseSource(source);
    setDraft(parsed);
  }

  function confirmTransaction() {
    if (!draft) return;
    const next = applyTransaction(state, draft);
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setFeedback(getFeedback(draft));
    setDraft(null);
    setInput("");
    window.requestAnimationFrame(() => {
      gsap.fromTo(".metric-card", { scale: 0.985 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
    });
  }

  function resetDemo() {
    const next = cloneSeed();
    setState(next);
    setInput("");
    setDraft(null);
    setFeedback("Demo data has been restored to its starting point.");
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function startListening() {
    const browserWindow = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
        onend: () => void;
        onerror: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
        onend: () => void;
        onerror: () => void;
        start: () => void;
      };
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setFeedback("Voice entry is not available in this browser. Type the same words instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language === "lg" ? "lg-UG" : "en-UG";
    recognition.interimResults = false;
    recognition.onresult = (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setFeedback("Tunda could not hear that clearly. Please try again or type the transaction.");
    };
    setIsListening(true);
    recognition.start();
  }

  function renderTransactionComposer(wide = false) {
    return <section className={`transaction-composer panel ${wide ? "transaction-composer--wide" : ""}`}>
      <div className="panel-heading">
        <div><span className="panel-heading__icon"><Plus size={18} /></span><div><p>{c.record}</p><h2>{c.prompt}</h2></div></div>
        <small>English or Luganda</small>
      </div>
      <form onSubmit={prepareTransaction}>
        <div className={`composer-input ${isListening ? "is-listening" : ""}`}>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder={c.placeholder} rows={3} />
          <button type="button" className="mic-button" onClick={startListening} aria-label="Speak transaction"><Mic size={20} /></button>
        </div>
        {parseError && <p className="form-error">{parseError}</p>}
        <div className="composer-actions">
          <div className="example-menu">
            <span>Try an example</span>
            <div className="example-menu__items">
              {DEMO_EXAMPLES.map((example) => <button type="button" key={example} onClick={() => { setInput(example); setParseError(""); }}>{example}</button>)}
            </div>
          </div>
          <button className="button button--ink" type="submit" disabled={isParsing}>{isParsing ? "Tunda is organising it…" : "Let Tunda organise it"} <Sparkles size={17} /></button>
        </div>
      </form>
    </section>;
  }

  return (
    <div className="app-shell" ref={dashboardRef}>
      <header className="dashboard-header">
        <div className="dashboard-header__inner shell-wide">
          <button className="brand-button" onClick={onExit} aria-label="Return to Tunda welcome page"><Brand /></button>
          <nav className="dashboard-nav" aria-label="Dashboard sections">
            <button className={activeView === "overview" ? "is-active" : ""} onClick={() => selectView("overview")} aria-current={activeView === "overview" ? "page" : undefined}>Overview</button>
            <button className={activeView === "records" ? "is-active" : ""} onClick={() => selectView("records")} aria-current={activeView === "records" ? "page" : undefined}>Records</button>
            <button className={activeView === "stock" ? "is-active" : ""} onClick={() => selectView("stock")} aria-current={activeView === "stock" ? "page" : undefined}>Stock</button>
            <button className={activeView === "people" ? "is-active" : ""} onClick={() => selectView("people")} aria-current={activeView === "people" ? "page" : undefined}>People</button>
          </nav>
          <div className="dashboard-actions">
            <button className="language-switch" onClick={() => setLanguage(language === "en" ? "lg" : "en")} aria-label="Switch language">
              <span className={language === "en" ? "is-selected" : ""}>EN</span><span className={language === "lg" ? "is-selected" : ""}>LG</span>
            </button>
            <button className="icon-button" onClick={() => setShowHelp(true)} aria-label="How this demo works"><CircleHelp size={19} /></button>
            <div className="avatar" aria-label="Amina's account">AM</div>
          </div>
        </div>
      </header>

      <main className="dashboard-main shell-wide">
        <section className="dashboard-intro">
          <div>
            <p>{viewHeading.eyebrow}</p>
            <h1>{viewHeading.title}</h1>
            <span>{viewHeading.subtitle}</span>
          </div>
          <button className="reset-button" onClick={resetDemo}><RotateCcw size={15} /> Reset demo</button>
        </section>

        {activeView === "overview" && <div className="dashboard-view dashboard-grid" data-view="overview">
          {renderTransactionComposer()}
          <section className="metrics-grid" aria-label="Live business metrics">
            <MetricCard label="Money available" value={formatUgx(state.cash + state.mobileMoney)} note={`${formatUgx(state.cash)} cash`} tone="cream" icon={WalletCards} />
            <MetricCard label="Sales this month" value={formatUgx(state.sales)} note={`${metrics.progress}% of break-even goal`} tone="blue" icon={BarChart3} />
            <MetricCard label="Estimated profit" value={formatUgx(metrics.profit)} note="After stock cost and expenses" tone="navy" icon={ArrowUpRight} />
            <MetricCard label="Customer credit" value={formatUgx(metrics.debtorTotal)} note={`Suppliers owed ${formatUgx(metrics.creditorTotal)}`} tone="rose" icon={Users} />
          </section>

          <section className="goal-card panel">
            <div className="panel-heading panel-heading--compact">
              <div><span className="panel-heading__icon panel-heading__icon--gold"><Target size={18} /></span><div><p>{c.goal}</p><h2>{formatUgx(state.salesGoal)}</h2></div></div>
              <strong>{metrics.progress}%</strong>
            </div>
            <div className="goal-progress"><span style={{ width: `${metrics.progress}%` }} /></div>
            <div className="goal-card__bottom">
              <div><small>Still needed</small><strong>{formatUgx(metrics.shortfall)}</strong></div>
              <div><small>Days remaining</small><strong>{state.daysRemaining}</strong></div>
              <div><small>Daily sales target</small><strong>{formatUgx(metrics.dailyTarget)}</strong></div>
            </div>
          </section>

          <section className="recommendation-card panel">
            <div className="recommendation-card__icon"><Lightbulb size={24} /></div>
            <div><p>{recommendation.category === "stock" ? c.recommendation : "Sales priority"}</p><h2>{recommendation.title}</h2><span>{recommendation.body}</span></div>
            <button onClick={() => selectView(recommendation.destination)}>{recommendation.action} <ArrowRight size={16} /></button>
          </section>
        </div>}

        {activeView === "records" && <div className="dashboard-view records-view" data-view="records">
          {renderTransactionComposer(true)}
          <section className="records-summary" aria-label="Record summary">
            <div><span>Sales recorded</span><strong>{formatUgx(state.sales)}</strong></div>
            <div><span>Business costs</span><strong>{formatUgx(state.expenses + state.purchases)}</strong></div>
            <div><span>Entries in this demo</span><strong>{state.entries.length}</strong></div>
          </section>
          <section className="activity-card activity-card--full panel">
            <div className="records-toolbar">
              <div className="panel-heading panel-heading--compact"><div><span className="panel-heading__icon"><ReceiptText size={18} /></span><div><p>Transaction history</p><h2>Every change, clearly explained</h2></div></div></div>
              <div className="record-filters" aria-label="Filter records">
                {(["all", "sales", "costs", "credit"] as RecordFilter[]).map((filter) => <button key={filter} className={recordFilter === filter ? "is-active" : ""} aria-pressed={recordFilter === filter} onClick={() => setRecordFilter(filter)}>{filter}</button>)}
              </div>
            </div>
            {filteredEntries.length > 0 ? <ActivityFeed entries={filteredEntries} /> : <div className="empty-state"><ReceiptText size={24} /><strong>No matching records yet</strong><span>Record a transaction above or choose another filter.</span></div>}
          </section>
        </div>}

        {activeView === "stock" && <div className="dashboard-view stock-view" data-view="stock">
          <section className="stock-summary-strip" aria-label="Inventory summary">
            <div><span>Products tracked</span><strong>{state.products.length}</strong></div>
            <div><span>Low-stock products</span><strong>{metrics.lowStock.length}</strong></div>
            <div><span>Stock at cost</span><strong>{formatUgx(inventoryValue)}</strong></div>
          </section>
          <section className="stock-card stock-card--full panel">
            <div className="panel-heading panel-heading--compact">
              <div><span className="panel-heading__icon"><Package size={18} /></span><div><p>Stock levels</p><h2>{lowStockNames}</h2></div></div>
              <span className="inventory-date">Updates with every sale and purchase</span>
            </div>
            <StockList products={state.products} />
          </section>
          {recommendation.category === "stock" ? <section className="recommendation-card recommendation-card--wide panel">
            <div className="recommendation-card__icon"><Lightbulb size={24} /></div>
            <div><p>Stock recommendation</p><h2>{recommendation.title}</h2><span>{recommendation.body}</span></div>
            <button onClick={() => selectView("records")}>Record the purchase <ArrowRight size={16} /></button>
          </section> : <section className="stock-healthy-card panel"><span><Check size={19} /></span><div><p>Stock status</p><h2>No restock action is needed right now.</h2><small>All tracked products are above their reorder levels. Keep recording sales so Tunda can watch the shelves.</small></div><button onClick={() => selectView("records")}>Record a sale <ArrowRight size={15} /></button></section>}
        </div>}

        {activeView === "people" && <div className="dashboard-view people-view" data-view="people">
          <section className="people-balance-grid" aria-label="Credit balance summary">
            <article className="balance-hero balance-hero--customer"><span>Customers owe your business</span><strong>{formatUgx(metrics.debtorTotal)}</strong><p>Expected money from {state.debtors.filter((account) => account.balance > 0).length} customer accounts.</p></article>
            <article className="balance-hero balance-hero--supplier"><span>Your business owes suppliers</span><strong>{formatUgx(metrics.creditorTotal)}</strong><p>Outstanding stock purchases to settle with suppliers.</p></article>
          </section>
          <section className="accounts-grid">
            <div className="account-list panel">
              <div className="panel-heading panel-heading--compact"><div><span className="panel-heading__icon"><Users size={18} /></span><div><p>Customers</p><h2>Money to collect</h2></div></div></div>
              <div className="account-rows">{state.debtors.map((account) => <article key={account.name}><span className="account-avatar">{account.name.slice(0, 2).toUpperCase()}</span><div><strong>{account.name}</strong><small>Customer credit</small></div><strong>{formatUgx(account.balance)}</strong></article>)}</div>
            </div>
            <div className="account-list panel">
              <div className="panel-heading panel-heading--compact"><div><span className="panel-heading__icon panel-heading__icon--gold"><Package size={18} /></span><div><p>Suppliers</p><h2>Money to pay</h2></div></div></div>
              <div className="account-rows">{state.creditors.map((account) => <article key={account.name}><span className="account-avatar account-avatar--supplier">{account.name.slice(0, 2).toUpperCase()}</span><div><strong>{account.name}</strong><small>Supplier balance</small></div><strong>{formatUgx(account.balance)}</strong></article>)}</div>
            </div>
          </section>
          <section className="people-guidance panel"><Lightbulb size={22} /><div><strong>Keep credit relationships healthy</strong><p>Follow up politely on customer balances before taking new supplier credit. Tunda keeps both sides visible.</p></div><button onClick={() => selectView("records")}>Record a payment <ArrowRight size={15} /></button></section>
        </div>}
      </main>

      <div className="mobile-record-bar"><button onClick={() => selectView("records")}><Plus size={18} /> Record transaction</button></div>

      {draft && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDraft(null); }}>
        <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <button className="modal-close" onClick={() => setDraft(null)} aria-label="Close"><X size={19} /></button>
          <span className="review-modal__mark"><Sparkles size={22} /></span>
          <p>Tunda understood this</p>
          <h2 id="review-title">{c.review}</h2>
          <div className="review-fields">
            <div><span>Transaction</span><strong>{transactionLabels[draft.kind]}</strong></div>
            {draft.item && <div><span>Item</span><strong>{draft.quantity} × {draft.item}</strong></div>}
            {draft.party && <div><span>Person or supplier</span><strong>{draft.party}</strong></div>}
            <div><span>Payment</span><strong>{draft.paymentMethod.replace("_", " ")}</strong></div>
            <div className="review-fields__amount"><span>Total amount</span><strong>{formatUgx(draft.amount)}</strong></div>
          </div>
          <div className="review-explanation"><Check size={17} /><span>{parseSource === "gemini" ? "Gemini interpreted the wording, and Tunda verified the quantity and total before showing this review." : "Tunda’s verified local calculation checked the quantity and total before showing this review."}</span></div>
          <div className="review-actions"><button className="button button--light" onClick={() => setDraft(null)}>{c.cancel}</button><button className="button button--ink" onClick={confirmTransaction}>{c.confirm} <ArrowRight size={17} /></button></div>
        </section>
      </div>}

      {showHelp && <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowHelp(false); }}>
        <aside className="help-drawer" aria-label="How the demo works">
          <button className="modal-close" onClick={() => setShowHelp(false)} aria-label="Close"><X size={19} /></button>
          <p>Working prototype</p><h2>What happens behind the simple screen</h2>
          <ol>
            <li><span>1</span><div><strong>Language is interpreted</strong><p>Tunda identifies the action, amount, item, person and payment method.</p></div></li>
            <li><span>2</span><div><strong>Records stay connected</strong><p>The same entry updates sales, cash, stock, expenses or credit balances.</p></div></li>
            <li><span>3</span><div><strong>Guidance changes with the business</strong><p>Goals and recommendations respond to the new numbers immediately.</p></div></li>
          </ol>
          <div className="help-drawer__note"><strong>Presentation-ready intelligence</strong><p>Gemini interprets natural English and Luganda when connected. Tunda verifies the arithmetic itself, and a local fallback keeps the core demonstration working if the internet is unavailable.</p></div>
        </aside>
      </div>}

      {feedback && <div className="feedback-toast" role="status"><span><Check size={17} /></span><p>{feedback}</p><button onClick={() => setFeedback("")} aria-label="Dismiss"><X size={16} /></button></div>}
    </div>
  );
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

export default function TundaPrototype() {
  const [entered, setEntered] = useState(false);
  return entered ? <Dashboard onExit={() => setEntered(false)} /> : <Landing onEnter={() => setEntered(true)} />;
}
