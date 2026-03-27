import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const DEFAULT_ANTHROPIC_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
];

function getAnthropicModelCandidates(): string[] {
  const fromEnv = String(process.env.ANTHROPIC_MODEL || '').trim();
  if (!fromEnv) return DEFAULT_ANTHROPIC_MODELS;
  return [fromEnv, ...DEFAULT_ANTHROPIC_MODELS];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOverloadedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  return msg.includes('overloaded_error') || msg.includes('status: 529') || msg.includes('Overloaded');
}

function parseAmountFromText(input: string): number {
  const text = input.toLowerCase();
  const cleaned = text.replace(/,/g, '');
  const amountMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(k|m)?\b/);
  if (!amountMatch) return 0;

  const value = Number(amountMatch[1] || 0);
  const suffix = amountMatch[2] || '';
  if (suffix === 'k') return Math.round(value * 1000);
  if (suffix === 'm') return Math.round(value * 1000000);
  return Math.round(value);
}

function classifyFallback(text: string, lang: string) {
  const sample = String(text || '').toLowerCase();
  const isCredit = /\bcredit\b|\bowes\b|\bdebt\b|\banjanja\b|\bbanja\b/.test(sample);
  const isSale = /\bsold\b|\bsale\b|\btunda\b|\bkutunda\b|\bnsubizza\b/.test(sample);
  const isPurchase = /\bbought\b|\bpurchase\b|\brestock\b|\bbuy\b|\bgula\b|\bagguliddwa\b/.test(sample);
  const isExpense = /\bexpense\b|\brent\b|\bsalary\b|\bwages\b|\bfuel\b|\btransport\b|\butilities\b|\belectricity\b|\bwater\b|\bmusaala\b|\bensaasaanya\b/.test(sample);
  const isDrawing = /\bdrawing\b|\bwithdraw\b|\bowner took\b|\bowner removed\b|\bokukwata\b/.test(sample);

  let type: 'cashSale' | 'creditSale' | 'cashPurchase' | 'creditPurchase' | 'expense' | 'drawing' = 'cashSale';
  if (isDrawing) {
    type = 'drawing';
  } else if (isExpense) {
    type = 'expense';
  } else if (isPurchase) {
    type = isCredit ? 'creditPurchase' : 'cashPurchase';
  } else if (isSale) {
    type = isCredit ? 'creditSale' : 'cashSale';
  } else {
    type = isCredit ? 'creditSale' : 'cashSale';
  }

  const amount = parseAmountFromText(sample);
  return {
    type,
    product: 'General',
    quantity: 1,
    amount,
    customer: type.includes('Purchase') ? 'supplier' : 'walk-in',
    payment_type: isCredit ? 'credit' : 'cash',
    confidence: 0.45,
    explanation:
      lang === 'luganda'
        ? 'AI efuuse overload, tukozesezza fallback classifier okwanguyiza okutereka transaction.'
        : 'AI service was overloaded, so a fallback classifier was used to keep transaction entry working.',
  };
}

async function createAnthropicMessageWithFallback(params: {
  messages: Anthropic.Messages.MessageParam[];
  max_tokens: number;
  temperature: number;
}) {
  const models = getAnthropicModelCandidates();
  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await client.messages.create({
          model,
          messages: params.messages,
          max_tokens: params.max_tokens,
          temperature: params.temperature,
        });
        return { response, model };
      } catch (error) {
        lastError = error;
        if (error instanceof Error && error.message.includes('not_found_error')) {
          break;
        }

        if (isOverloadedError(error) && attempt < 2) {
          const backoffMs = 500 * Math.pow(2, attempt);
          await sleep(backoffMs);
          continue;
        }

        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All models failed');
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, lang } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const languageHint = lang === 'luganda' 
      ? 'The user may be using Luganda (a Bantu language from Uganda). Be prepared to parse mixed English-Luganda text.'
      : 'Use English for parsing.';

    const prompt = `You are an intelligent business accounting assistant. Analyze the following user input and classify it into a transaction.

${languageHint}

User input: "${text}"

Based on this input, determine:
1. Transaction type: Must be one of: "cashSale", "creditSale", "cashPurchase", "creditPurchase", "expense", "drawing"
2. Product name (if applicable)
3. Quantity (if applicable, default to 1)
4. Amount in UGX (currency of Uganda)
5. Customer/person name (if mentioned, otherwise "walk-in" or "supplier")
6. Payment type: "cash" or "credit"
7. A brief explanation of your classification

Rules:
- A "sale" is when the business SELLS to customers (revenue)
- A "purchase" is when the business BUYS stock/inventory
- "expense" is operational cost (rent, utilities, transport, etc.)
- "drawing" is owner withdrawing cash/goods for personal use
- "cashSale" or "cashPurchase" = payment received/made in cash immediately
- "creditSale" or "creditPurchase" = payment on credit (deferred)
- Default quantity to 1 if not mentioned
- Default payment to "cash" unless explicitly stated otherwise
- Try to extract product names intelligently from context

Respond ONLY with valid JSON, no markdown or extra text:
{
  "type": "cashSale|creditSale|cashPurchase|creditPurchase|expense|drawing",
  "product": "Product name or description",
  "quantity": 1,
  "amount": 50000,
  "customer": "Customer/supplier name or walk-in",
  "payment_type": "cash|credit",
  "confidence": 0.95,
  "explanation": "Brief explanation of the classification"
}`;

    let response: Anthropic.Messages.Message;
    try {
      const anthropicResult = await createAnthropicMessageWithFallback({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      });
      response = anthropicResult.response;
    } catch (error) {
      if (isOverloadedError(error)) {
        return NextResponse.json(classifyFallback(text, lang));
      }
      throw error;
    }

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Clean up potential markdown
    let cleanedText = textContent.text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }

    const classification = JSON.parse(cleanedText.trim());

    // Validate response structure
    if (!classification.type || !classification.amount) {
      return NextResponse.json(
        { error: 'Failed to extract required transaction fields' },
        { status: 400 }
      );
    }

    return NextResponse.json(classification);
  } catch (error) {
    console.error('Classification error:', error);
    const message = error instanceof Error ? error.message : 'Classification failed';
    if (isOverloadedError(error)) {
      return NextResponse.json({
        type: 'cashSale',
        product: 'General',
        quantity: 1,
        amount: 0,
        customer: 'walk-in',
        payment_type: 'cash',
        confidence: 0.35,
        explanation: 'AI overloaded; fallback mode used. Please review fields before confirming.'
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
