export type TransactionKind =
  | "cash_sale"
  | "credit_sale"
  | "expense"
  | "purchase"
  | "customer_payment";

export type Product = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderAt: number;
  costPrice: number;
  sellingPrice: number;
};

export type ContactBalance = {
  name: string;
  balance: number;
};

export type LedgerEntry = {
  id: string;
  kind: TransactionKind;
  description: string;
  amount: number;
  quantity?: number;
  item?: string;
  party?: string;
  paymentMethod?: "cash" | "mobile_money" | "credit";
  createdAt: string;
};

export type BusinessState = {
  businessName: string;
  ownerName: string;
  location: string;
  cash: number;
  mobileMoney: number;
  sales: number;
  expenses: number;
  purchases: number;
  costOfGoods: number;
  salesGoal: number;
  daysRemaining: number;
  products: Product[];
  debtors: ContactBalance[];
  creditors: ContactBalance[];
  entries: LedgerEntry[];
};

export type DraftTransaction = {
  kind: TransactionKind;
  description: string;
  amount: number;
  quantity?: number;
  item?: string;
  party?: string;
  paymentMethod: "cash" | "mobile_money" | "credit";
  confidence: number;
};

export type BusinessRecommendation = {
  category: "stock" | "sales";
  destination: "stock" | "records";
  title: string;
  body: string;
  action: string;
};

export const transactionLabels: Record<TransactionKind, string> = {
  cash_sale: "Cash sale",
  credit_sale: "Credit sale",
  expense: "Business expense",
  purchase: "Stock purchase",
  customer_payment: "Customer payment",
};

export const DEMO_EXAMPLES = [
  "Sold 5 bottles of soda for 10,000 shillings cash",
  "Sold 2 loaves of bread to Grace on credit for 7,000",
  "Paid 35,000 shillings for shop electricity",
  "Bought 20 packets of milk for 50,000 cash",
  "Grace paid 12,000 shillings from her credit",
];

export const SEED_STATE: BusinessState = {
  businessName: "Amina's Corner Shop",
  ownerName: "Amina",
  location: "Kawempe, Kampala",
  cash: 480_000,
  mobileMoney: 265_000,
  sales: 1_240_000,
  expenses: 295_000,
  purchases: 472_000,
  costOfGoods: 706_000,
  salesGoal: 1_800_000,
  daysRemaining: 6,
  products: [
    { id: "soda", name: "Soda", unit: "bottles", quantity: 42, reorderAt: 18, costPrice: 1_000, sellingPrice: 2_000 },
    { id: "bread", name: "Bread", unit: "loaves", quantity: 8, reorderAt: 10, costPrice: 2_500, sellingPrice: 3_500 },
    { id: "milk", name: "Milk", unit: "packets", quantity: 12, reorderAt: 10, costPrice: 2_500, sellingPrice: 3_500 },
    { id: "sugar", name: "Sugar", unit: "kg", quantity: 18, reorderAt: 8, costPrice: 3_800, sellingPrice: 5_000 },
    { id: "rice", name: "Rice", unit: "kg", quantity: 25, reorderAt: 10, costPrice: 4_000, sellingPrice: 5_500 },
  ],
  debtors: [
    { name: "Grace", balance: 24_000 },
    { name: "Kato", balance: 18_000 },
  ],
  creditors: [{ name: "Mukwano Wholesalers", balance: 120_000 }],
  entries: [
    {
      id: "seed-1",
      kind: "cash_sale",
      description: "Sold 6 bottles of soda for cash",
      amount: 12_000,
      quantity: 6,
      item: "Soda",
      paymentMethod: "cash",
      createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    },
    {
      id: "seed-2",
      kind: "expense",
      description: "Paid for morning transport",
      amount: 8_000,
      paymentMethod: "cash",
      createdAt: new Date(Date.now() - 95 * 60_000).toISOString(),
    },
    {
      id: "seed-3",
      kind: "customer_payment",
      description: "Kato paid part of his credit",
      amount: 10_000,
      party: "Kato",
      paymentMethod: "mobile_money",
      createdAt: new Date(Date.now() - 3.6 * 60 * 60_000).toISOString(),
    },
  ],
};

const productAliases: Array<[string[], string]> = [
  [["soda", "sodas", "bottle", "bottles"], "Soda"],
  [["bread", "loaf", "loaves", "mugaati", "migaati"], "Bread"],
  [["milk", "packet", "packets", "amata"], "Milk"],
  [["sugar", "ssukaali", "sukaali"], "Sugar"],
  [["rice", "omuceere", "muceere"], "Rice"],
];

function findProduct(input: string) {
  const lower = input.toLowerCase();
  return productAliases.find(([aliases]) => aliases.some((alias) => lower.includes(alias)))?.[1];
}

function findParty(input: string) {
  const known = ["Grace", "Kato", "Mukwano Wholesalers"];
  return known.find((name) => input.toLowerCase().includes(name.toLowerCase()));
}

function extractNumbers(input: string) {
  return [...input.matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)].map((match) => Number(match[0].replaceAll(",", "")));
}

function extractAmount(input: string, numbers: number[]) {
  const explicitAmount = input.match(/(?:\bfor\b|\bku\b)\s*(?:ugx\s*)?(\d[\d,]*(?:\.\d+)?)/i);
  if (explicitAmount) return Number(explicitAmount[1].replaceAll(",", ""));
  return Math.max(...numbers, 0);
}

export function parseTransaction(input: string): DraftTransaction | null {
  const text = input.trim();
  const lower = text.toLowerCase();
  if (!text) return null;

  let kind: TransactionKind | null = null;
  if (/(paid|settled).*(credit|debt)|customer payment|from (her|his|their) credit|asasudde.*(bbanja|ebbanja)/.test(lower)) {
    kind = "customer_payment";
  } else if (/(bought|restocked|purchased|received stock|nguze|tuguze)/.test(lower)) {
    kind = "purchase";
  } else if (/(sold|sale|ntunze|tutunze)/.test(lower) && /(credit|pay later|owes|bbanja|ebbanja)/.test(lower)) {
    kind = "credit_sale";
  } else if (/(sold|sale|ntunze|tutunze)/.test(lower)) {
    kind = "cash_sale";
  } else if (/(paid|spent|rent|electricity|transport|wages|expense|nsasudde|tusasudde|ssaasaanyizza)/.test(lower)) {
    kind = "expense";
  }

  if (!kind) return null;

  const numbers = extractNumbers(text);
  const amount = extractAmount(text, numbers);
  const item = findProduct(text);
  const quantityCandidate = numbers.find((number) => number > 0 && number < 1_000 && number !== amount);
  const paymentMethod = kind === "credit_sale" || (kind === "purchase" && /(credit|bbanja|ebbanja)/.test(lower))
    ? "credit"
    : lower.includes("mobile") || lower.includes("momo")
      ? "mobile_money"
      : "cash";

  return {
    kind,
    description: text,
    amount,
    quantity: item && ["cash_sale", "credit_sale", "purchase"].includes(kind) ? quantityCandidate ?? 1 : undefined,
    item,
    party: findParty(text),
    paymentMethod,
    confidence: amount > 0 ? (item || !["cash_sale", "credit_sale", "purchase"].includes(kind) ? 96 : 88) : 72,
  };
}

export function validateTransaction(state: BusinessState, draft: DraftTransaction) {
  if (draft.amount <= 0) return "Add the amount of the transaction before continuing.";

  if (["cash_sale", "credit_sale"].includes(draft.kind) && draft.item) {
    const product = state.products.find((candidate) => candidate.name === draft.item);
    const quantity = draft.quantity ?? 1;
    if (product && quantity > product.quantity) {
      return `Only ${product.quantity} ${product.unit} of ${product.name.toLowerCase()} are available. Reduce the sale quantity or restock first.`;
    }
  }

  if (draft.kind === "customer_payment" && draft.party) {
    const account = state.debtors.find((candidate) => candidate.name === draft.party);
    if (account && draft.amount > account.balance) {
      return `${account.name} currently owes ${formatUgx(account.balance)}. Record no more than that amount for this payment.`;
    }
  }

  return null;
}

function adjustBalance(accounts: ContactBalance[], name: string, change: number) {
  const existing = accounts.find((account) => account.name === name);
  if (existing) {
    return accounts.map((account) => account.name === name ? { ...account, balance: Math.max(0, account.balance + change) } : account);
  }
  return [...accounts, { name, balance: Math.max(0, change) }];
}

export function applyTransaction(state: BusinessState, draft: DraftTransaction) {
  const validationError = validateTransaction(state, draft);
  if (validationError) throw new Error(validationError);

  const next: BusinessState = structuredClone(state);
  const product = next.products.find((candidate) => candidate.name === draft.item);
  const quantity = draft.quantity ?? 1;
  const party = draft.party ?? (draft.kind === "purchase" ? "Local supplier" : "Walk-in customer");

  if (draft.kind === "cash_sale" || draft.kind === "credit_sale") {
    next.sales += draft.amount;
    if (product) {
      product.quantity = Math.max(0, product.quantity - quantity);
      next.costOfGoods += product.costPrice * quantity;
    }
    if (draft.kind === "cash_sale") {
      if (draft.paymentMethod === "mobile_money") next.mobileMoney += draft.amount;
      else next.cash += draft.amount;
    } else {
      next.debtors = adjustBalance(next.debtors, party, draft.amount);
    }
  }

  if (draft.kind === "expense") {
    next.expenses += draft.amount;
    if (draft.paymentMethod === "mobile_money") next.mobileMoney -= draft.amount;
    else next.cash -= draft.amount;
  }

  if (draft.kind === "purchase") {
    next.purchases += draft.amount;
    if (product) product.quantity += quantity;
    if (draft.paymentMethod === "credit") next.creditors = adjustBalance(next.creditors, party, draft.amount);
    else if (draft.paymentMethod === "mobile_money") next.mobileMoney -= draft.amount;
    else next.cash -= draft.amount;
  }

  if (draft.kind === "customer_payment") {
    if (draft.paymentMethod === "mobile_money") next.mobileMoney += draft.amount;
    else next.cash += draft.amount;
    next.debtors = adjustBalance(next.debtors, party, -draft.amount);
  }

  const entry: LedgerEntry = {
    id: `entry-${Date.now()}`,
    kind: draft.kind,
    description: draft.description,
    amount: draft.amount,
    quantity: draft.quantity,
    item: draft.item,
    party: draft.party,
    paymentMethod: draft.paymentMethod,
    createdAt: new Date().toISOString(),
  };
  next.entries = [entry, ...next.entries].slice(0, 20);
  return next;
}

export function getMetrics(state: BusinessState) {
  const profit = state.sales - state.costOfGoods - state.expenses;
  const debtorTotal = state.debtors.reduce((sum, account) => sum + account.balance, 0);
  const creditorTotal = state.creditors.reduce((sum, account) => sum + account.balance, 0);
  const lowStock = state.products.filter((product) => product.quantity <= product.reorderAt);
  const progress = Math.min(100, Math.round((state.sales / state.salesGoal) * 100));
  const shortfall = Math.max(0, state.salesGoal - state.sales);
  const dailyTarget = Math.ceil(shortfall / Math.max(1, state.daysRemaining));
  return { profit, debtorTotal, creditorTotal, lowStock, progress, shortfall, dailyTarget };
}

export function getRecommendation(state: BusinessState): BusinessRecommendation {
  const metrics = getMetrics(state);
  const urgent = metrics.lowStock.sort((a, b) => (a.quantity / a.reorderAt) - (b.quantity / b.reorderAt))[0];
  if (urgent) {
    const suggested = Math.max(urgent.reorderAt * 2 - urgent.quantity, urgent.reorderAt);
    return {
      category: "stock",
      destination: "stock",
      title: `Restock ${urgent.name.toLowerCase()} before the evening rush`,
      body: `Only ${urgent.quantity} ${urgent.unit} remain. Selling out would make the sales goal harder to reach.`,
      action: `Buy about ${suggested} ${urgent.unit}`,
    };
  }
  return {
    category: "sales",
    destination: "records",
    title: `Aim for ${formatUgx(metrics.dailyTarget)} in sales each day`,
    body: `That pace will close the remaining ${formatUgx(metrics.shortfall)} gap before month-end.`,
    action: "Record today's sales",
  };
}

export function getFeedback(draft: DraftTransaction) {
  const quantity = draft.quantity ?? 1;
  if (draft.kind === "cash_sale") return `Sale saved. Cash and sales increased by ${formatUgx(draft.amount)}${draft.item ? `, and ${draft.item.toLowerCase()} stock reduced by ${quantity}` : ""}.`;
  if (draft.kind === "credit_sale") return `Credit sale saved. ${draft.party ?? "The customer"} now owes ${formatUgx(draft.amount)}${draft.item ? `, and ${draft.item.toLowerCase()} stock reduced by ${quantity}` : ""}.`;
  if (draft.kind === "expense") return `Expense saved. Available ${draft.paymentMethod === "mobile_money" ? "mobile money" : "cash"} reduced by ${formatUgx(draft.amount)}.`;
  if (draft.kind === "purchase") return `Purchase saved. ${draft.item ?? "Stock"} increased by ${quantity}${draft.paymentMethod === "credit" ? ", and the supplier balance was updated" : ""}.`;
  return `Payment saved. ${draft.party ?? "The customer"}'s balance reduced by ${formatUgx(draft.amount)}.`;
}

export function formatUgx(value: number) {
  return `UGX ${Math.round(value).toLocaleString("en-UG")}`;
}
