import assert from "node:assert/strict";
import {
  addProduct,
  assistantDraftToTransaction,
  applyTransaction,
  createEmptyWorkspace,
  createSampleWorkspace,
  draftTotal,
  getDailySeries,
  getMetrics,
  localDateKey,
  migrateLegacyWorkspace,
  parseTransactionText,
  sanitizeSavedWorkspaces,
  validateDraft,
} from "../src/lib/tunda-engine.ts";
import type { TransactionDraft } from "../src/lib/tunda-engine.ts";

const day = localDateKey();
const line = (id: string, productName: string, quantity: number, unitPrice: number) => ({
  id: `line-${id}`,
  productId: id || undefined,
  productName,
  quantity,
  unitPrice,
  subtotal: quantity * unitPrice,
});
const draft = (value: Partial<TransactionDraft> & Pick<TransactionDraft, "kind" | "lines">): TransactionDraft => ({
  kind: value.kind,
  lines: value.lines,
  paymentMethod: value.paymentMethod,
  party: value.party,
  occurredAt: day,
  notes: value.notes ?? "Test entry",
});

let workspace = createEmptyWorkspace(
  { businessName: "Test Shop", ownerName: "Owner" },
  { cash: 100_000, merchant_code: 10_000 },
  1_000_000,
);
workspace = addProduct(workspace, { name: "Soda", unit: "bottles", quantity: 10, averageCost: 1_000, sellingPrice: 5_000, lowStockLevel: 3 });
workspace = addProduct(workspace, { name: "Bread", unit: "loaves", quantity: 5, averageCost: 2_000, sellingPrice: 4_000, lowStockLevel: 2 });
const sodaId = workspace.products.find((product) => product.name === "Soda")!.id;
const breadId = workspace.products.find((product) => product.name === "Bread")!.id;

const fiveSodas = draft({ kind: "sale", lines: [line(sodaId, "Soda", 5, 5_000)], paymentMethod: "cash" });
assert.equal(draftTotal(fiveSodas), 25_000, "5 × UGX 5,000 must equal UGX 25,000");
assert.match(validateDraft(workspace, { ...fiveSodas, occurredAt: "" }).join(" "), /valid transaction date/i, "Transactions without a valid date must be rejected");
let result = applyTransaction(workspace, fiveSodas);
workspace = result.workspace;
assert.equal(result.transaction.total, 25_000);
assert.equal(result.transaction.costOfGoods, 5_000);
assert.equal(workspace.accounts.cash, 125_000);
assert.equal(workspace.products.find((product) => product.id === sodaId)?.quantity, 5);
assert.deepEqual(result.transaction.movements.map((movement) => [movement.label, movement.amount]), [["Cash", 25_000], ["Soda stock", -5], ["Gross profit", 20_000]]);

result = applyTransaction(workspace, draft({ kind: "stock_purchase", lines: [line(sodaId, "Soda", 5, 3_000)], paymentMethod: "cash" }));
workspace = result.workspace;
assert.equal(workspace.products.find((product) => product.id === sodaId)?.quantity, 10);
assert.equal(workspace.products.find((product) => product.id === sodaId)?.averageCost, 2_000, "Moving average cost should include old and new stock value");
assert.equal(workspace.accounts.cash, 110_000);

result = applyTransaction(workspace, draft({ kind: "sale", lines: [line(sodaId, "Soda", 2, 5_000), line(breadId, "Bread", 1, 4_000)], paymentMethod: "mobile_money" }));
workspace = result.workspace;
assert.equal(result.transaction.total, 14_000, "Multi-item transaction must sum every line subtotal");
assert.equal(result.transaction.costOfGoods, 6_000);
assert.equal(workspace.accounts.mobile_money, 14_000);

result = applyTransaction(workspace, draft({ kind: "sale", lines: [line(breadId, "Bread", 1, 4_000)], paymentMethod: "credit", party: "Grace" }));
workspace = result.workspace;
assert.equal(workspace.contacts.find((contact) => contact.name === "Grace")?.receivable, 4_000);
assert.equal(workspace.accounts.cash, 110_000, "Credit must not be counted as cash");
assert.deepEqual(result.transaction.movements[0], { label: "Grace customer credit", amount: 4_000, tone: "neutral" });

result = applyTransaction(workspace, draft({ kind: "customer_payment", lines: [line("", "Customer payment", 1, 4_000)], paymentMethod: "bank_transfer", party: "Grace" }));
workspace = result.workspace;
assert.equal(workspace.accounts.bank_transfer, 4_000);
assert.equal(workspace.contacts.find((contact) => contact.name === "Grace")?.receivable, 0);

result = applyTransaction(workspace, draft({ kind: "stock_purchase", lines: [line(breadId, "Bread", 2, 2_500)], paymentMethod: "credit", party: "Mukwano Wholesalers" }));
workspace = result.workspace;
assert.equal(workspace.contacts.find((contact) => contact.name === "Mukwano Wholesalers")?.payable, 5_000);
assert.deepEqual(result.transaction.movements[0], { label: "Mukwano Wholesalers supplier balance", amount: 5_000, tone: "neutral" });
result = applyTransaction(workspace, draft({ kind: "supplier_payment", lines: [line("", "Supplier payment", 1, 5_000)], paymentMethod: "merchant_code", party: "Mukwano Wholesalers" }));
workspace = result.workspace;
assert.equal(workspace.accounts.merchant_code, 5_000);
assert.equal(workspace.contacts.find((contact) => contact.name === "Mukwano Wholesalers")?.payable, 0);

result = applyTransaction(workspace, draft({ kind: "expense", lines: [line("", "Electricity", 1, 3_000)], paymentMethod: "mobile_money" }));
workspace = result.workspace;
assert.equal(workspace.accounts.mobile_money, 11_000);

result = applyTransaction(workspace, draft({ kind: "stock_adjustment", lines: [line(sodaId, "Soda", -1, 0)] }));
workspace = result.workspace;
assert.equal(workspace.products.find((product) => product.id === sodaId)?.quantity, 7);

assert.throws(
  () => applyTransaction(workspace, draft({ kind: "sale", lines: [line(sodaId, "Soda", 50, 5_000)], paymentMethod: "cash" })),
  /Only 7 bottles of Soda are available/,
  "Overselling must be blocked",
);
assert.throws(
  () => applyTransaction(workspace, draft({ kind: "sale", lines: [line(sodaId, "Soda", 4, 5_000), line(sodaId, "Soda", 4, 5_000)], paymentMethod: "cash" })),
  /Only 7 bottles of Soda are available/,
  "Duplicate lines for the same product must be aggregated before oversell validation",
);

const metrics = getMetrics(workspace);
assert.equal(metrics.moneyAvailable, 130_000, "Money available must include cash, Mobile Money, bank, and merchant-code balances");
assert.equal(metrics.sales, 43_000);
assert.equal(metrics.grossProfit, 30_000);
assert.equal(metrics.netProfit, 27_000);
assert.equal(metrics.receivables, 0);
assert.equal(metrics.payables, 0);
assert.equal(metrics.estimatedBreakEven, undefined, "Break-even must not be invented without enough cost data");
assert.equal(metrics.target, 1_000_000);
assert.equal(getDailySeries(workspace).at(-1)?.key, localDateKey(), "Daily charts must use the local calendar date");

const lastMonth = structuredClone(workspace);
const oldDate = new Date();
oldDate.setMonth(oldDate.getMonth() - 1);
lastMonth.transactions.push({ ...lastMonth.transactions[0], id: "last-month-sale", occurredAt: oldDate.toISOString(), total: 99_000 });
assert.equal(getMetrics(lastMonth).sales, metrics.sales, "Monthly metrics must exclude transactions outside the current month");

const clearEach = parseTransactionText("Bought 5 bottles of Soda at UGX 5,000 each in cash", ["Soda"]);
assert.equal(clearEach.status, "ready");
assert.equal(clearEach.draft.lines[0].quantity, 5);
assert.equal(clearEach.draft.lines[0].unitPrice, 5_000);

const explicitTotal = parseTransactionText("Sold 5 tomatoes for UGX 1,000 total in cash", ["Tomatoes"]);
assert.equal(explicitTotal.status, "ready");
assert.equal(explicitTotal.draft.lines[0].unitPrice, 200);

const ambiguousEnglish = parseTransactionText("Sold 5 tomatoes for 1,000 cash", ["Tomatoes"]);
assert.equal(ambiguousEnglish.status, "needs_clarification");
assert.match(ambiguousEnglish.questions.join(" "), /each item or the total/i);

const ambiguousLuganda = parseTransactionText("Ntunze tomato 5 ku 1,000 mu nkalu", ["Tomato"]);
assert.equal(ambiguousLuganda.status, "needs_clarification");
assert.match(ambiguousLuganda.questions.join(" "), /each item or the total/i);

const expense = parseTransactionText("Paid UGX 35,000 for electricity by Mobile Money");
assert.equal(expense.status, "ready");
assert.equal(expense.draft.kind, "expense");
assert.equal(expense.draft.lines[0].unitPrice, 35_000);
assert.equal(expense.draft.paymentMethod, "mobile_money");

const customerPayment = parseTransactionText("Grace paid UGX 12,000 in cash");
assert.equal(customerPayment.status, "ready");
assert.equal(customerPayment.draft.party, "Grace");

const unevenTotal = parseTransactionText("Sold 3 bottles of Soda for UGX 1,000 total in cash", ["Soda"]);
assert.equal(unevenTotal.status, "needs_clarification");
assert.match(unevenTotal.questions.join(" "), /does not divide evenly/i);

const adjustment = parseTransactionText("Removed 2 Soda from stock", ["Soda"]);
assert.equal(adjustment.status, "ready");
assert.equal(adjustment.draft.kind, "stock_adjustment");
assert.equal(adjustment.draft.lines[0].quantity, -2);
assert.equal(adjustment.draft.paymentMethod, undefined);
assert.equal(assistantDraftToTransaction(adjustment, workspace)?.lines[0].quantity, -2, "Ready AI stock adjustments must reach review without a payment method");

const sample = createSampleWorkspace();
const sampleCosts = new Map(sample.products.map((product) => [product.id, product.averageCost]));
for (const entry of sample.transactions.filter((transaction) => transaction.kind === "sale")) {
  const expectedCost = entry.lines.reduce((total, item) => total + item.quantity * (sampleCosts.get(item.productId ?? "") ?? 0), 0);
  assert.equal(entry.costOfGoods, expectedCost, `${entry.id} must use deterministic product costs`);
}
assert.ok(sanitizeSavedWorkspaces({ active: "sample", sample }), "The sample workspace must survive safe storage restoration");

assert.throws(
  () => applyTransaction(workspace, draft({ kind: "customer_payment", lines: [line("", "Customer payment", 1, 2_000)], paymentMethod: "cash", party: "Unknown Customer" })),
  /has no customer credit balance/,
);
assert.throws(
  () => applyTransaction(workspace, draft({ kind: "stock_purchase", lines: [line("new-item", "Unconfigured item", 2, 2_000)], paymentMethod: "cash" })),
  /is not set up yet/,
  "Purchases must not guess missing product setup fields",
);

const migrated = migrateLegacyWorkspace({
  businessName: "Legacy Shop", ownerName: "Owner", cash: 80_000, mobileMoney: 20_000,
  sales: 25_000, expenses: 3_000, purchases: 6_000, costOfGoods: 10_000, salesGoal: 500_000,
  products: [{ id: "legacy-soda", name: "Soda", unit: "bottles", quantity: 8, reorderAt: 3, costPrice: 1_000, sellingPrice: 2_000 }],
  debtors: [], creditors: [],
  entries: [{ id: "legacy-sale", kind: "cash_sale", description: "Sold soda", amount: 10_000, quantity: 5, item: "Soda", paymentMethod: "cash", createdAt: new Date().toISOString() }],
});
assert.ok(migrated);
assert.equal(migrated.transactions.some((entry) => entry.id === "legacy-sale"), true, "Compatible legacy records must be retained");
assert.equal(getMetrics(migrated).sales, 25_000, "Legacy aggregate totals must survive migration");

assert.ok(sanitizeSavedWorkspaces({ active: "business", business: workspace }), "Valid versioned backups must round-trip");
const malformedBackup = structuredClone(workspace) as unknown as { transactions: unknown[] };
malformedBackup.transactions = [{}];
assert.equal(sanitizeSavedWorkspaces({ active: "business", business: malformedBackup }), null, "Malformed nested backup records must be rejected before replacing saved data");

process.stdout.write("Tunda engine: totals, weighted cost, profit, payment channels, credit, stock controls, and clarification rules passed.\n");
