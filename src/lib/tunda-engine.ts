export const WORKSPACE_VERSION = 2 as const;
export const WORKSPACE_STORAGE_KEY = "tunda-business-v2";
export const LEGACY_STORAGE_KEY = "tunda-prototype-v1";

export type WorkspaceMode = "business" | "sample";
export type TransactionKind =
  | "sale"
  | "stock_purchase"
  | "expense"
  | "customer_payment"
  | "supplier_payment"
  | "stock_adjustment";
export type PaymentMethod = "cash" | "mobile_money" | "bank_transfer" | "merchant_code" | "credit";
export type MoneyAccountKey = Exclude<PaymentMethod, "credit">;
export type ContactType = "customer" | "supplier" | "both";

export type Product = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  averageCost: number;
  sellingPrice: number;
  lowStockLevel: number;
};

export type Contact = {
  id: string;
  name: string;
  type: ContactType;
  receivable: number;
  payable: number;
};

export type TransactionLine = {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type TransactionDraft = {
  kind: TransactionKind;
  lines: TransactionLine[];
  paymentMethod?: PaymentMethod;
  party?: string;
  occurredAt: string;
  notes: string;
};

export type MoneyMovement = {
  label: string;
  amount: number;
  tone: "in" | "out" | "neutral";
};

export type LedgerTransaction = TransactionDraft & {
  id: string;
  total: number;
  costOfGoods: number;
  createdAt: string;
  movements: MoneyMovement[];
};

export type BusinessSettings = {
  businessName: string;
  ownerName: string;
  currency: "UGX";
};

export type SalesGoal = {
  monthlyTarget: number;
  fixedMonthlyCosts?: number;
  contributionMarginPercent?: number;
};

export type TundaWorkspace = {
  version: typeof WORKSPACE_VERSION;
  mode: WorkspaceMode;
  settings: BusinessSettings;
  accounts: Record<MoneyAccountKey, number>;
  products: Product[];
  contacts: Contact[];
  transactions: LedgerTransaction[];
  goal: SalesGoal;
  createdAt: string;
  updatedAt: string;
};

export type AssistantLine = {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  statedTotal?: number;
};

export type AssistantDraft = {
  kind?: TransactionKind;
  lines: AssistantLine[];
  paymentMethod?: PaymentMethod;
  party?: string;
  occurredAt?: string;
  notes?: string;
};

export type AssistantParseResult = {
  status: "ready" | "needs_clarification" | "unsupported";
  draft: AssistantDraft;
  missingFields: string[];
  questions: string[];
};

export type SavedWorkspaces = { active: WorkspaceMode; business?: TundaWorkspace; sample?: TundaWorkspace };

export const transactionLabels: Record<TransactionKind, string> = {
  sale: "Sale",
  stock_purchase: "Stock purchase",
  expense: "Expense",
  customer_payment: "Customer payment",
  supplier_payment: "Supplier payment",
  stock_adjustment: "Stock adjustment",
};

export const paymentLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  merchant_code: "Merchant Code",
  credit: "Credit",
};

const accountLabels: Record<MoneyAccountKey, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank",
  merchant_code: "Merchant Code",
};

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const whole = (value: number) => Math.round(Number.isFinite(value) ? value : 0);

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function formatUgx(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}UGX ${Math.abs(whole(value)).toLocaleString("en-UG")}`;
}

export function lineSubtotal(line: Pick<TransactionLine, "quantity" | "unitPrice">) {
  return whole(line.quantity) * whole(line.unitPrice);
}

export function draftTotal(draft: Pick<TransactionDraft, "lines">) {
  return draft.lines.reduce((total, line) => total + lineSubtotal(line), 0);
}

export function createEmptyWorkspace(settings?: Partial<BusinessSettings>, accounts?: Partial<Record<MoneyAccountKey, number>>, goal = 1_500_000): TundaWorkspace {
  const timestamp = nowIso();
  return {
    version: WORKSPACE_VERSION,
    mode: "business",
    settings: {
      businessName: settings?.businessName?.trim() || "My Business",
      ownerName: settings?.ownerName?.trim() || "Business owner",
      currency: "UGX",
    },
    accounts: {
      cash: whole(accounts?.cash ?? 0),
      mobile_money: whole(accounts?.mobile_money ?? 0),
      bank_transfer: whole(accounts?.bank_transfer ?? 0),
      merchant_code: whole(accounts?.merchant_code ?? 0),
    },
    products: [],
    contacts: [],
    transactions: [],
    goal: { monthlyTarget: whole(goal) },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function sampleLine(productId: string, productName: string, quantity: number, unitPrice: number): TransactionLine {
  return { id: id("line"), productId, productName, quantity, unitPrice, subtotal: quantity * unitPrice };
}

export function createSampleWorkspace(): TundaWorkspace {
  const workspace = createEmptyWorkspace(
    { businessName: "Amina's Corner Shop", ownerName: "Amina" },
    { cash: 480_000, mobile_money: 265_000, bank_transfer: 140_000, merchant_code: 48_000 },
    1_800_000,
  );
  workspace.mode = "sample";
  workspace.products = [
    { id: "soda", name: "Soda", unit: "bottles", quantity: 42, averageCost: 1_000, sellingPrice: 2_000, lowStockLevel: 18 },
    { id: "bread", name: "Bread", unit: "loaves", quantity: 8, averageCost: 2_500, sellingPrice: 3_500, lowStockLevel: 10 },
    { id: "milk", name: "Milk", unit: "packets", quantity: 12, averageCost: 2_500, sellingPrice: 3_500, lowStockLevel: 10 },
    { id: "sugar", name: "Sugar", unit: "kg", quantity: 18, averageCost: 3_800, sellingPrice: 5_000, lowStockLevel: 8 },
    { id: "rice", name: "Rice", unit: "kg", quantity: 25, averageCost: 4_000, sellingPrice: 5_500, lowStockLevel: 10 },
  ];
  workspace.contacts = [
    { id: "grace", name: "Grace", type: "customer", receivable: 24_000, payable: 0 },
    { id: "kato", name: "Kato", type: "customer", receivable: 18_000, payable: 0 },
    { id: "mukwano", name: "Mukwano Wholesalers", type: "supplier", receivable: 0, payable: 120_000 },
  ];
  const day = 24 * 60 * 60 * 1000;
  const sampleDate = (daysAgo: number) => localDateKey(new Date(Date.now() - day * daysAgo));
  const entries: LedgerTransaction[] = [
    {
      id: "sample-sale-1", kind: "sale", lines: [sampleLine("soda", "Soda", 52, 2_000), sampleLine("bread", "Bread", 24, 3_500)],
      paymentMethod: "cash", occurredAt: sampleDate(5), notes: "Shop sales", total: 188_000,
      costOfGoods: 112_000, createdAt: sampleDate(5), movements: [],
    },
    {
      id: "sample-sale-2", kind: "sale", lines: [sampleLine("milk", "Milk", 40, 3_500), sampleLine("rice", "Rice", 30, 5_500)],
      paymentMethod: "mobile_money", occurredAt: sampleDate(4), notes: "Shop sales", total: 305_000,
      costOfGoods: 220_000, createdAt: sampleDate(4), movements: [],
    },
    {
      id: "sample-expense-1", kind: "expense", lines: [sampleLine("", "Rent and utilities", 1, 180_000)],
      paymentMethod: "bank_transfer", occurredAt: sampleDate(3), notes: "Monthly shop costs", total: 180_000,
      costOfGoods: 0, createdAt: sampleDate(3), movements: [],
    },
    {
      id: "sample-sale-3", kind: "sale", lines: [sampleLine("sugar", "Sugar", 48, 5_000), sampleLine("soda", "Soda", 63, 2_000)],
      paymentMethod: "merchant_code", occurredAt: sampleDate(2), notes: "Shop sales", total: 366_000,
      costOfGoods: 245_400, createdAt: sampleDate(2), movements: [],
    },
    {
      id: "sample-sale-4", kind: "sale", lines: [sampleLine("bread", "Bread", 38, 3_500), sampleLine("rice", "Rice", 25, 5_500), sampleLine("milk", "Milk", 31, 3_500)],
      paymentMethod: "cash", occurredAt: sampleDate(1), notes: "Shop sales", total: 379_000,
      costOfGoods: 272_500, createdAt: sampleDate(1), movements: [],
    },
    {
      id: "sample-expense-2", kind: "expense", lines: [sampleLine("", "Transport and packaging", 1, 115_000)],
      paymentMethod: "cash", occurredAt: sampleDate(1), notes: "Operating costs", total: 115_000,
      costOfGoods: 0, createdAt: sampleDate(1), movements: [],
    },
  ];
  workspace.transactions = entries.map((entry) => ({
    ...entry,
    movements: entry.kind === "sale" && entry.paymentMethod && entry.paymentMethod !== "credit"
      ? [{ label: accountLabels[entry.paymentMethod], amount: entry.total, tone: "in" as const }]
      : entry.kind === "expense" && entry.paymentMethod && entry.paymentMethod !== "credit"
        ? [{ label: accountLabels[entry.paymentMethod], amount: -entry.total, tone: "out" as const }]
        : [],
  }));
  return workspace;
}

function normalizeLine(line: TransactionLine): TransactionLine {
  const quantity = whole(line.quantity);
  const unitPrice = whole(line.unitPrice);
  return { ...line, id: line.id || id("line"), quantity, unitPrice, subtotal: quantity * unitPrice };
}

export function validateDraft(workspace: TundaWorkspace, draft: TransactionDraft): string[] {
  const errors: string[] = [];
  if (!isValidDateKey(draft.occurredAt)) errors.push("Choose a valid transaction date.");
  const needsLines = ["sale", "stock_purchase", "expense", "stock_adjustment"].includes(draft.kind);
  if (needsLines && draft.lines.length === 0) errors.push("Add at least one item.");
  for (const line of draft.lines) {
    if (!line.productName.trim()) errors.push("Choose a product or describe the expense.");
    if (!Number.isInteger(line.quantity) || line.quantity === 0 || (draft.kind !== "stock_adjustment" && line.quantity < 0)) errors.push(`Enter a valid quantity for ${line.productName || "the item"}.`);
    if (draft.kind !== "stock_adjustment" && (!Number.isInteger(line.unitPrice) || line.unitPrice <= 0)) errors.push(`Enter a valid price for ${line.productName || "the item"}.`);
  }
  if (draft.kind !== "stock_adjustment" && !draft.paymentMethod) errors.push("Choose how the transaction was paid.");
  if (["customer_payment", "supplier_payment"].includes(draft.kind) && draft.paymentMethod === "credit") errors.push("Choose the money account used for this payment.");
  if (draft.paymentMethod === "credit" && !draft.party?.trim()) errors.push("Choose or add the customer or supplier for a credit transaction.");
  if (["customer_payment", "supplier_payment"].includes(draft.kind) && !draft.party?.trim()) errors.push("Choose the person or business for this payment.");
  if (["customer_payment", "supplier_payment"].includes(draft.kind) && draftTotal(draft) <= 0) errors.push("Enter the payment amount.");

  if (draft.kind === "sale") {
    const requestedByProduct = new Map<string, { product: Product; quantity: number }>();
    for (const line of draft.lines) {
      const product = workspace.products.find((candidate) => candidate.id === line.productId || candidate.name.toLowerCase() === line.productName.toLowerCase());
      if (!product) errors.push(`${line.productName} is not in stock yet. Add it as a product first.`);
      else {
        const current = requestedByProduct.get(product.id);
        requestedByProduct.set(product.id, { product, quantity: (current?.quantity ?? 0) + line.quantity });
      }
    }
    for (const { product, quantity } of requestedByProduct.values()) {
      if (quantity > product.quantity) errors.push(`Only ${product.quantity} ${product.unit} of ${product.name} are available. Restock or reduce the sale quantity.`);
    }
  }
  if (["stock_purchase", "stock_adjustment"].includes(draft.kind)) {
    for (const line of draft.lines) {
      const product = workspace.products.find((candidate) => candidate.id === line.productId || candidate.name.toLowerCase() === line.productName.toLowerCase());
      if (!product) errors.push(`${line.productName} is not set up yet. Add the product with its unit and prices first.`);
      else if (draft.kind === "stock_adjustment" && product.quantity + line.quantity < 0) errors.push(`This adjustment would take ${product.name} below zero.`);
    }
  }

  const contact = draft.party ? workspace.contacts.find((candidate) => candidate.name.toLowerCase() === draft.party?.toLowerCase()) : undefined;
  const total = draftTotal(draft);
  if (draft.kind === "customer_payment" && !contact) errors.push(`${draft.party || "This customer"} has no customer credit balance to pay.`);
  if (draft.kind === "supplier_payment" && !contact) errors.push(`There is no supplier balance recorded for ${draft.party || "this supplier"}.`);
  if (draft.kind === "customer_payment" && contact && total > contact.receivable) errors.push(`${contact.name} owes ${formatUgx(contact.receivable)}. Record no more than that amount.`);
  if (draft.kind === "supplier_payment" && contact && total > contact.payable) errors.push(`You owe ${contact.name} ${formatUgx(contact.payable)}. Record no more than that amount.`);
  return [...new Set(errors)];
}

function updateContact(workspace: TundaWorkspace, party: string, receivableChange: number, payableChange: number) {
  const existing = workspace.contacts.find((contact) => contact.name.toLowerCase() === party.toLowerCase());
  if (existing) {
    existing.receivable = Math.max(0, existing.receivable + receivableChange);
    existing.payable = Math.max(0, existing.payable + payableChange);
    if (receivableChange && existing.type === "supplier") existing.type = "both";
    if (payableChange && existing.type === "customer") existing.type = "both";
    return;
  }
  workspace.contacts.push({ id: id("contact"), name: party, type: receivableChange ? "customer" : "supplier", receivable: Math.max(0, receivableChange), payable: Math.max(0, payableChange) });
}

export function applyTransaction(workspace: TundaWorkspace, rawDraft: TransactionDraft): { workspace: TundaWorkspace; transaction: LedgerTransaction } {
  const draft = { ...rawDraft, lines: rawDraft.lines.map(normalizeLine) };
  const errors = validateDraft(workspace, draft);
  if (errors.length) throw new Error(errors[0]);
  const next = structuredClone(workspace);
  const total = draftTotal(draft);
  let costOfGoods = 0;
  const movements: MoneyMovement[] = [];
  const account = draft.paymentMethod && draft.paymentMethod !== "credit" ? draft.paymentMethod : undefined;

  if (draft.kind === "sale") {
    for (const line of draft.lines) {
      const product = next.products.find((candidate) => candidate.id === line.productId || candidate.name.toLowerCase() === line.productName.toLowerCase())!;
      product.quantity -= line.quantity;
      costOfGoods += product.averageCost * line.quantity;
      movements.push({ label: `${product.name} stock`, amount: -line.quantity, tone: "out" });
    }
    if (account) {
      next.accounts[account] += total;
      movements.unshift({ label: accountLabels[account], amount: total, tone: "in" });
    } else {
      updateContact(next, draft.party!, total, 0);
      movements.unshift({ label: `${draft.party} customer credit`, amount: total, tone: "neutral" });
    }
    movements.push({ label: "Gross profit", amount: total - costOfGoods, tone: total - costOfGoods >= 0 ? "in" : "out" });
  }

  if (draft.kind === "stock_purchase") {
    for (const line of draft.lines) {
      const product = next.products.find((candidate) => candidate.id === line.productId || candidate.name.toLowerCase() === line.productName.toLowerCase())!;
      const previousValue = product.quantity * product.averageCost;
      const newQuantity = product.quantity + line.quantity;
      product.averageCost = newQuantity > 0 ? whole((previousValue + line.subtotal) / newQuantity) : 0;
      product.quantity = newQuantity;
      movements.push({ label: `${product.name} stock`, amount: line.quantity, tone: "in" });
    }
    if (account) {
      next.accounts[account] -= total;
      movements.unshift({ label: accountLabels[account], amount: -total, tone: "out" });
    } else {
      updateContact(next, draft.party!, 0, total);
      movements.unshift({ label: `${draft.party} supplier balance`, amount: total, tone: "neutral" });
    }
  }

  if (draft.kind === "expense") {
    if (account) {
      next.accounts[account] -= total;
      movements.push({ label: accountLabels[account], amount: -total, tone: "out" });
    } else {
      updateContact(next, draft.party!, 0, total);
      movements.push({ label: `${draft.party} supplier balance`, amount: total, tone: "neutral" });
    }
    movements.push({ label: "Expense", amount: -total, tone: "out" });
  }

  if (draft.kind === "customer_payment") {
    next.accounts[account!] += total;
    updateContact(next, draft.party!, -total, 0);
    movements.push({ label: accountLabels[account!], amount: total, tone: "in" }, { label: `${draft.party} credit`, amount: -total, tone: "neutral" });
  }

  if (draft.kind === "supplier_payment") {
    next.accounts[account!] -= total;
    updateContact(next, draft.party!, 0, -total);
    movements.push({ label: accountLabels[account!], amount: -total, tone: "out" }, { label: `${draft.party} balance`, amount: -total, tone: "neutral" });
  }

  if (draft.kind === "stock_adjustment") {
    for (const line of draft.lines) {
      const product = next.products.find((candidate) => candidate.id === line.productId || candidate.name.toLowerCase() === line.productName.toLowerCase());
      if (!product) throw new Error(`${line.productName} is not in stock yet.`);
      if (product.quantity + line.quantity < 0) throw new Error(`This adjustment would take ${product.name} below zero.`);
      product.quantity += line.quantity;
      movements.push({ label: `${product.name} stock`, amount: line.quantity, tone: line.quantity > 0 ? "in" : "out" });
    }
  }

  const timestamp = nowIso();
  const transaction: LedgerTransaction = { ...draft, id: id("transaction"), total, costOfGoods: whole(costOfGoods), createdAt: timestamp, movements };
  next.transactions.unshift(transaction);
  next.updatedAt = timestamp;
  return { workspace: next, transaction };
}

export function addProduct(workspace: TundaWorkspace, input: Omit<Product, "id">): TundaWorkspace {
  if (!input.name.trim()) throw new Error("Enter a product name.");
  if (workspace.products.some((product) => product.name.toLowerCase() === input.name.trim().toLowerCase())) throw new Error("That product already exists.");
  const next = structuredClone(workspace);
  next.products.push({ ...input, id: id("product"), name: input.name.trim(), quantity: whole(input.quantity), averageCost: whole(input.averageCost), sellingPrice: whole(input.sellingPrice), lowStockLevel: whole(input.lowStockLevel) });
  next.updatedAt = nowIso();
  return next;
}

export function getMetrics(workspace: TundaWorkspace) {
  const currentMonth = localDateKey().slice(0, 7);
  const monthlyTransactions = workspace.transactions.filter((entry) => entry.occurredAt.slice(0, 7) === currentMonth);
  const sales = monthlyTransactions.filter((entry) => entry.kind === "sale").reduce((sum, entry) => sum + entry.total, 0);
  const costOfGoods = monthlyTransactions.filter((entry) => entry.kind === "sale").reduce((sum, entry) => sum + entry.costOfGoods, 0);
  const expenses = monthlyTransactions.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.total, 0);
  const grossProfit = sales - costOfGoods;
  const netProfit = grossProfit - expenses;
  const moneyAvailable = Object.values(workspace.accounts).reduce((sum, value) => sum + value, 0);
  const receivables = workspace.contacts.reduce((sum, contact) => sum + contact.receivable, 0);
  const payables = workspace.contacts.reduce((sum, contact) => sum + contact.payable, 0);
  const lowStock = workspace.products.filter((product) => product.quantity <= product.lowStockLevel);
  const estimatedBreakEven = workspace.goal.fixedMonthlyCosts && workspace.goal.contributionMarginPercent
    ? whole(workspace.goal.fixedMonthlyCosts / (workspace.goal.contributionMarginPercent / 100))
    : undefined;
  const target = estimatedBreakEven ?? workspace.goal.monthlyTarget;
  const goalProgress = target > 0 ? Math.min(100, whole((sales / target) * 100)) : 0;
  return { sales, costOfGoods, expenses, grossProfit, netProfit, moneyAvailable, receivables, payables, lowStock, target, goalProgress, estimatedBreakEven };
}

export function getDailySeries(workspace: TundaWorkspace, days = 7) {
  const result = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return { key: localDateKey(date), label: date.toLocaleDateString("en-UG", { weekday: "short" }), sales: 0, expenses: 0, cashFlow: 0 };
  });
  const byKey = new Map(result.map((day) => [day.key, day]));
  for (const entry of workspace.transactions) {
    const day = byKey.get(entry.occurredAt.slice(0, 10));
    if (!day) continue;
    if (entry.kind === "sale") day.sales += entry.total;
    if (entry.kind === "expense") day.expenses += entry.total;
    day.cashFlow += entry.movements.filter((movement) => ["Cash", "Mobile Money", "Bank", "Merchant Code"].includes(movement.label)).reduce((sum, movement) => sum + movement.amount, 0);
  }
  return result;
}

export function getRecommendation(workspace: TundaWorkspace) {
  const metrics = getMetrics(workspace);
  const urgent = [...metrics.lowStock].sort((a, b) => a.quantity / Math.max(1, a.lowStockLevel) - b.quantity / Math.max(1, b.lowStockLevel))[0];
  if (urgent) return { destination: "stock" as const, title: `Restock ${urgent.name}`, body: `${urgent.quantity} ${urgent.unit} remain. Keep at least ${urgent.lowStockLevel} available.`, action: "Open stock" };
  const remaining = Math.max(0, metrics.target - metrics.sales);
  return { destination: "records" as const, title: remaining ? `Close the ${formatUgx(remaining)} sales gap` : "Keep this sales rhythm", body: remaining ? "Record every sale so the daily target stays accurate." : "Sales have reached this month's target.", action: "Record a sale" };
}

function parseNumber(value: string) {
  const compact = value.toLowerCase().replaceAll(",", "").replace(/\s+/g, "");
  const multiplier = compact.endsWith("k") ? 1_000 : 1;
  const parsed = Number(compact.replace(/k$/, ""));
  return Number.isFinite(parsed) ? whole(parsed * multiplier) : undefined;
}

function detectKind(text: string): TransactionKind | undefined {
  const lower = text.toLowerCase();
  if (/(stock adjustment|adjust(?:ed)? stock|add(?:ed)? .*\bto stock|increase(?:d)? .*stock|remove(?:d)? .*\bfrom stock|reduce(?:d)? .*stock|damaged|expired|lost stock)/.test(lower)) return "stock_adjustment";
  if (/(customer|client|grace|kato).*(paid|settled)|paid.*(debt|credit)|asasudde.*(bbanja|ebbanja)/.test(lower)) return "customer_payment";
  if (/(paid supplier|supplier payment|paid.*wholesaler|sasudde.*supplier)/.test(lower)) return "supplier_payment";
  if (/(bought|restocked|purchased|received stock|naguze|nguze|tuguze|twaguze)/.test(lower)) return "stock_purchase";
  if (/(sold|sale|ntunze|tutunze)/.test(lower)) return "sale";
  if (/(paid|spent|rent|electricity|transport|wages|expense|nsasudde|tusasudde)/.test(lower)) return "expense";
  return undefined;
}

function detectPayment(text: string): PaymentMethod | undefined {
  const lower = text.toLowerCase();
  if (/(on credit|pay later|owes|bbanja|ebbanja)/.test(lower)) return "credit";
  if (/(mobile money|momo|airtel money|mtn money)/.test(lower)) return "mobile_money";
  if (/(bank|transfer)/.test(lower)) return "bank_transfer";
  if (/(merchant|code|paycode)/.test(lower)) return "merchant_code";
  if (/(cash|nkalu)/.test(lower)) return "cash";
  return undefined;
}

function detectParty(text: string) {
  const match = text.match(/(?:to|from)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/);
  const leading = text.match(/^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})\s+(?:paid|settled)\b/);
  return (match?.[1] ?? leading?.[1])?.replace(/\s+(?:on|in|for|at)$/i, "").trim();
}

export function parseTransactionText(input: string, productNames: string[] = []): AssistantParseResult {
  const text = input.trim();
  if (!text) return { status: "needs_clarification", draft: { lines: [] }, missingFields: ["transaction"], questions: ["What happened in your business?"] };
  const kind = detectKind(text);
  if (!kind) return { status: "unsupported", draft: { lines: [] }, missingFields: [], questions: ["Describe a sale, purchase, expense, payment, or stock change."] };
  const paymentMethod = kind === "stock_adjustment" ? undefined : detectPayment(text);
  const quantityMatch = text.match(/\b(\d[\d,]*)\s*(?:x\s*)?(?:bottles?|sodas?|loaves?|packets?|pieces?|items?|units?|kgs?|kilograms?|tomatoes?|[A-Za-z]+)/i);
  const itemTransaction = ["sale", "stock_purchase", "stock_adjustment"].includes(kind);
  const parsedQuantity = itemTransaction && quantityMatch ? parseNumber(quantityMatch[1]) : undefined;
  const adjustmentDecrease = kind === "stock_adjustment" && /(remove(?:d)?|reduce(?:d)?|decrease(?:d)?|damaged|expired|lost|missing)/i.test(text);
  const quantity = parsedQuantity === undefined ? (itemTransaction ? undefined : 1) : adjustmentDecrease ? -parsedQuantity : parsedQuantity;
  const knownProduct = productNames.find((name) => text.toLowerCase().includes(name.toLowerCase()));
  const genericProduct = quantityMatch?.[0].replace(/^\d[\d,]*\s*(?:x\s*)?/i, "").trim().replace(/\b(?:of)\b/i, "").trim();
  const productName = itemTransaction ? knownProduct ?? (genericProduct ? genericProduct.replace(/s$/i, "") : undefined) : kind === "expense" ? "Expense" : transactionLabels[kind];
  const eachMatch = text.match(/buli\s+emu\s+(?:ku|kwa)\s*(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?\s*k?)/i)
    ?? text.match(/(?:at|@|for|ku)\s*(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?\s*k?)\s*(?:each|per\s+\w+|buli\s+emu)/i)
    ?? text.match(/(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?\s*k?)\s*(?:each|per\s+\w+|buli\s+emu)/i);
  const totalMatch = text.match(/(?:total(?:ling|ing)?|altogether)\s*(?:is|was|of|ugx)?\s*(\d[\d,]*(?:\.\d+)?\s*k?)/i)
    ?? text.match(/(?:for|ku)\s*(?:a\s+total\s+of\s*)?(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?\s*k?)\s*(?:total|altogether)/i);
  const looseForMatch = text.match(/(?:for|ku)\s*(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?\s*k?)/i);
  const directAmountMatch = text.match(/(?:paid|spent)\s*(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?\s*k?)/i);
  const explicitTotalAmount = totalMatch ? parseNumber(totalMatch[1]) : undefined;
  const unevenExplicitTotal = Boolean(explicitTotalAmount && quantity && explicitTotalAmount % quantity !== 0);
  const unitPrice = eachMatch ? parseNumber(eachMatch[1]) : totalMatch && quantity && !unevenExplicitTotal ? whole((explicitTotalAmount ?? 0) / quantity) : directAmountMatch && !itemTransaction ? parseNumber(directAmountMatch[1]) : undefined;
  const ambiguousTotal = Boolean(itemTransaction && looseForMatch && quantity && !eachMatch && !totalMatch);
  const party = detectParty(text);
  const lines: AssistantLine[] = [{ productName, quantity, unitPrice }];
  const missingFields: string[] = [];
  const questions: string[] = [];

  if (["sale", "stock_purchase"].includes(kind)) {
    if (!productName) { missingFields.push("lines.0.productName"); questions.push("Which product was involved?"); }
    if (!quantity) { missingFields.push("lines.0.quantity"); questions.push("How many were sold or bought?"); }
    if (ambiguousTotal) {
      missingFields.push("lines.0.unitPrice");
      const amount = parseNumber(looseForMatch![1]);
      questions.push(`Is ${formatUgx(amount ?? 0)} the price for each item or the total for all ${quantity}?`);
    } else if (unevenExplicitTotal) {
      missingFields.push("lines.0.unitPrice");
      questions.push(`${formatUgx(explicitTotalAmount ?? 0)} does not divide evenly across ${quantity} items. What was the price for each item?`);
    } else if (!unitPrice) { missingFields.push("lines.0.unitPrice"); questions.push("What was the price for each item?"); }
  } else if (kind === "stock_adjustment") {
    if (!productName) { missingFields.push("lines.0.productName"); questions.push("Which product should be adjusted?"); }
    if (!quantity) { missingFields.push("lines.0.quantity"); questions.push("How many units should be added or removed?"); }
  } else if (["expense", "customer_payment", "supplier_payment"].includes(kind) && !unitPrice) {
    missingFields.push("lines.0.unitPrice"); questions.push("What was the total amount?");
  }
  if (kind !== "stock_adjustment" && !paymentMethod) { missingFields.push("paymentMethod"); questions.push("How was it paid: cash, Mobile Money, bank transfer, merchant code, or credit?"); }
  if ((paymentMethod === "credit" || ["customer_payment", "supplier_payment"].includes(kind)) && !party) {
    missingFields.push("party"); questions.push(kind === "stock_purchase" || kind === "supplier_payment" ? "Which supplier was this for?" : "Which customer was this for?");
  }

  return {
    status: missingFields.length ? "needs_clarification" : "ready",
    draft: { kind, lines, paymentMethod, party, occurredAt: localDateKey(), notes: text },
    missingFields,
    questions,
  };
}

export function assistantDraftToTransaction(result: AssistantParseResult, workspace: TundaWorkspace): TransactionDraft | null {
  if (result.status !== "ready" || !result.draft.kind || (result.draft.kind !== "stock_adjustment" && !result.draft.paymentMethod)) return null;
  const lines = result.draft.lines.map((line) => {
    const product = workspace.products.find((candidate) => candidate.name.toLowerCase() === line.productName?.toLowerCase());
    const quantity = whole(line.quantity ?? 0);
    const unitPrice = whole(line.unitPrice ?? 0);
    return { id: id("line"), productId: product?.id, productName: product?.name ?? line.productName ?? "", quantity, unitPrice, subtotal: quantity * unitPrice };
  });
  return { kind: result.draft.kind, lines, paymentMethod: result.draft.paymentMethod, party: result.draft.party, occurredAt: result.draft.occurredAt ?? localDateKey(), notes: result.draft.notes ?? "" };
}

export function migrateLegacyWorkspace(value: unknown): TundaWorkspace | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version === WORKSPACE_VERSION && candidate.settings && candidate.accounts) return sanitizeV2Workspace(candidate);
  if (!Array.isArray(candidate.products) || typeof candidate.businessName !== "string") return null;
  const workspace = createEmptyWorkspace(
    { businessName: candidate.businessName, ownerName: String(candidate.ownerName ?? "Business owner") },
    { cash: Number(candidate.cash ?? 0), mobile_money: Number(candidate.mobileMoney ?? 0) },
    Number(candidate.salesGoal ?? 1_500_000),
  );
  workspace.products = (candidate.products as Array<Record<string, unknown>>).map((product) => ({
    id: String(product.id ?? id("product")), name: String(product.name ?? "Product"), unit: String(product.unit ?? "items"),
    quantity: whole(Number(product.quantity ?? 0)), averageCost: whole(Number(product.costPrice ?? 0)), sellingPrice: whole(Number(product.sellingPrice ?? 0)), lowStockLevel: whole(Number(product.reorderAt ?? 5)),
  }));
  const debtors = Array.isArray(candidate.debtors) ? candidate.debtors as Array<Record<string, unknown>> : [];
  const creditors = Array.isArray(candidate.creditors) ? candidate.creditors as Array<Record<string, unknown>> : [];
  workspace.contacts = [
    ...debtors.map((contact) => ({ id: id("contact"), name: String(contact.name ?? "Customer"), type: "customer" as const, receivable: whole(Number(contact.balance ?? 0)), payable: 0 })),
    ...creditors.map((contact) => ({ id: id("contact"), name: String(contact.name ?? "Supplier"), type: "supplier" as const, receivable: 0, payable: whole(Number(contact.balance ?? 0)) })),
  ];
  const legacyEntries = Array.isArray(candidate.entries) ? candidate.entries as Array<Record<string, unknown>> : [];
  const migratedEntries: LedgerTransaction[] = legacyEntries.map((entry) => {
    const legacyKind = String(entry.kind ?? "expense");
    const kind: TransactionKind = legacyKind === "cash_sale" || legacyKind === "credit_sale" ? "sale" : legacyKind === "purchase" ? "stock_purchase" : legacyKind === "customer_payment" ? "customer_payment" : "expense";
    const amount = whole(Number(entry.amount ?? 0));
    const quantity = ["sale", "stock_purchase"].includes(kind) ? Math.max(1, whole(Number(entry.quantity ?? 1))) : 1;
    const productName = String(entry.item ?? (kind === "expense" ? "Imported expense" : transactionLabels[kind]));
    const unitPrice = quantity > 0 && amount % quantity === 0 ? amount / quantity : amount;
    const storedQuantity = quantity > 0 && amount % quantity === 0 ? quantity : 1;
    const product = workspace.products.find((item) => item.name.toLowerCase() === productName.toLowerCase());
    const payment = String(entry.paymentMethod ?? (legacyKind === "credit_sale" ? "credit" : "cash"));
    const paymentMethod: PaymentMethod = payment === "mobile_money" || payment === "credit" ? payment : "cash";
    const rawCreatedAt = String(entry.createdAt ?? workspace.createdAt);
    const createdAt = isValidDateKey(rawCreatedAt.slice(0, 10)) ? rawCreatedAt : workspace.createdAt;
    return {
      id: String(entry.id ?? id("imported")), kind,
      lines: [{ id: id("line"), productId: product?.id, productName, quantity: storedQuantity, unitPrice, subtotal: amount }],
      paymentMethod, party: entry.party ? String(entry.party) : undefined, occurredAt: createdAt, notes: String(entry.description ?? "Imported record"),
      total: amount, costOfGoods: kind === "sale" ? whole((product?.averageCost ?? 0) * storedQuantity) : 0, createdAt, movements: [],
    };
  });
  const migratedSales = migratedEntries.filter((entry) => entry.kind === "sale").reduce((sum, entry) => sum + entry.total, 0);
  const migratedExpenses = migratedEntries.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.total, 0);
  const migratedPurchases = migratedEntries.filter((entry) => entry.kind === "stock_purchase").reduce((sum, entry) => sum + entry.total, 0);
  const historical = (kind: TransactionKind, amount: number, costOfGoods = 0): LedgerTransaction => ({
    id: id("imported-summary"), kind,
    lines: [{ id: id("line"), productName: kind === "sale" ? "Previously recorded sales" : kind === "expense" ? "Previously recorded expenses" : "Previously recorded stock purchases", quantity: 1, unitPrice: amount, subtotal: amount }],
    paymentMethod: "cash", occurredAt: workspace.createdAt, notes: "Imported opening record", total: amount, costOfGoods, createdAt: workspace.createdAt, movements: [],
  });
  const salesDifference = Math.max(0, whole(Number(candidate.sales ?? 0)) - migratedSales);
  const expenseDifference = Math.max(0, whole(Number(candidate.expenses ?? 0)) - migratedExpenses);
  const purchaseDifference = Math.max(0, whole(Number(candidate.purchases ?? 0)) - migratedPurchases);
  workspace.transactions = [
    ...migratedEntries,
    ...(salesDifference ? [historical("sale", salesDifference, Math.max(0, whole(Number(candidate.costOfGoods ?? 0)) - migratedEntries.reduce((sum, entry) => sum + entry.costOfGoods, 0)))] : []),
    ...(expenseDifference ? [historical("expense", expenseDifference)] : []),
    ...(purchaseDifference ? [historical("stock_purchase", purchaseDifference)] : []),
  ];
  return sanitizeV2Workspace(workspace);
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function integer(value: unknown, minimum = Number.MIN_SAFE_INTEGER) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum ? value : null;
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sanitizeV2Workspace(value: unknown): TundaWorkspace | null {
  const source = record(value);
  if (!source) return null;
  const settings = record(source?.settings);
  const accounts = record(source?.accounts);
  const goal = record(source?.goal);
  const mode = source?.mode;
  const businessName = textValue(settings?.businessName);
  const ownerName = textValue(settings?.ownerName);
  if (source?.version !== WORKSPACE_VERSION || (mode !== "business" && mode !== "sample") || !businessName || !ownerName || settings?.currency !== "UGX" || !accounts || !goal) return null;

  const cash = integer(accounts.cash);
  const mobileMoney = integer(accounts.mobile_money);
  const bankTransfer = integer(accounts.bank_transfer);
  const merchantCode = integer(accounts.merchant_code);
  const monthlyTarget = integer(goal.monthlyTarget, 1);
  if (cash === null || mobileMoney === null || bankTransfer === null || merchantCode === null || monthlyTarget === null) return null;
  if (!Array.isArray(source.products) || !Array.isArray(source.contacts) || !Array.isArray(source.transactions)) return null;

  const products: Product[] = [];
  for (const value of source.products) {
    const item = record(value);
    const productId = textValue(item?.id);
    const name = textValue(item?.name);
    const unit = textValue(item?.unit);
    const quantity = integer(item?.quantity, 0);
    const averageCost = integer(item?.averageCost, 0);
    const sellingPrice = integer(item?.sellingPrice, 0);
    const lowStockLevel = integer(item?.lowStockLevel, 0);
    if (!productId || !name || !unit || quantity === null || averageCost === null || sellingPrice === null || lowStockLevel === null) return null;
    products.push({ id: productId, name, unit, quantity, averageCost, sellingPrice, lowStockLevel });
  }

  const contacts: Contact[] = [];
  for (const value of source.contacts) {
    const item = record(value);
    const contactId = textValue(item?.id);
    const name = textValue(item?.name);
    const type = item?.type;
    const receivable = integer(item?.receivable, 0);
    const payable = integer(item?.payable, 0);
    if (!contactId || !name || !["customer", "supplier", "both"].includes(String(type)) || receivable === null || payable === null) return null;
    contacts.push({ id: contactId, name, type: type as ContactType, receivable, payable });
  }

  const transactions: LedgerTransaction[] = [];
  const validKinds: TransactionKind[] = ["sale", "stock_purchase", "expense", "customer_payment", "supplier_payment", "stock_adjustment"];
  const validPayments: PaymentMethod[] = ["cash", "mobile_money", "bank_transfer", "merchant_code", "credit"];
  for (const value of source.transactions) {
    const item = record(value);
    const kind = item?.kind as TransactionKind;
    const transactionId = textValue(item?.id);
    const occurredAt = typeof item?.occurredAt === "string" ? item.occurredAt.slice(0, 10) : "";
    const createdAt = typeof item?.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)) ? item.createdAt : null;
    const paymentMethod = item?.paymentMethod as PaymentMethod | undefined;
    const party = item?.party === undefined ? undefined : textValue(item.party) ?? undefined;
    const notes = typeof item?.notes === "string" ? item.notes : null;
    const total = integer(item?.total, 0);
    const costOfGoods = integer(item?.costOfGoods, 0);
    if (!transactionId || !validKinds.includes(kind) || !isValidDateKey(occurredAt) || !createdAt || notes === null || total === null || costOfGoods === null || !Array.isArray(item?.lines) || !Array.isArray(item?.movements)) return null;
    if (paymentMethod !== undefined && !validPayments.includes(paymentMethod)) return null;
    if (kind !== "stock_adjustment" && !paymentMethod) return null;

    const lines: TransactionLine[] = [];
    for (const value of item.lines) {
      const line = record(value);
      const lineId = textValue(line?.id);
      const productName = textValue(line?.productName);
      const productId = line?.productId === undefined ? undefined : textValue(line.productId) ?? undefined;
      const quantity = integer(line?.quantity);
      const unitPrice = integer(line?.unitPrice, 0);
      const subtotal = integer(line?.subtotal);
      if (!lineId || !productName || quantity === null || quantity === 0 || (kind !== "stock_adjustment" && quantity < 0) || unitPrice === null || subtotal === null || subtotal !== quantity * unitPrice) return null;
      lines.push({ id: lineId, productId, productName, quantity, unitPrice, subtotal });
    }
    if (["sale", "stock_purchase", "expense", "stock_adjustment"].includes(kind) && !lines.length) return null;
    if (total !== lines.reduce((sum, line) => sum + line.subtotal, 0)) return null;

    const movements: MoneyMovement[] = [];
    for (const value of item.movements) {
      const movement = record(value);
      const label = textValue(movement?.label);
      const amount = integer(movement?.amount);
      const tone = movement?.tone;
      if (!label || amount === null || !["in", "out", "neutral"].includes(String(tone))) return null;
      movements.push({ label, amount, tone: tone as MoneyMovement["tone"] });
    }
    transactions.push({ id: transactionId, kind, lines, paymentMethod, party, occurredAt, notes, total, costOfGoods, createdAt, movements });
  }

  const fixedMonthlyCosts = goal.fixedMonthlyCosts === undefined ? undefined : integer(goal.fixedMonthlyCosts, 0) ?? undefined;
  const contributionMarginPercent = goal.contributionMarginPercent === undefined ? undefined : integer(goal.contributionMarginPercent, 1) ?? undefined;
  if ((goal.fixedMonthlyCosts !== undefined && fixedMonthlyCosts === undefined) || (goal.contributionMarginPercent !== undefined && (contributionMarginPercent === undefined || contributionMarginPercent > 100))) return null;
  const createdAt = typeof source.createdAt === "string" && Number.isFinite(Date.parse(source.createdAt)) ? source.createdAt : null;
  const updatedAt = typeof source.updatedAt === "string" && Number.isFinite(Date.parse(source.updatedAt)) ? source.updatedAt : null;
  if (!createdAt || !updatedAt) return null;

  return {
    version: WORKSPACE_VERSION,
    mode,
    settings: { businessName, ownerName, currency: "UGX" },
    accounts: { cash, mobile_money: mobileMoney, bank_transfer: bankTransfer, merchant_code: merchantCode },
    products,
    contacts,
    transactions,
    goal: { monthlyTarget, fixedMonthlyCosts, contributionMarginPercent },
    createdAt,
    updatedAt,
  };
}

export function sanitizeSavedWorkspaces(value: unknown): SavedWorkspaces | null {
  const source = record(value);
  if (!source) return null;
  const active = source.active;
  if (active !== "business" && active !== "sample") return null;
  const business = source.business === undefined ? undefined : migrateLegacyWorkspace(source.business) ?? undefined;
  const sample = source.sample === undefined ? undefined : migrateLegacyWorkspace(source.sample) ?? undefined;
  if ((source.business !== undefined && !business) || (source.sample !== undefined && !sample) || !(active === "business" ? business : sample)) return null;
  return { active, business, sample };
}
