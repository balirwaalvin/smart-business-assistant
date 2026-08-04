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

function Dashboard({ onExit }: { onExit: () => void }) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [state, setState] = useState<BusinessState>(cloneSeed);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<DraftTransaction | null>(null);
  const [parseError, setParseError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isListening, setIsListening] = useState(false);
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
    gsap.from(".dashboard-grid > *", { y: 24, opacity: 0, stagger: 0.055, duration: 0.48, ease: "power3.out", delay: 0.1 });
  }, { scope: dashboardRef });

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(""), 5600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const metrics = useMemo(() => getMetrics(state), [state]);
  const recommendation = useMemo(() => getRecommendation(state), [state]);
  const lowStockNames = metrics.lowStock.map((product) => product.name).join(", ") || "Stock levels are healthy";

  function prepareTransaction(event: FormEvent) {
    event.preventDefault();
    const parsed = parseTransaction(input);
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

  return (
    <div className="app-shell" ref={dashboardRef}>
      <header className="dashboard-header">
        <div className="dashboard-header__inner shell-wide">
          <button className="brand-button" onClick={onExit} aria-label="Return to Tunda welcome page"><Brand /></button>
          <nav className="dashboard-nav" aria-label="Dashboard sections">
            <a className="is-active" href="#overview">Overview</a>
            <a href="#records">Records</a>
            <a href="#stock">Stock</a>
            <a href="#people">People</a>
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

      <main className="dashboard-main shell-wide" id="overview">
        <section className="dashboard-intro">
          <div>
            <p>{c.welcome}, {state.ownerName}</p>
            <h1>Here is how {state.businessName} is doing.</h1>
            <span>{state.location} · Demo business</span>
          </div>
          <button className="reset-button" onClick={resetDemo}><RotateCcw size={15} /> Reset demo</button>
        </section>

        <div className="dashboard-grid">
          <section className="transaction-composer panel" id="records">
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
                <button className="button button--ink" type="submit">Let Tunda organise it <Sparkles size={17} /></button>
              </div>
            </form>
          </section>

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
            <div>
              <p>{c.recommendation}</p>
              <h2>{recommendation.title}</h2>
              <span>{recommendation.body}</span>
            </div>
            <button onClick={() => document.getElementById("stock")?.scrollIntoView({ behavior: "smooth" })}>{recommendation.action} <ArrowRight size={16} /></button>
          </section>

          <section className="stock-card panel" id="stock">
            <div className="panel-heading panel-heading--compact">
              <div><span className="panel-heading__icon"><Package size={18} /></span><div><p>Stock watch</p><h2>{lowStockNames}</h2></div></div>
              <a href="#stock-list">See all</a>
            </div>
            <div className="stock-list" id="stock-list">
              {state.products.map((product) => {
                const percentage = Math.min(100, Math.round((product.quantity / (product.reorderAt * 2.5)) * 100));
                const low = product.quantity <= product.reorderAt;
                return <div className="stock-row" key={product.id}>
                  <div className={`stock-row__symbol ${low ? "is-low" : ""}`}>{product.name.slice(0, 2).toUpperCase()}</div>
                  <div className="stock-row__main"><div><strong>{product.name}</strong><span>{product.quantity} {product.unit}</span></div><div className="stock-bar"><span style={{ width: `${percentage}%` }} /></div></div>
                  <small className={low ? "is-low" : ""}>{low ? "Restock soon" : "Healthy"}</small>
                </div>;
              })}
            </div>
          </section>

          <section className="activity-card panel" id="people">
            <div className="panel-heading panel-heading--compact">
              <div><span className="panel-heading__icon"><ReceiptText size={18} /></span><div><p>Recent activity</p><h2>Every change, clearly explained</h2></div></div>
            </div>
            <div className="activity-list">
              {state.entries.slice(0, 5).map((entry) => {
                const Icon = kindIcons[entry.kind];
                const isIncoming = ["cash_sale", "credit_sale", "customer_payment"].includes(entry.kind);
                return <article key={entry.id}>
                  <span className={`activity-icon activity-icon--${entry.kind}`}><Icon size={17} /></span>
                  <div><strong>{transactionLabels[entry.kind]}</strong><p>{entry.description}</p></div>
                  <div className="activity-amount"><strong className={isIncoming ? "is-positive" : ""}>{isIncoming ? "+" : "-"}{formatUgx(entry.amount)}</strong><small>{relativeTime(entry.createdAt)}</small></div>
                </article>;
              })}
            </div>
          </section>
        </div>
      </main>

      <div className="mobile-record-bar"><button onClick={() => document.getElementById("records")?.scrollIntoView({ behavior: "smooth" })}><Plus size={18} /> Record transaction</button></div>

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
          <div className="review-explanation"><Check size={17} /><span>Saving this will update all affected records together. You can reset the demo at any time.</span></div>
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
          <div className="help-drawer__note"><strong>Presentation-ready mode</strong><p>This prototype uses seeded local data and an offline rule engine, so its core demonstration remains reliable without accounts or cloud access.</p></div>
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
