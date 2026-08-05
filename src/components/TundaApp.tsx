"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Banknote,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  Home,
  Lightbulb,
  Menu,
  Mic,
  Package,
  PencilLine,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  Upload,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { gsap } from "gsap";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  addProduct,
  applyTransaction,
  AssistantParseResult,
  assistantDraftToTransaction,
  createEmptyWorkspace,
  createSampleWorkspace,
  draftTotal,
  formatUgx,
  getDailySeries,
  getMetrics,
  getRecommendation,
  LEGACY_STORAGE_KEY,
  lineSubtotal,
  localDateKey,
  migrateLegacyWorkspace,
  MoneyAccountKey,
  PaymentMethod,
  paymentLabels,
  Product,
  SavedWorkspaces,
  sanitizeSavedWorkspaces,
  TundaWorkspace,
  TransactionDraft,
  TransactionKind,
  transactionLabels,
  validateDraft,
  WORKSPACE_STORAGE_KEY,
} from "@/lib/tunda-engine";

type View = "home" | "records" | "stock" | "people" | "insights";
type RecordTab = "manual" | "assistant";
const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "records", label: "Records", icon: ReceiptText },
  { id: "stock", label: "Stock", icon: Package },
  { id: "people", label: "People", icon: Users },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

const recordKinds: Array<{ id: TransactionKind; label: string; icon: typeof ShoppingCart }> = [
  { id: "sale", label: "Sale", icon: ShoppingCart },
  { id: "stock_purchase", label: "Stock purchase", icon: Boxes },
  { id: "expense", label: "Expense", icon: ArrowDownRight },
  { id: "customer_payment", label: "Customer payment", icon: ArrowUpRight },
  { id: "supplier_payment", label: "Supplier payment", icon: Building2 },
  { id: "stock_adjustment", label: "Stock adjustment", icon: PencilLine },
];

const paymentMethods: Array<{ id: PaymentMethod; icon: typeof Banknote }> = [
  { id: "cash", icon: Banknote },
  { id: "mobile_money", icon: Smartphone },
  { id: "bank_transfer", icon: Building2 },
  { id: "merchant_code", icon: CreditCard },
  { id: "credit", icon: UserRound },
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeLine(product?: Product, kind: TransactionKind = "sale") {
  const unitPrice = kind === "sale" ? product?.sellingPrice ?? 0 : kind === "stock_purchase" ? product?.averageCost ?? 0 : 0;
  return { id: uid("line"), productId: product?.id, productName: product?.name ?? "", quantity: 1, unitPrice, subtotal: unitPrice };
}

function makeDraft(workspace: TundaWorkspace, kind: TransactionKind = "sale", product?: Product): TransactionDraft {
  const firstProduct = product ?? workspace.products[0];
  const line = makeLine(firstProduct, kind);
  if (kind === "expense") Object.assign(line, { productId: undefined, productName: "", quantity: 1, unitPrice: 0, subtotal: 0 });
  if (kind === "customer_payment") Object.assign(line, { productId: undefined, productName: "Customer payment", quantity: 1, unitPrice: 0, subtotal: 0 });
  if (kind === "supplier_payment") Object.assign(line, { productId: undefined, productName: "Supplier payment", quantity: 1, unitPrice: 0, subtotal: 0 });
  if (kind === "stock_adjustment") Object.assign(line, { productId: firstProduct?.id, productName: firstProduct?.name ?? "", quantity: 1, unitPrice: 0, subtotal: 0 });
  return { kind, lines: [line], paymentMethod: kind === "stock_adjustment" ? undefined : "cash", occurredAt: localDateKey(), notes: "" };
}

function Brand() {
  return (
    <div className="tunda-brand" aria-label="Tunda Business">
      <span className="tunda-brand__mark"><Image src="/TUNDA Favicon.png" alt="" width={36} height={36} priority /></span>
      <span><strong>Tunda</strong><small>Business</small></span>
    </div>
  );
}

function AnimatedMoney({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    if (!ref.current) return;
    const counter = { value: previous.current };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tween = gsap.to(counter, {
      value,
      duration: reduce ? 0 : 0.65,
      ease: "power2.out",
      onUpdate: () => { if (ref.current) ref.current.textContent = formatUgx(counter.value); },
    });
    previous.current = value;
    return () => { tween.kill(); };
  }, [value]);
  return <span ref={ref}>{formatUgx(value)}</span>;
}

function Onboarding({ onChoose, existing }: { onChoose: (workspace: TundaWorkspace) => void; existing?: SavedWorkspaces | null }) {
  const [setup, setSetup] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [cash, setCash] = useState("");
  const [mobile, setMobile] = useState("");
  const [bank, setBank] = useState("");
  const [merchant, setMerchant] = useState("");
  const [goal, setGoal] = useState("1500000");

  function submit(event: FormEvent) {
    event.preventDefault();
    onChoose(createEmptyWorkspace({ businessName, ownerName }, { cash: Number(cash || 0), mobile_money: Number(mobile || 0), bank_transfer: Number(bank || 0), merchant_code: Number(merchant || 0) }, Number(goal || 1_500_000)));
  }

  return (
    <main className="onboarding">
      <div className="onboarding__glow onboarding__glow--one" />
      <div className="onboarding__glow onboarding__glow--two" />
      <section className="onboarding__panel">
        <Brand />
        {!setup ? (
          <>
            <div className="onboarding__heading">
              <span className="eyebrow">Welcome</span>
              <h1>Start with your business.</h1>
              <p>Choose how you want to open Tunda today.</p>
            </div>
            <div className="onboarding__choices">
              <button className="choice-card choice-card--primary" onClick={() => existing?.business ? onChoose(existing.business) : setSetup(true)}>
                <span className="choice-card__icon"><Building2 /></span>
                <span><strong>{existing?.business ? `Open ${existing.business.settings.businessName}` : "Set up my business"}</strong><small>{existing?.business ? "Continue with your saved records, stock, and goals." : "Add your name, opening money, and monthly goal."}</small></span>
                <ChevronRight />
              </button>
              <button className="choice-card" onClick={() => onChoose(existing?.sample ?? createSampleWorkspace())}>
                <span className="choice-card__icon"><Sparkles /></span>
                <span><strong>{existing?.sample ? "Return to the sample shop" : "Explore a sample shop"}</strong><small>Open a ready shop with records, stock, and insights.</small></span>
                <ChevronRight />
              </button>
            </div>
          </>
        ) : (
          <form className="setup-form" onSubmit={submit}>
            <div className="onboarding__heading">
              <button type="button" className="text-button" onClick={() => setSetup(false)}>Back</button>
              <span className="eyebrow">Business setup</span>
              <h1>Make Tunda yours.</h1>
              <p>You can change these details later.</p>
            </div>
            <label>Business name<input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="For example, Amina's Shop" /></label>
            <label>Your name<input required value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Business owner" /></label>
            <div className="form-grid form-grid--two">
              <label>Opening cash (UGX)<input inputMode="numeric" value={cash} onChange={(event) => setCash(event.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
              <label>Opening Mobile Money (UGX)<input inputMode="numeric" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
              <label>Opening bank balance (UGX)<input inputMode="numeric" value={bank} onChange={(event) => setBank(event.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
              <label>Opening merchant-code balance (UGX)<input inputMode="numeric" value={merchant} onChange={(event) => setMerchant(event.target.value.replace(/\D/g, ""))} placeholder="0" /></label>
            </div>
            <label>Monthly sales goal (UGX)<input required inputMode="numeric" value={goal} onChange={(event) => setGoal(event.target.value.replace(/\D/g, ""))} /></label>
            <button className="primary-button" type="submit">Open my business <ArrowRight size={18} /></button>
          </form>
        )}
      </section>
      <aside className="onboarding__visual" aria-label="A preview of Tunda's business view">
        <div className="money-orbit"><span /><span /><span /></div>
        <div className="preview-balance"><small>Money available</small><strong>UGX 2,840,000</strong><em><ArrowUpRight size={14} /> Updated today</em></div>
        <div className="preview-flow"><span>Cash</span><div><i style={{ width: "72%" }} /></div><strong>+ 18%</strong></div>
        <div className="preview-flow"><span>Sales goal</span><div><i style={{ width: "61%" }} /></div><strong>61%</strong></div>
      </aside>
    </main>
  );
}

function MetricCard({ label, value, detail, tone, icon: Icon }: { label: string; value: number; detail: string; tone: string; icon: typeof Wallet }) {
  return (
    <article className={`money-card money-card--${tone}`}>
      <div><span>{label}</span><Icon size={20} /></div>
      <strong><AnimatedMoney value={value} /></strong>
      <small>{detail}</small>
    </article>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {formatUgx(item.value)}</span>)}</div>;
}

function HomeView({ workspace, onView, onRecord }: { workspace: TundaWorkspace; onView: (view: View) => void; onRecord: () => void }) {
  const metrics = getMetrics(workspace);
  const series = getDailySeries(workspace);
  const recommendation = getRecommendation(workspace);
  const lowStockCount = metrics.lowStock.length;
  return (
    <div className="view-stack">
      <section className="page-heading">
        <div><span className="eyebrow">Today&apos;s position</span><h1>{workspace.settings.businessName}</h1><p>Your money, stock, and next move in one clear view.</p></div>
        <button className="primary-button" onClick={onRecord}><Plus size={19} /> Record</button>
      </section>
      <section className="metric-grid">
        <MetricCard label="Money available" value={metrics.moneyAvailable} detail="Across four payment channels" tone="navy" icon={Wallet} />
        <MetricCard label="Sales this month" value={metrics.sales} detail={`${metrics.goalProgress}% of your current goal`} tone="blue" icon={ArrowUpRight} />
        <MetricCard label="Net profit" value={metrics.netProfit} detail="Sales minus stock cost and expenses" tone="green" icon={BarChart3} />
        <MetricCard label="Customer credit" value={metrics.receivables} detail={`${formatUgx(metrics.payables)} owed to suppliers`} tone="warm" icon={Users} />
      </section>
      <section className="dashboard-grid">
        <article className="panel panel--chart dashboard-grid__cashflow">
          <div className="panel-heading"><div><span className="eyebrow">Cash flow</span><h2>Money moving through the business</h2></div><button className="icon-button" onClick={() => onView("insights")} aria-label="Open insights"><ArrowRight /></button></div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2474c6" stopOpacity={0.32} /><stop offset="100%" stopColor="#2474c6" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e6ebf2" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#748097", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#748097", fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="cashFlow" name="Cash flow" stroke="#155eaa" strokeWidth={3} fill="url(#cashFill)" /></AreaChart></ResponsiveContainer>
          </div>
        </article>
        <article className="panel next-move">
          <span className="next-move__icon"><Lightbulb /></span>
          <div><span className="eyebrow">Recommended next move</span><h2>{recommendation.title}</h2><p>{recommendation.body}</p></div>
          <button className="text-link" onClick={() => onView(recommendation.destination)}>{recommendation.action} <ArrowRight size={16} /></button>
        </article>
        <article className="panel goal-panel">
          <div className="panel-heading"><div><span className="eyebrow">{metrics.estimatedBreakEven ? "Estimated break-even" : "Monthly sales goal"}</span><h2>{formatUgx(metrics.target)}</h2></div><strong>{metrics.goalProgress}%</strong></div>
          <div className="goal-track"><span style={{ width: `${metrics.goalProgress}%` }} /></div>
          <div className="goal-panel__foot"><span><small>Sales recorded</small><strong>{formatUgx(metrics.sales)}</strong></span><span><small>Still needed</small><strong>{formatUgx(Math.max(0, metrics.target - metrics.sales))}</strong></span></div>
        </article>
        <article className="panel stock-pulse">
          <div className="panel-heading"><div><span className="eyebrow">Stock health</span><h2>{!workspace.products.length ? "No products added yet" : lowStockCount ? `${lowStockCount} item${lowStockCount === 1 ? " needs" : "s need"} attention` : "Stock levels are healthy"}</h2></div><button className="icon-button" onClick={() => onView("stock")} aria-label="Open stock"><ArrowRight /></button></div>
          <div className="stock-mini-list">{workspace.products.slice(0, 4).map((product) => { const percent = Math.min(100, Math.round((product.quantity / Math.max(1, product.lowStockLevel * 2)) * 100)); return <div key={product.id}><span><strong>{product.name}</strong><small>{product.quantity} {product.unit}</small></span><div><i className={product.quantity <= product.lowStockLevel ? "is-low" : ""} style={{ width: `${percent}%` }} /></div></div>; })}</div>
        </article>
      </section>
    </div>
  );
}

function RecordsView({ workspace, onRecord }: { workspace: TundaWorkspace; onRecord: () => void }) {
  const [filter, setFilter] = useState<"all" | TransactionKind>("all");
  const [query, setQuery] = useState("");
  const entries = workspace.transactions.filter((entry) => (filter === "all" || entry.kind === filter) && `${entry.notes} ${entry.party ?? ""} ${entry.lines.map((line) => line.productName).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="view-stack">
      <section className="page-heading"><div><span className="eyebrow">Records</span><h1>Every transaction, clearly organised.</h1><p>Search, review, and understand every movement.</p></div><button className="primary-button" onClick={onRecord}><Plus size={19} /> Record</button></section>
      <section className="panel records-panel">
        <div className="records-toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" /></label><div className="filter-tabs">{(["all", "sale", "stock_purchase", "expense", "customer_payment", "supplier_payment"] as const).map((value) => <button key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : transactionLabels[value]}</button>)}</div></div>
        <div className="record-list">{entries.length ? entries.map((entry) => { const incoming = ["sale", "customer_payment"].includes(entry.kind); return <article key={entry.id}><span className={`record-icon record-icon--${incoming ? "in" : entry.kind === "stock_adjustment" ? "neutral" : "out"}`}>{incoming ? <ArrowUpRight /> : entry.kind === "stock_adjustment" ? <PencilLine /> : <ArrowDownRight />}</span><div className="record-main"><span><strong>{transactionLabels[entry.kind]}</strong><small>{new Date(entry.occurredAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</small></span><p>{entry.notes || entry.lines.map((line) => `${line.quantity} ${line.productName}`).join(", ")}{entry.party ? ` · ${entry.party}` : ""}</p></div><div className={`record-value ${incoming ? "is-in" : ""}`}><strong>{entry.kind === "stock_adjustment" ? `${entry.lines.reduce((sum, line) => sum + line.quantity, 0) > 0 ? "+" : ""}${entry.lines.reduce((sum, line) => sum + line.quantity, 0)} units` : `${incoming ? "+" : "-"}${formatUgx(entry.total)}`}</strong><small>{entry.paymentMethod ? paymentLabels[entry.paymentMethod] : "Stock only"}</small></div></article>; }) : <EmptyState icon={ReceiptText} title="No records found" body="Change your filters or record a transaction." action="Record a transaction" onAction={onRecord} />}</div>
      </section>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action, onAction }: { icon: typeof ReceiptText; title: string; body: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span><Icon /></span><h3>{title}</h3><p>{body}</p>{action && onAction ? <button className="secondary-button" onClick={onAction}>{action}</button> : null}</div>;
}

function StockView({ workspace, onAdd, onRestock, onAdjust }: { workspace: TundaWorkspace; onAdd: () => void; onRestock: (product: Product) => void; onAdjust: (product: Product) => void }) {
  return (
    <div className="view-stack">
      <section className="page-heading"><div><span className="eyebrow">Stock</span><h1>Know what is ready to sell.</h1><p>Prices, quantities, and low-stock warnings stay together.</p></div><button className="primary-button" onClick={onAdd}><Plus size={19} /> Add product</button></section>
      <section className="stock-grid">{workspace.products.length ? workspace.products.map((product) => { const low = product.quantity <= product.lowStockLevel; const value = product.quantity * product.averageCost; return <article className={`product-card ${low ? "is-low" : ""}`} key={product.id}><div className="product-card__top"><span className="product-symbol">{product.name.slice(0, 2).toUpperCase()}</span><span className={`status-pill ${low ? "is-low" : ""}`}>{low ? "Low stock" : "Healthy"}</span></div><h2>{product.name}</h2><div className="product-quantity"><strong>{product.quantity}</strong><span>{product.unit}</span></div><div className="stock-gauge"><span style={{ width: `${Math.min(100, product.quantity / Math.max(1, product.lowStockLevel * 2) * 100)}%` }} /></div><dl><div><dt>Selling price</dt><dd>{formatUgx(product.sellingPrice)}</dd></div><div><dt>Average cost</dt><dd>{formatUgx(product.averageCost)}</dd></div><div><dt>Stock value</dt><dd>{formatUgx(value)}</dd></div></dl><div className="product-actions"><button className="secondary-button" onClick={() => onRestock(product)}>Restock</button><button className="icon-button" onClick={() => onAdjust(product)} aria-label={`Adjust ${product.name} quantity`}><PencilLine /></button></div></article>; }) : <div className="panel stock-empty"><EmptyState icon={Package} title="Add your first product" body="Set the price, opening quantity, and low-stock level once." action="Add product" onAction={onAdd} /></div>}</section>
    </div>
  );
}

function PeopleView({ workspace, onRecord }: { workspace: TundaWorkspace; onRecord: (kind: TransactionKind) => void }) {
  const metrics = getMetrics(workspace);
  return (
    <div className="view-stack">
      <section className="page-heading"><div><span className="eyebrow">People</span><h1>Know who owes whom.</h1><p>Customer credit and supplier balances remain separate from your cash.</p></div></section>
      <section className="credit-summary"><article><span><ArrowUpRight /></span><div><small>Customers owe you</small><strong>{formatUgx(metrics.receivables)}</strong></div><button onClick={() => onRecord("customer_payment")}>Record payment</button></article><article><span><ArrowDownRight /></span><div><small>You owe suppliers</small><strong>{formatUgx(metrics.payables)}</strong></div><button onClick={() => onRecord("supplier_payment")}>Record payment</button></article></section>
      <section className="panel people-panel"><div className="panel-heading"><div><span className="eyebrow">Balances</span><h2>Customers and suppliers</h2></div></div><div className="people-list">{workspace.contacts.length ? workspace.contacts.map((contact) => <article key={contact.id}><span className="avatar">{contact.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><div><strong>{contact.name}</strong><small>{contact.type === "both" ? "Customer and supplier" : contact.type === "customer" ? "Customer" : "Supplier"}</small></div><div className="person-balances">{contact.receivable > 0 ? <span className="is-in"><small>Owes you</small><strong>{formatUgx(contact.receivable)}</strong></span> : null}{contact.payable > 0 ? <span className="is-out"><small>You owe</small><strong>{formatUgx(contact.payable)}</strong></span> : null}{contact.receivable === 0 && contact.payable === 0 ? <span><small>Balance</small><strong>Settled</strong></span> : null}</div></article>) : <EmptyState icon={Users} title="No credit balances yet" body="People appear here when you record credit or a payment." />}</div></section>
    </div>
  );
}

function InsightsView({ workspace, onGoalChange }: { workspace: TundaWorkspace; onGoalChange: (value: number) => void }) {
  const metrics = getMetrics(workspace);
  const series = getDailySeries(workspace);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goal, setGoal] = useState(String(workspace.goal.monthlyTarget));
  const profitData = [{ name: "Gross profit", value: Math.max(0, metrics.grossProfit), color: "#27836a" }, { name: "Expenses", value: metrics.expenses, color: "#e35d6a" }, { name: "Stock cost", value: metrics.costOfGoods, color: "#e7ad26" }];
  return (
    <div className="view-stack">
      <section className="page-heading"><div><span className="eyebrow">Insights</span><h1>See what your numbers mean.</h1><p>Useful patterns from the records you have saved.</p></div></section>
      <section className="insights-grid">
        <article className="panel panel--chart insights-grid__wide"><div className="panel-heading"><div><span className="eyebrow">Sales and expenses</span><h2>Daily comparison</h2></div></div><div className="chart-wrap chart-wrap--large"><ResponsiveContainer width="100%" height="100%"><BarChart data={series} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e6ebf2" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#748097", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#748097", fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="sales" name="Sales" fill="#155eaa" radius={[6, 6, 0, 0]} /><Bar dataKey="expenses" name="Expenses" fill="#e35d6a" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
        <article className="panel profit-panel"><div><span className="eyebrow">Profit picture</span><h2>{formatUgx(metrics.netProfit)}</h2><p>Net profit after stock cost and operating expenses.</p></div><div className="profit-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={profitData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={3}>{profitData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><span><small>Margin</small><strong>{metrics.sales ? Math.round(metrics.netProfit / metrics.sales * 100) : 0}%</strong></span></div><div className="legend">{profitData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>)}</div></article>
        <article className="panel account-panel"><div className="panel-heading"><div><span className="eyebrow">Money channels</span><h2>Where your money sits</h2></div></div>{(Object.entries(workspace.accounts) as Array<[MoneyAccountKey, number]>).map(([key, value]) => <div className="account-row" key={key}><span>{key === "cash" ? <Banknote /> : key === "mobile_money" ? <Smartphone /> : key === "bank_transfer" ? <Building2 /> : <CreditCard />}<strong>{paymentLabels[key]}</strong></span><strong>{formatUgx(value)}</strong></div>)}</article>
        <article className="panel goal-editor"><span className="goal-editor__icon"><Target /></span><div><span className="eyebrow">Monthly direction</span><h2>{metrics.estimatedBreakEven ? "Estimated break-even" : "Sales goal"}</h2>{editingGoal ? <form onSubmit={(event) => { event.preventDefault(); onGoalChange(Number(goal)); setEditingGoal(false); }}><label>Monthly target (UGX)<input autoFocus inputMode="numeric" value={goal} onChange={(event) => setGoal(event.target.value.replace(/\D/g, ""))} /></label><div><button type="button" className="secondary-button" onClick={() => setEditingGoal(false)}>Cancel</button><button className="primary-button" type="submit">Save goal</button></div></form> : <><strong>{formatUgx(metrics.target)}</strong><p>{metrics.goalProgress}% reached from recorded sales.</p><button className="text-link" onClick={() => setEditingGoal(true)}>Change goal <ArrowRight size={16} /></button></>}</div></article>
      </section>
    </div>
  );
}

function Sheet({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="sheet" role="dialog" aria-modal="true" aria-label={label}><button className="sheet__close" onClick={onClose} aria-label="Close"><X /></button>{children}</section></div>;
}

function RecordSheet({ workspace, initialDraft, onClose, onReview }: { workspace: TundaWorkspace; initialDraft?: TransactionDraft; onClose: () => void; onReview: (draft: TransactionDraft) => void }) {
  const [tab, setTab] = useState<RecordTab>("manual");
  const [draft, setDraft] = useState<TransactionDraft>(initialDraft ?? makeDraft(workspace));
  const [errors, setErrors] = useState<string[]>([]);
  const [assistantText, setAssistantText] = useState("");
  const [assistantResult, setAssistantResult] = useState<AssistantParseResult | null>(null);
  const [assistantError, setAssistantError] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  function changeKind(kind: TransactionKind) {
    setDraft(makeDraft(workspace, kind));
    setErrors([]);
  }

  function updateLine(lineId: string, patch: Partial<TransactionDraft["lines"][number]>) {
    setDraft((current) => ({ ...current, lines: current.lines.map((line) => line.id === lineId ? { ...line, ...patch, subtotal: lineSubtotal({ quantity: patch.quantity ?? line.quantity, unitPrice: patch.unitPrice ?? line.unitPrice }) } : line) }));
  }

  function chooseProduct(lineId: string, productId: string) {
    const product = workspace.products.find((candidate) => candidate.id === productId);
    if (!product) return;
    updateLine(lineId, { productId: product.id, productName: product.name, unitPrice: draft.kind === "sale" ? product.sellingPrice : product.averageCost });
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    const validation = validateDraft(workspace, draft);
    setErrors(validation);
    if (!validation.length) onReview(draft);
  }

  async function interpret() {
    setLoading(true); setAssistantError(""); setAssistantResult(null);
    try {
      const response = await fetch("/api/assistant/transactions/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: assistantText, language: "en", products: workspace.products.map((product) => product.name) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Tunda could not read that entry.");
      setAssistantResult(payload);
      const ready = assistantDraftToTransaction(payload, workspace);
      if (ready) {
        const validation = validateDraft(workspace, ready);
        if (validation.length) setAssistantResult({ ...payload, status: "needs_clarification", questions: validation, missingFields: payload.missingFields ?? [] });
        else onReview(ready);
      }
    } catch (error) { setAssistantError(error instanceof Error ? error.message : "Tunda could not read that entry."); }
    finally { setLoading(false); }
  }

  function startVoice() {
    type SpeechWindow = Window & { webkitSpeechRecognition?: new () => { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; onerror: () => void; start: () => void } };
    const Recognition = (window as SpeechWindow).webkitSpeechRecognition;
    if (!Recognition) { setAssistantError("Voice recording is not available in this browser. Type the transaction instead."); return; }
    const recognition = new Recognition();
    recognition.lang = "en-UG"; recognition.interimResults = false;
    recognition.onresult = (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => setAssistantText(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setAssistantError("Voice recording stopped. Try again or type the transaction."); };
    setListening(true); recognition.start();
  }

  const showItems = ["sale", "stock_purchase", "stock_adjustment"].includes(draft.kind);
  const paymentPartyType = draft.kind === "stock_purchase" || draft.kind === "supplier_payment" || draft.kind === "expense" ? "supplier" : "customer";
  const contacts = workspace.contacts.filter((contact) => contact.type === "both" || contact.type === paymentPartyType);
  return (
    <Sheet onClose={onClose} label="Record a transaction">
      <div className="sheet-heading"><span className="eyebrow">New record</span><h1>What happened?</h1><p>Add the details yourself or tell Tunda in your own words.</p></div>
      <div className="record-tabs"><button className={tab === "manual" ? "is-active" : ""} onClick={() => setTab("manual")}><PencilLine /> Add details</button><button className={tab === "assistant" ? "is-active" : ""} onClick={() => setTab("assistant")}><Sparkles /> Tell Tunda</button></div>
      {tab === "manual" ? (
        <form className="record-form" onSubmit={submitManual}>
          <div className="kind-grid">{recordKinds.map(({ id: kind, label, icon: Icon }) => <button type="button" key={kind} className={draft.kind === kind ? "is-active" : ""} onClick={() => changeKind(kind)}><Icon /><span>{label}</span></button>)}</div>
          {showItems ? <div className="line-items"><div className="form-section-heading"><div><strong>{draft.kind === "stock_adjustment" ? "Stock change" : "Items"}</strong><small>{draft.kind === "stock_adjustment" ? "Use a positive or negative quantity." : "Quantity multiplied by price each."}</small></div>{draft.kind !== "stock_adjustment" ? <button type="button" className="text-link" onClick={() => setDraft((current) => ({ ...current, lines: [...current.lines, makeLine(workspace.products[0], current.kind)] }))}><Plus size={15} /> Add item</button> : null}</div>{draft.lines.map((line, index) => <div className="line-item" key={line.id}><span className="line-number">{index + 1}</span><label>Product<select value={line.productId ?? ""} onChange={(event) => chooseProduct(line.id, event.target.value)}><option value="">Choose product</option>{workspace.products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label><label>Quantity<input inputMode="numeric" type="number" value={line.quantity || ""} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /></label>{draft.kind !== "stock_adjustment" ? <label>Price each<input inputMode="numeric" value={line.unitPrice || ""} onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value.replace(/\D/g, "")) })} /></label> : null}<div className="line-total"><small>{draft.kind === "stock_adjustment" ? "Change" : "Subtotal"}</small><strong>{draft.kind === "stock_adjustment" ? `${line.quantity > 0 ? "+" : ""}${line.quantity}` : formatUgx(line.subtotal)}</strong></div>{draft.lines.length > 1 ? <button type="button" className="remove-line" onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((item) => item.id !== line.id) }))} aria-label="Remove item"><X /></button> : null}</div>)}</div> : <div className="single-amount"><label>{draft.kind === "expense" ? "What was the expense?" : "Payment amount"}{draft.kind === "expense" ? <input value={draft.lines[0].productName} onChange={(event) => updateLine(draft.lines[0].id, { productName: event.target.value })} placeholder="For example, shop rent" /> : null}</label><label>Amount (UGX)<input inputMode="numeric" value={draft.lines[0].unitPrice || ""} onChange={(event) => updateLine(draft.lines[0].id, { unitPrice: Number(event.target.value.replace(/\D/g, "")) })} placeholder="0" /></label></div>}
          {draft.kind !== "stock_adjustment" ? <div className="form-section"><div className="form-section-heading"><div><strong>Payment</strong><small>Choose where the money moved.</small></div></div><div className="payment-grid">{paymentMethods.filter((method) => !["customer_payment", "supplier_payment"].includes(draft.kind) || method.id !== "credit").map(({ id: method, icon: Icon }) => <button type="button" key={method} className={draft.paymentMethod === method ? "is-active" : ""} onClick={() => setDraft((current) => ({ ...current, paymentMethod: method }))}><Icon /><span>{paymentLabels[method]}</span></button>)}</div></div> : null}
          {(draft.paymentMethod === "credit" || ["customer_payment", "supplier_payment"].includes(draft.kind)) ? <label>{paymentPartyType === "supplier" ? "Supplier" : "Customer"}<input list="contact-options" value={draft.party ?? ""} onChange={(event) => setDraft((current) => ({ ...current, party: event.target.value }))} placeholder={`Choose or add a ${paymentPartyType}`} /><datalist id="contact-options">{contacts.map((contact) => <option value={contact.name} key={contact.id} />)}</datalist></label> : null}
          <div className="form-grid form-grid--two"><label>Date<input required type="date" value={draft.occurredAt} onChange={(event) => setDraft((current) => ({ ...current, occurredAt: event.target.value }))} /></label><label>Note <span className="optional">Optional</span><input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Add a short note" /></label></div>
          {errors.length ? <div className="error-box"><CircleAlert /> <div>{errors.map((error) => <p key={error}>{error}</p>)}</div></div> : null}
          <div className="sheet-total"><span>{draft.kind === "stock_adjustment" ? "Quantity change" : "Total"}</span><strong>{draft.kind === "stock_adjustment" ? `${draft.lines.reduce((sum, line) => sum + line.quantity, 0)}` : formatUgx(draftTotal(draft))}</strong></div>
          <button className="primary-button primary-button--wide" type="submit">Review transaction <ArrowRight size={18} /></button>
        </form>
      ) : (
        <div className="assistant-entry"><div className="assistant-prompt"><textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="For example: I bought 5 bottles of soda at UGX 5,000 each in cash" autoFocus /><button className={`voice-button ${listening ? "is-listening" : ""}`} onClick={startVoice} aria-label="Record with voice"><Mic /></button></div><div className="assistant-examples"><span>Try:</span><button onClick={() => setAssistantText("Sold 5 bottles of soda at UGX 2,000 each in cash")}>Sale</button><button onClick={() => setAssistantText("Paid UGX 35,000 for electricity by Mobile Money")}>Expense</button><button onClick={() => setAssistantText("Grace paid UGX 12,000 in cash")}>Payment</button></div>{assistantResult?.status !== "ready" && assistantResult?.questions.length ? <div className="clarification-box"><CircleAlert /><div><strong>I need one more detail</strong>{assistantResult.questions.map((question) => <p key={question}>{question}</p>)}</div></div> : null}{assistantError ? <div className="error-box"><CircleAlert /><p>{assistantError}</p></div> : null}<button className="primary-button primary-button--wide" disabled={!assistantText.trim() || loading} onClick={interpret}>{loading ? "Reading your entry…" : "Review what I entered"} <ArrowRight size={18} /></button><p className="assistant-footnote">You will always review the details before anything is saved.</p></div>
      )}
    </Sheet>
  );
}

function ReviewSheet({ draft, workspace, onBack, onSave }: { draft: TransactionDraft; workspace: TundaWorkspace; onBack: () => void; onSave: () => void }) {
  const total = draftTotal(draft);
  const error = validateDraft(workspace, draft)[0];
  return <Sheet onClose={onBack} label="Review transaction"><div className="review-mark"><Check /></div><div className="sheet-heading"><span className="eyebrow">Review transaction</span><h1>Check these details before saving.</h1></div><div className="review-card"><div><small>Transaction</small><strong>{transactionLabels[draft.kind]}</strong></div>{draft.lines.map((line) => <div key={line.id}><small>{draft.kind === "expense" ? "Description" : "Item"}</small><strong>{line.quantity} × {line.productName}{draft.kind !== "stock_adjustment" ? ` at ${formatUgx(line.unitPrice)} each` : ""}</strong>{draft.kind !== "stock_adjustment" ? <span>{formatUgx(line.subtotal)}</span> : null}</div>)}{draft.paymentMethod ? <div><small>Payment</small><strong>{paymentLabels[draft.paymentMethod]}</strong></div> : null}{draft.party ? <div><small>{draft.kind.includes("supplier") || draft.kind === "stock_purchase" ? "Supplier" : "Customer"}</small><strong>{draft.party}</strong></div> : null}<div className="review-total"><small>{draft.kind === "stock_adjustment" ? "Quantity change" : "Total amount"}</small><strong>{draft.kind === "stock_adjustment" ? draft.lines.reduce((sum, line) => sum + line.quantity, 0) : formatUgx(total)}</strong></div></div>{error ? <div className="error-box"><CircleAlert /><p>{error}</p></div> : null}<div className="review-actions"><button className="secondary-button" onClick={onBack}>Edit details</button><button className="primary-button" disabled={Boolean(error)} onClick={onSave}>Save transaction <ArrowRight size={18} /></button></div></Sheet>;
}

function ProductSheet({ onClose, onSave }: { onClose: () => void; onSave: (product: Omit<Product, "id">) => void }) {
  const [form, setForm] = useState({ name: "", unit: "items", quantity: "", averageCost: "", sellingPrice: "", lowStockLevel: "5" });
  const [error, setError] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); try { onSave({ name: form.name, unit: form.unit, quantity: Number(form.quantity), averageCost: Number(form.averageCost), sellingPrice: Number(form.sellingPrice), lowStockLevel: Number(form.lowStockLevel) }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not add that product."); } }
  return <Sheet onClose={onClose} label="Add product"><div className="sheet-heading"><span className="eyebrow">Stock setup</span><h1>Add a product</h1><p>Set the details Tunda needs to track stock and profit.</p></div><form className="setup-form" onSubmit={submit}><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="For example, Soda" /></label><div className="form-grid form-grid--two"><label>Unit<input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="bottles, kg, pieces" /></label><label>Opening quantity<input required type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><label>Cost price (UGX)<input required inputMode="numeric" value={form.averageCost} onChange={(event) => setForm({ ...form, averageCost: event.target.value.replace(/\D/g, "") })} /></label><label>Selling price (UGX)<input required inputMode="numeric" value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value.replace(/\D/g, "") })} /></label></div><label>Low-stock level<input required type="number" min="0" value={form.lowStockLevel} onChange={(event) => setForm({ ...form, lowStockLevel: event.target.value })} /><small>We will warn you when stock reaches this number.</small></label>{error ? <div className="error-box"><CircleAlert /><p>{error}</p></div> : null}<button className="primary-button primary-button--wide" type="submit">Add product <ArrowRight size={18} /></button></form></Sheet>;
}

function MovementToast({ transaction, onClose }: { transaction: ReturnType<typeof applyTransaction>["transaction"]; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 6500); return () => window.clearTimeout(timer); }, [onClose]);
  return <div className="movement-toast" role="status"><div className="movement-toast__head"><span><Check /></span><div><strong>Transaction saved</strong><small>Everything moved together.</small></div><button onClick={onClose} aria-label="Dismiss"><X /></button></div><div className="movement-list">{transaction.movements.map((movement, index) => <span className={`movement movement--${movement.tone}`} key={`${movement.label}-${index}`}><small>{movement.label}</small><strong>{movement.amount > 0 ? "+" : ""}{movement.label.includes("stock") ? movement.amount : formatUgx(movement.amount)}</strong></span>)}</div></div>;
}

export default function TundaApp() {
  const [saved, setSaved] = useState<SavedWorkspaces | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("home");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordDraft, setRecordDraft] = useState<TransactionDraft | undefined>();
  const [reviewDraft, setReviewDraft] = useState<TransactionDraft | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [movement, setMovement] = useState<ReturnType<typeof applyTransaction>["transaction"] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [choosingWorkspace, setChoosingWorkspace] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const workspace = saved ? saved[saved.active] : undefined;
  useEffect(() => {
    let restored: SavedWorkspaces | null = null;
    try {
      const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored) restored = sanitizeSavedWorkspaces(JSON.parse(stored));
      else {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        const migrated = legacy ? migrateLegacyWorkspace(JSON.parse(legacy)) : null;
        if (migrated) restored = { active: "business", business: migrated };
      }
    } catch { localStorage.removeItem(WORKSPACE_STORAGE_KEY); }
    queueMicrotask(() => { setSaved(restored); setLoaded(true); });
  }, []);

  useEffect(() => { if (loaded && saved) localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(saved)); }, [loaded, saved]);
  useEffect(() => {
    if (!workspace) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    gsap.fromTo(".app-main .view-stack > *", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, stagger: 0.045, ease: "power2.out" });
  }, [view, workspace]);

  function chooseWorkspace(next: TundaWorkspace) {
    setSaved((current) => ({
      ...(current ?? { active: next.mode }),
      active: next.mode,
      [next.mode]: current?.[next.mode] ?? next,
    } as SavedWorkspaces));
    setChoosingWorkspace(false);
  }

  function updateWorkspace(next: TundaWorkspace) {
    setSaved((current) => current ? { ...current, [current.active]: next } : current);
  }

  function openRecord(kind?: TransactionKind, product?: Product) {
    if (!workspace) return;
    setRecordDraft(kind ? makeDraft(workspace, kind, product) : undefined);
    setReviewDraft(null); setRecordOpen(true);
  }

  function saveTransaction() {
    if (!workspace || !reviewDraft) return;
    try {
      const result = applyTransaction(workspace, reviewDraft);
      updateWorkspace(result.workspace); setMovement(result.transaction); setReviewDraft(null); setRecordDraft(undefined); setRecordOpen(false);
    } catch { return; }
  }

  function reviewTransaction(draft: TransactionDraft) {
    setRecordDraft(draft);
    setReviewDraft(draft);
  }

  function exportData() {
    if (!saved) return;
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `tunda-backup-${localDateKey()}.json`; anchor.click(); URL.revokeObjectURL(url); setMenuOpen(false);
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const value = sanitizeSavedWorkspaces(JSON.parse(await file.text()));
      if (!value) throw new Error();
      setSaved(value); setMenuOpen(false);
    } catch { window.alert("This does not look like a valid Tunda backup."); }
  }

  if (!loaded) return <div className="app-loading"><Brand /></div>;
  if (!workspace || choosingWorkspace) return <Onboarding onChoose={chooseWorkspace} existing={saved} />;

  return (
    <div className="tunda-app">
      <header className="app-header"><div className="app-shell app-header__inner"><Brand /><nav className="desktop-nav" aria-label="Main navigation">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "is-active" : ""} onClick={() => setView(id)}><Icon />{label}</button>)}</nav><div className="header-actions"><span className="workspace-chip">{workspace.mode === "sample" ? "Sample shop" : workspace.settings.ownerName}</span><button className="icon-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Business settings"><Settings2 /></button>{menuOpen ? <div className="settings-menu"><strong>{workspace.settings.businessName}</strong><small>Data is saved on this device</small><button onClick={exportData}><Download /> Export backup</button><button onClick={() => importRef.current?.click()}><Upload /> Import backup</button><button onClick={() => { setChoosingWorkspace(true); setMenuOpen(false); }}><Building2 /> Choose another workspace</button></div> : null}<input className="sr-only" ref={importRef} type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} /></div></div></header>
      <main className="app-main app-shell">
        {view === "home" ? <HomeView workspace={workspace} onView={setView} onRecord={() => openRecord()} /> : null}
        {view === "records" ? <RecordsView workspace={workspace} onRecord={() => openRecord()} /> : null}
        {view === "stock" ? <StockView workspace={workspace} onAdd={() => setProductOpen(true)} onRestock={(product) => openRecord("stock_purchase", product)} onAdjust={(product) => openRecord("stock_adjustment", product)} /> : null}
        {view === "people" ? <PeopleView workspace={workspace} onRecord={(kind) => openRecord(kind)} /> : null}
        {view === "insights" ? <InsightsView workspace={workspace} onGoalChange={(value) => updateWorkspace({ ...workspace, goal: { ...workspace.goal, monthlyTarget: value }, updatedAt: new Date().toISOString() })} /> : null}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation"><button className={view === "home" ? "is-active" : ""} onClick={() => setView("home")}><Home /><span>Home</span></button><button className={view === "records" ? "is-active" : ""} onClick={() => setView("records")}><ReceiptText /><span>Records</span></button><button className="mobile-record" onClick={() => openRecord()}><Plus /><span>Record</span></button><button className={view === "stock" ? "is-active" : ""} onClick={() => setView("stock")}><Package /><span>Stock</span></button><button className={["people", "insights"].includes(view) ? "is-active" : ""} onClick={() => setMoreOpen(true)}><Menu /><span>More</span></button></nav>
      {moreOpen ? <div className="mobile-more-backdrop" onClick={() => setMoreOpen(false)}><section className="mobile-more" role="dialog" aria-modal="true" aria-label="More"><div><span className="eyebrow">More</span><h2>Where do you want to go?</h2><button onClick={() => setMoreOpen(false)} aria-label="Close"><X /></button></div><button onClick={() => { setView("people"); setMoreOpen(false); }}><Users /><span><strong>People</strong><small>Customer and supplier balances</small></span><ChevronRight /></button><button onClick={() => { setView("insights"); setMoreOpen(false); }}><BarChart3 /><span><strong>Insights</strong><small>Trends, profit, and your goal</small></span><ChevronRight /></button></section></div> : null}
      {recordOpen && !reviewDraft ? <RecordSheet workspace={workspace} initialDraft={recordDraft} onClose={() => setRecordOpen(false)} onReview={reviewTransaction} /> : null}
      {reviewDraft ? <ReviewSheet draft={reviewDraft} workspace={workspace} onBack={() => setReviewDraft(null)} onSave={saveTransaction} /> : null}
      {productOpen ? <ProductSheet onClose={() => setProductOpen(false)} onSave={(product) => { try { updateWorkspace(addProduct(workspace, product)); setProductOpen(false); } catch (error) { throw error; } }} /> : null}
      {movement ? <MovementToast transaction={movement} onClose={() => setMovement(null)} /> : null}
    </div>
  );
}
