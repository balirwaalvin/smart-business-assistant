import { NextResponse } from "next/server";
import {
  DraftTransaction,
  parseTransaction,
  TransactionKind,
  verifyTransactionMath,
} from "@/lib/demo-engine";

export const runtime = "nodejs";

const requestWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const GLOBAL_RATE_LIMIT = 100;
const MAX_RATE_KEYS = 500;
let globalRequestWindow = { count: 0, resetAt: 0 };

function resolveClientId(request: Request) {
  const forwardedFor = request.headers.get("x-vercel-forwarded-for")
    || request.headers.get("x-forwarded-for");
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || forwardedFor?.split(",").at(-1)?.trim()
    || "unknown";
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  if (globalRequestWindow.resetAt <= now) globalRequestWindow = { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (globalRequestWindow.count >= GLOBAL_RATE_LIMIT) return false;

  for (const [key, value] of requestWindows) {
    if (value.resetAt <= now) requestWindows.delete(key);
  }

  const clientId = resolveClientId(request);
  const requestWindow = requestWindows.get(clientId);
  if (!requestWindow) {
    if (requestWindows.size >= MAX_RATE_KEYS) return false;
    requestWindows.set(clientId, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else if (requestWindow.count >= RATE_LIMIT) {
    return false;
  } else {
    requestWindow.count += 1;
  }

  globalRequestWindow.count += 1;
  return true;
}

const transactionKinds: TransactionKind[] = [
  "cash_sale",
  "credit_sale",
  "expense",
  "purchase",
  "customer_payment",
];

const paymentMethods: DraftTransaction["paymentMethod"][] = ["cash", "mobile_money", "credit"];

const responseSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: transactionKinds },
    amount: { type: "number", description: "The total transaction amount in UGX, not a unit price." },
    quantity: { type: "number", description: "Item quantity; use 1 when it is not stated." },
    item: { type: "string", description: "Short product or item name, or an empty string." },
    party: { type: "string", description: "Customer or supplier name, or an empty string." },
    paymentMethod: { type: "string", enum: paymentMethods },
    confidence: { type: "number", description: "Confidence from 0 to 100." },
  },
  required: ["kind", "amount", "quantity", "item", "party", "paymentMethod", "confidence"],
};

type GeminiResponse = {
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function normalizeGeminiDraft(value: unknown, input: string): DraftTransaction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!transactionKinds.includes(candidate.kind as TransactionKind)) return null;
  if (!paymentMethods.includes(candidate.paymentMethod as DraftTransaction["paymentMethod"])) return null;

  const amount = Number(candidate.amount);
  const quantity = Number(candidate.quantity);
  const confidence = Number(candidate.confidence);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const localDraft = parseTransaction(input);
  return verifyTransactionMath(input, {
    kind: candidate.kind as TransactionKind,
    description: input,
    amount,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    item: String(candidate.item ?? "").trim() || undefined,
    party: String(candidate.party ?? "").trim() || undefined,
    paymentMethod: candidate.paymentMethod as DraftTransaction["paymentMethod"],
    confidence: Number.isFinite(confidence) ? Math.min(100, Math.max(0, confidence)) : 85,
    ...(localDraft
      ? {
          kind: localDraft.kind,
          item: localDraft.item ?? (String(candidate.item ?? "").trim() || undefined),
          party: localDraft.party ?? (String(candidate.party ?? "").trim() || undefined),
          paymentMethod: localDraft.paymentMethod,
        }
      : {}),
  });
}

async function parseWithGemini(input: string, language: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are Tunda, a business transaction interpreter for African micro and small businesses.
Interpret the user's plain-language transaction, which may mix Ugandan English and Luganda.
Return only the requested structured object.

Rules:
- Never invent an amount, quantity, product, person, or payment method.
- amount must be the TOTAL in UGX. If the user says quantity at a unit price "each" or "per item", multiply quantity by unit price.
- "for UGX X" or "total X" states the total directly.
- Use cash unless mobile money or credit is clearly stated.
- Use canonical item names Soda, Bread, Milk, Sugar, or Rice when those products are mentioned.
- A customer paying an existing debt is customer_payment, not a sale.
- Buying or restocking goods is purchase; paying rent, utilities, wages, or transport is expense.
- Luganda "Naguze", "nguze", "tuguze", and "twaguze" mean bought/purchased and must be classified as purchase.
- The selected interface language is ${language === "lg" ? "Luganda" : "English"}.

User transaction: ${JSON.stringify(input)}`;

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({
      model: "gemini-3.5-flash-lite",
      store: false,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: responseSchema,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}`);
  const payload = await response.json() as GeminiResponse;
  const outputText = payload.steps
    ?.filter((step) => step.type === "model_output")
    .flatMap((step) => step.content ?? [])
    .filter((content) => content.type === "text")
    .map((content) => content.text ?? "")
    .join("")
    .trim();

  if (!outputText) return null;
  return normalizeGeminiDraft(JSON.parse(outputText), input);
}

export async function POST(request: Request) {
  try {
    if (!consumeRateLimit(request)) {
      return NextResponse.json({ error: "Tunda is receiving many requests. Please wait a moment and try again." }, { status: 429 });
    }

    const body = await request.json() as { text?: unknown; language?: unknown };
    const input = typeof body.text === "string" ? body.text.trim() : "";
    const language = body.language === "lg" ? "lg" : "en";
    if (!input) return NextResponse.json({ error: "Enter a transaction first." }, { status: 400 });
    if (input.length > 500) return NextResponse.json({ error: "Keep the transaction under 500 characters." }, { status: 400 });

    try {
      const geminiDraft = await parseWithGemini(input, language);
      if (geminiDraft) return NextResponse.json({ transaction: geminiDraft, source: "gemini" });
    } catch (error) {
      console.warn("Gemini transaction parsing unavailable; using verified local parser.", error);
    }

    const localDraft = parseTransaction(input);
    if (!localDraft) {
      return NextResponse.json({ error: "Tunda could not identify that transaction. Add what happened, the quantity, and the amount." }, { status: 422 });
    }
    return NextResponse.json({ transaction: localDraft, source: "local" });
  } catch {
    return NextResponse.json({ error: "Tunda could not read that entry. Please try again." }, { status: 400 });
  }
}
