import { NextResponse } from "next/server";
import {
  AssistantDraft,
  AssistantParseResult,
  parseTransactionText,
  localDateKey,
  PaymentMethod,
  TransactionKind,
} from "@/lib/tunda-engine";

export const runtime = "nodejs";

const requestWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const GLOBAL_RATE_LIMIT = 100;
const MAX_RATE_KEYS = 500;
let globalRequestWindow = { count: 0, resetAt: 0 };

const transactionKinds: TransactionKind[] = ["sale", "stock_purchase", "expense", "customer_payment", "supplier_payment", "stock_adjustment"];
const paymentMethods: PaymentMethod[] = ["cash", "mobile_money", "bank_transfer", "merchant_code", "credit"];

function resolveClientId(request: Request) {
  const forwardedFor = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for");
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || forwardedFor?.split(",").at(-1)?.trim() || "unknown";
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  if (globalRequestWindow.resetAt <= now) globalRequestWindow = { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (globalRequestWindow.count >= GLOBAL_RATE_LIMIT) return false;
  for (const [key, value] of requestWindows) if (value.resetAt <= now) requestWindows.delete(key);
  const clientId = resolveClientId(request);
  const current = requestWindows.get(clientId);
  if (!current) {
    if (requestWindows.size >= MAX_RATE_KEYS) return false;
    requestWindows.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else if (current.count >= RATE_LIMIT) return false;
  else current.count += 1;
  globalRequestWindow.count += 1;
  return true;
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["ready", "needs_clarification", "unsupported"] },
    kind: { type: ["string", "null"], enum: [...transactionKinds, null] },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          productName: { type: ["string", "null"] },
          quantity: { type: ["integer", "null"], minimum: -1000000, maximum: 1000000, description: "Whole units. For stock_adjustment only, use a negative number to remove stock and a positive number to add stock." },
          unitPrice: { type: ["integer", "null"], minimum: 1, description: "Price for one unit in whole-number UGX." },
          statedTotal: { type: ["integer", "null"], minimum: 1, description: "Total for the entire line only when the user explicitly calls it the total or says altogether." },
        },
        required: ["productName", "quantity", "unitPrice", "statedTotal"],
      },
    },
    paymentMethod: { type: ["string", "null"], enum: [...paymentMethods, null] },
    party: { type: ["string", "null"] },
    missingFields: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
  },
  required: ["status", "kind", "lines", "paymentMethod", "party", "missingFields", "questions"],
};

type InteractionResponse = { steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };

function normalize(value: unknown, input: string): AssistantParseResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const status = candidate.status;
  if (!(["ready", "needs_clarification", "unsupported"] as unknown[]).includes(status)) return null;
  const kind = transactionKinds.includes(candidate.kind as TransactionKind) ? candidate.kind as TransactionKind : undefined;
  const paymentMethod = paymentMethods.includes(candidate.paymentMethod as PaymentMethod) ? candidate.paymentMethod as PaymentMethod : undefined;
  const unevenTotalLines: number[] = [];
  const lines = Array.isArray(candidate.lines) ? candidate.lines.map((value, index) => {
    const line = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const quantity = Number(line.quantity);
    const extractedUnitPrice = Number(line.unitPrice);
    const statedTotal = Number(line.statedTotal);
    const validQuantity = Number.isInteger(quantity) && quantity !== 0 && (candidate.kind === "stock_adjustment" || quantity > 0) ? quantity : undefined;
    const validStatedTotal = Number.isInteger(statedTotal) && statedTotal > 0 ? statedTotal : undefined;
    let unitPrice = Number.isInteger(extractedUnitPrice) && extractedUnitPrice > 0 ? extractedUnitPrice : undefined;
    if (!unitPrice && validQuantity && validQuantity > 0 && validStatedTotal) {
      if (validStatedTotal % validQuantity === 0) unitPrice = validStatedTotal / validQuantity;
      else unevenTotalLines.push(index);
    }
    return {
      productName: typeof line.productName === "string" && line.productName.trim() ? line.productName.trim() : undefined,
      quantity: validQuantity,
      unitPrice,
      statedTotal: validStatedTotal,
    };
  }) : [];
  const draft: AssistantDraft = {
    kind,
    lines,
    paymentMethod,
    party: typeof candidate.party === "string" && candidate.party.trim() ? candidate.party.trim() : undefined,
    occurredAt: localDateKey(),
    notes: input,
  };
  const missingFields = Array.isArray(candidate.missingFields) ? candidate.missingFields.filter((field): field is string => typeof field === "string") : [];
  const questions = Array.isArray(candidate.questions) ? candidate.questions.filter((question): question is string => typeof question === "string") : [];
  const requiredMissing = [...missingFields];
  if (!kind) requiredMissing.push("kind");
  if (kind !== "stock_adjustment" && !paymentMethod) requiredMissing.push("paymentMethod");
  if (["sale", "stock_purchase", "expense"].includes(kind ?? "") && !lines.length) requiredMissing.push("lines");
  if (lines.some((line) => !line.productName)) requiredMissing.push("lines.productName");
  if (lines.some((line) => !line.quantity)) requiredMissing.push("lines.quantity");
  if (kind !== "stock_adjustment" && lines.some((line) => !line.unitPrice)) requiredMissing.push("lines.unitPrice");
  if ((paymentMethod === "credit" || ["customer_payment", "supplier_payment"].includes(kind ?? "")) && !draft.party) requiredMissing.push("party");
  return {
    status: status === "unsupported" ? "unsupported" : requiredMissing.length ? "needs_clarification" : "ready",
    draft,
    missingFields: [...new Set(requiredMissing)],
    questions: questions.length ? questions : unevenTotalLines.length ? ["The stated total does not divide evenly across the quantity. What was the price for each item?"] : ["Add the missing transaction details."],
  };
}

async function parseWithAssistant(input: string, language: "en" | "lg", products: string[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const prompt = `Extract one business transaction into the requested structure. The user may use Ugandan English, Luganda, or both.

Important rules:
- Extract only. Do not calculate account balances, profit, stock cost, or post a transaction.
- Never invent a product, quantity, unit price, party, or payment method.
- A line unitPrice is the price for ONE item in whole-number UGX.
- If wording such as "5 tomatoes for 1,000" does not say "each", "per item", or "total", set unitPrice to null and ask whether 1,000 is each or the total.
- Extract an explicitly stated line total into statedTotal. Never divide it or copy it into unitPrice; Tunda performs that arithmetic after extraction.
- Return needs_clarification for any required missing or ambiguous field.
- Supported types are sale, stock_purchase, expense, customer_payment, supplier_payment, and stock_adjustment.
- For stock_adjustment, quantity must be signed: positive adds stock and negative removes stock. It has no payment method or unit price.
- Payment methods are cash, mobile_money, bank_transfer, merchant_code, and credit.
- Credit requires the customer or supplier name.
- Existing product names are ${JSON.stringify(products)}. Preserve a clearly stated new product name if it is not in this list.
- Interface language is ${language === "lg" ? "Luganda" : "English"}.

User entry: ${JSON.stringify(input)}`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": "2026-05-20" },
    body: JSON.stringify({ model: "gemini-3.5-flash-lite", store: false, input: prompt, response_format: { type: "text", mime_type: "application/json", schema: responseSchema } }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Assistant request failed with ${response.status}`);
  const payload = await response.json() as InteractionResponse;
  const output = payload.steps?.filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((content) => content.type === "text").map((content) => content.text ?? "").join("").trim();
  return output ? normalize(JSON.parse(output), input) : null;
}

export async function POST(request: Request) {
  try {
    if (!consumeRateLimit(request)) return NextResponse.json({ error: "Tunda is busy. Wait a moment and try again." }, { status: 429 });
    const body = await request.json() as { text?: unknown; language?: unknown; products?: unknown };
    const input = typeof body.text === "string" ? body.text.trim() : "";
    const language = body.language === "lg" ? "lg" : "en";
    const products = Array.isArray(body.products) ? body.products.filter((name): name is string => typeof name === "string").slice(0, 200) : [];
    if (!input) return NextResponse.json({ error: "Describe the transaction first." }, { status: 400 });
    if (input.length > 600) return NextResponse.json({ error: "Keep the entry under 600 characters." }, { status: 400 });

    const localResult = parseTransactionText(input, products);
    const hasEachOrTotalAmbiguity = localResult.questions.some((question) => /each item or the total/i.test(question));
    if (hasEachOrTotalAmbiguity) return NextResponse.json(localResult);
    if (localResult.status === "ready") return NextResponse.json(localResult);
    try {
      const parsed = await parseWithAssistant(input, language, products);
      if (parsed) return NextResponse.json(parsed);
    } catch (error) {
      console.warn("Transaction interpretation service unavailable; local clarification rules used.", error);
    }
    return NextResponse.json(localResult);
  } catch {
    return NextResponse.json({ error: "Tunda could not read that entry. Try again." }, { status: 400 });
  }
}
