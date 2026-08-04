const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("PLAYWRIGHT_MODULE is required");

const { chromium } = await import(modulePath);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto("http://127.0.0.1:3000", { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.localStorage.clear());
await page.locator("h1").filter({ hasText: "Know your business" }).waitFor();
await page.waitForTimeout(1400);
await page.screenshot({ path: "tmp/browser/landing-desktop.png", fullPage: true });

await page.getByRole("button", { name: /Try the working prototype/i }).click();
await page.getByRole("heading", { name: /Here is how Amina's Corner Shop is doing/i }).waitFor();

await page.getByPlaceholder(/Sold 5 bottles of soda/i).fill("hello");
await page.getByRole("button", { name: /Let Tunda organise it/i }).click();
await page.getByText(/Add what happened and an amount/i).waitFor();
await page.getByPlaceholder(/Sold 5 bottles of soda/i).fill("Sold 100 bottles of soda for 200,000 cash");
await page.getByRole("button", { name: /Let Tunda organise it/i }).click();
await page.getByText(/Only 42 bottles of soda are available/i).waitFor();
await page.getByPlaceholder(/Sold 5 bottles of soda/i).fill("Grace paid 30,000 shillings from her credit");
await page.getByRole("button", { name: /Let Tunda organise it/i }).click();
await page.getByText(/Grace currently owes UGX 24,000/i).waitFor();

const flows = [
  { entry: "Sold 5 bottles of soda for 10,000 shillings cash", label: "Cash sale", amount: "UGX 10,000" },
  { entry: "Sold 2 loaves of bread to Grace on credit for 7,000", label: "Credit sale", amount: "UGX 7,000" },
  { entry: "Paid 35,000 shillings for shop electricity", label: "Business expense", amount: "UGX 35,000" },
  { entry: "Bought 20 packets of milk for 50,000 cash", label: "Stock purchase", amount: "UGX 50,000" },
  { entry: "Bought 5 kg of rice from Mukwano Wholesalers on credit for 20,000", label: "Stock purchase", amount: "UGX 20,000" },
  { entry: "Grace paid 12,000 shillings from her credit", label: "Customer payment", amount: "UGX 12,000" },
  { entry: "Ntunze soda 3 ku 6,000 mu nkalu", label: "Cash sale", amount: "UGX 6,000" },
];

for (const flow of flows) {
  await page.getByPlaceholder(/Sold 5 bottles of soda/i).fill(flow.entry);
  await page.getByRole("button", { name: /Let Tunda organise it/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(flow.label, { exact: true }).waitFor();
  await dialog.getByText(flow.amount, { exact: true }).waitFor();
  await dialog.getByRole("button", { name: /Save transaction/i }).click();
  await page.getByRole("status").waitFor();
  await page.getByRole("status").getByRole("button", { name: /Dismiss/i }).click();
}

await page.reload({ waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: /Open live demo/i }).click();
await page.getByText("UGX 1,263,000", { exact: true }).waitFor();
await page.getByRole("button", { name: /Switch language/i }).click();
await page.getByPlaceholder(/Ntunze soda 5/i).waitFor();
await page.getByRole("button", { name: /Switch language/i }).click();

await page.getByRole("button", { name: "Records", exact: true }).click();
await page.getByRole("heading", { name: /Every transaction, organised/i }).waitFor();
await page.getByRole("button", { name: "costs", exact: true }).click();
await page.getByText("Business expense", { exact: true }).first().waitFor();
await page.getByText("Stock purchase", { exact: true }).first().waitFor();
await page.screenshot({ path: "tmp/browser/records-desktop.png", fullPage: true });
await page.getByRole("button", { name: "credit", exact: true }).click();
await page.getByText("Bought 5 kg of rice from Mukwano Wholesalers on credit for 20,000", { exact: true }).waitFor();

await page.getByRole("button", { name: "Stock", exact: true }).click();
await page.getByRole("heading", { name: /Know what is on your shelves/i }).waitFor();
await page.getByText("Stock levels", { exact: true }).waitFor();
await page.screenshot({ path: "tmp/browser/stock-desktop.png", fullPage: true });

await page.getByRole("button", { name: "People", exact: true }).click();
await page.getByRole("heading", { name: /Know who owes whom/i }).waitFor();
await page.getByText("Grace", { exact: true }).waitFor();
await page.getByText("Mukwano Wholesalers", { exact: true }).waitFor();
await page.screenshot({ path: "tmp/browser/people-desktop.png", fullPage: true });

await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.getByRole("heading", { name: /Here is how Amina's Corner Shop is doing/i }).waitFor();
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.screenshot({ path: "tmp/browser/dashboard-desktop.png", fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const mobileViewOverflow = {};
for (const view of ["Records", "Stock", "People", "Overview"]) {
  await page.getByRole("button", { name: view, exact: true }).click();
  await page.waitForTimeout(350);
  mobileViewOverflow[view] = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (view === "People") await page.screenshot({ path: "tmp/browser/people-mobile.png", fullPage: true });
}
const hasHorizontalOverflow = Object.values(mobileViewOverflow).some(Boolean);
await page.screenshot({ path: "tmp/browser/dashboard-mobile.png", fullPage: true });

const result = {
  title: await page.title(),
  transactionFlowsSaved: flows.map((flow) => flow.label),
  invalidEntryExplained: true,
  oversellingPrevented: true,
  customerOverpaymentPrevented: true,
  languageToggleVerified: true,
  dashboardViewsVerified: ["Overview", "Records", "Stock", "People"],
  mobileViewsVerified: mobileViewOverflow,
  mobileHorizontalOverflow: hasHorizontalOverflow,
  consoleErrors,
};

await browser.close();
process.stdout.write(JSON.stringify(result, null, 2));
