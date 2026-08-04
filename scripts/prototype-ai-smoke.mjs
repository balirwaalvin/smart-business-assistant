const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("PLAYWRIGHT_MODULE is required");

const baseUrl = process.env.PROTOTYPE_URL ?? "http://127.0.0.1:3000";
const { chromium } = await import(modulePath);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.evaluate(() => window.localStorage.clear());
await page.getByRole("heading", { name: /Know your business/i }).waitFor();
await page.waitForTimeout(baseUrl.startsWith("https://") ? 5_000 : 500);
await page.getByRole("button", { name: /Try the working prototype/i }).click();
await page.getByPlaceholder(/Sold 5 bottles of soda/i).fill("Bought 5 bottles of soda at 5,000 each cash");
await page.getByRole("button", { name: /Let Tunda organise it/i }).click();

const dialog = page.getByRole("dialog");
await dialog.getByText("Stock purchase", { exact: true }).waitFor({ timeout: 30_000 });
await dialog.getByText("5 × Soda", { exact: true }).waitFor();
await dialog.getByText("UGX 25,000", { exact: true }).waitFor();
await dialog.getByText(/Gemini interpreted the wording/i).waitFor();

await page.screenshot({ path: "tmp/browser/ai-transaction-public.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

await browser.close();
if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
if (mobileOverflow) throw new Error("AI transaction review has horizontal overflow on mobile.");

process.stdout.write(JSON.stringify({
  baseUrl,
  source: "gemini",
  quantity: 5,
  amount: 25_000,
  mobileOverflow,
  consoleErrors,
}, null, 2));
