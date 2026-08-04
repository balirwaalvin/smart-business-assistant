import assert from "node:assert/strict";
import {
  applyTransaction,
  getMetrics,
  parseTransaction,
  SEED_STATE,
} from "../src/lib/demo-engine.ts";

const scenarios = [
  "Sold 5 bottles of soda for 10,000 shillings cash",
  "Sold 2 loaves of bread to Grace on credit for 7,000",
  "Paid 35,000 shillings for shop electricity",
  "Bought 20 packets of milk for 50,000 cash",
  "Grace paid 12,000 shillings from her credit",
] as const;

const drafts = scenarios.map((scenario) => {
  const draft = parseTransaction(scenario);
  assert.ok(draft, `Expected parser result for: ${scenario}`);
  return draft;
});

assert.deepEqual(drafts.map((draft) => draft.kind), [
  "cash_sale",
  "credit_sale",
  "expense",
  "purchase",
  "customer_payment",
]);

let state = structuredClone(SEED_STATE);
const originalCash = state.cash;
const originalSales = state.sales;
const originalExpenses = state.expenses;
const originalPurchases = state.purchases;

state = applyTransaction(state, drafts[0]);
assert.equal(state.cash, originalCash + 10_000);
assert.equal(state.sales, originalSales + 10_000);
assert.equal(state.products.find((product) => product.name === "Soda")?.quantity, 37);

state = applyTransaction(state, drafts[1]);
assert.equal(state.sales, originalSales + 17_000);
assert.equal(state.products.find((product) => product.name === "Bread")?.quantity, 6);
assert.equal(state.debtors.find((account) => account.name === "Grace")?.balance, 31_000);

state = applyTransaction(state, drafts[2]);
assert.equal(state.expenses, originalExpenses + 35_000);

state = applyTransaction(state, drafts[3]);
assert.equal(state.purchases, originalPurchases + 50_000);
assert.equal(state.products.find((product) => product.name === "Milk")?.quantity, 32);

state = applyTransaction(state, drafts[4]);
assert.equal(state.debtors.find((account) => account.name === "Grace")?.balance, 19_000);
assert.equal(state.cash, originalCash + 10_000 - 35_000 - 50_000 + 12_000);

const lugandaSale = parseTransaction("Ntunze soda 3 ku 6,000 mu nkalu");
assert.equal(lugandaSale?.kind, "cash_sale");
assert.equal(lugandaSale?.amount, 6_000);
assert.equal(lugandaSale?.quantity, 3);

const smallSale = parseTransaction("Sold 2 sweets for 500 cash");
assert.equal(smallSale?.kind, "cash_sale");
assert.equal(smallSale?.amount, 500);

const bulkLowValueSale = parseTransaction("Sold 100 sweets for 50 cash");
assert.equal(bulkLowValueSale?.amount, 50);

const oversell = parseTransaction("Sold 100 bottles of soda for 200,000 cash");
assert.ok(oversell);
assert.throws(() => applyTransaction(structuredClone(SEED_STATE), oversell), /Only 42 bottles/);

const overpayment = parseTransaction("Grace paid 30,000 shillings from her credit");
assert.ok(overpayment);
assert.throws(() => applyTransaction(structuredClone(SEED_STATE), overpayment), /currently owes UGX 24,000/);

const metrics = getMetrics(state);
assert.equal(metrics.progress, 70);
assert.ok(metrics.lowStock.some((product) => product.name === "Bread"));

process.stdout.write("Demo engine: core flows, Luganda, small sales, overselling, and overpayment checks passed.\n");
