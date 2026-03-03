import Groq from 'groq-sdk';

// Initialize Groq client (free tier — no billing required)
const client = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function parseTransaction(text: string) {
  try {
    // If no API key is provided, fall back to mock logic
    if (!process.env.GROQ_API_KEY) {
      console.warn('No GROQ_API_KEY found, falling back to mock parser');
      return mockParseTransaction(text);
    }

    const prompt = `
      You are a business assistant parsing transaction logs for a small business in Uganda.
      Extract the following information from the text and return ONLY a valid JSON object.
      
      Text: "${text}"
      
      Required JSON structure:
      {
        "type": "sale" | "purchase" | "payment",
        "product": "string (name of the item, or null if payment)",
        "quantity": number (default to 1 if not specified),
        "customer": "string (name of person/supplier, or 'walk-in' if not specified)",
        "payment_type": "cash" | "credit",
        "amount": number (total value in UGX, extract from text or estimate if missing)
      }
      
      Rules:
      - If they bought stock/inventory, type is "purchase".
      - If they sold something, type is "sale".
      - If someone is paying off a debt, type is "payment".
      - If they say "on credit" or "owes", payment_type is "credit".
      - Return ONLY the JSON object, no markdown formatting, no backticks.
    `;

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const responseText = response.choices[0].message.content || '{}';
    // Clean up any potential markdown formatting
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Error calling Groq API:', error);
    // Fallback to mock parser on error
    return mockParseTransaction(text);
  }
}

async function mockParseTransaction(text: string) {
  const lowerText = text.toLowerCase();

  // Default structure
  const result = {
    type: 'sale',
    product: 'unknown',
    quantity: 1,
    customer: 'walk-in',
    payment_type: 'cash',
    amount: 0
  };

  // Simple keyword matching
  if (lowerText.includes('bought') || lowerText.includes('received') || lowerText.includes('supplier')) {
    result.type = 'purchase';
  } else if (lowerText.includes('paid') && lowerText.includes('credit')) {
    result.type = 'payment';
  }

  if (lowerText.includes('credit') || lowerText.includes('owe')) {
    result.payment_type = 'credit';
  }

  // Extract quantity (first number found)
  const quantityMatch = text.match(/\d+/);
  if (quantityMatch) {
    result.quantity = parseInt(quantityMatch[0], 10);
  }

  const mockPrices: Record<string, number> = {
    'soda': 1500,
    'cake': 3000,
    'sugar': 4500,
    'bread': 2500,
    'milk': 2000
  };

  // Extract product
  for (const product of Object.keys(mockPrices)) {
    if (lowerText.includes(product)) {
      result.product = product;
      result.amount = result.quantity * mockPrices[product];
      break;
    }
  }

  // Extract customer
  const commonNames = ['grace', 'treasure', 'james', 'john', 'mary', 'supplier'];
  for (const name of commonNames) {
    if (lowerText.includes(name)) {
      result.customer = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
  }

  if (result.amount === 0 && result.type !== 'payment') {
    result.amount = result.quantity * 1500;
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return result;
}

// Analyze raw Excel rows and map them to transaction format using Groq
export async function analyzeExcelRows(rows: Record<string, any>[]): Promise<any[]> {
  if (rows.length === 0) return [];

  // --- Fallback: direct column-name mapping (always runs first if no API key) ---
  if (!process.env.GROQ_API_KEY) {
    console.warn('No GROQ_API_KEY — using direct column mapper for Excel rows');
    return rows.map(row => mapRowDirectly(row)).filter(Boolean);
  }

  const results: any[] = [];

  // Smaller batches (10 rows) to avoid token overflow / truncated JSON
  const batchSize = 10;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    const prompt = `
You are a business data analyst. Map each row from this Excel spreadsheet (from a small business in Uganda) to a structured transaction object.

Rows (JSON):
${JSON.stringify(batch, null, 2)}

Return ONLY a valid JSON array. Each element must have:
{
  "type": "sale" | "purchase" | "payment",
  "product": "string or null",
  "quantity": number (default 1),
  "customer": "string or walk-in",
  "payment_type": "cash" | "credit",
  "amount": number (in UGX),
  "date": "ISO date string if found, else null"
}

Rules:
- Map columns like Item, Product Name, Qty, Quantity, Total, Amount, Price, Client, Customer, Supplier, Type, Payment Mode, Date, etc.
- If type cannot be determined, default to "sale".
- If payment type cannot be determined, default to "cash".
- Return ONLY the JSON array, no markdown, no backticks, no explanations.
    `;

    let batchParsed: any[] = [];

    try {
      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.1,
      });

      const text = response.choices[0].message.content || '[]';
      // Aggressively clean markdown formatting
      const cleanJson = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      // Extract the first JSON array found (handles responses with extra text)
      const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed)) {
          batchParsed = parsed;
        }
      }
    } catch (error) {
      console.error(`AI analysis failed for batch ${i / batchSize + 1}:`, error);
    }

    // If AI returned nothing for this batch, fall back to direct mapping
    if (batchParsed.length === 0) {
      console.warn(`Batch ${i / batchSize + 1}: AI returned 0 results — using direct column mapper`);
      batchParsed = batch.map(row => mapRowDirectly(row)).filter(Boolean);
    }

    results.push(...batchParsed);
  }

  return results;
}

/**
 * Direct column-name mapper: handles ANY Excel header patterns.
 * Uses fuzzy substring matching and as a last resort scans all column
 * values — so no valid row is ever silently discarded.
 */
function mapRowDirectly(row: Record<string, any>): any | null {
  const cols = Object.keys(row);
  if (cols.length === 0) return null;

  // Fuzzy finder: checks if a column name CONTAINS any of the keywords
  const findFuzzy = (keywords: string[]): any => {
    for (const col of cols) {
      const colNorm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const kw of keywords) {
        if (colNorm.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
          const val = row[col];
          if (val !== null && val !== undefined && String(val).trim() !== '') return val;
        }
      }
    }
    return null;
  };

  // --- Extract each field with fuzzy matching ---
  const product = findFuzzy(['product', 'item', 'goods', 'description', 'service', 'particulars', 'detail', 'name']);
  const rawQty = findFuzzy(['qty', 'quantity', 'units', 'count', 'pieces', 'no', 'num']);
  const rawAmt = findFuzzy(['amount', 'total', 'price', 'value', 'cost', 'ugx', 'sales', 'revenue', 'income', 'paid']);
  const customer = findFuzzy(['customer', 'client', 'buyer', 'supplier', 'vendor', 'person', 'name', 'party']);
  const rawDate = findFuzzy(['date', 'day', 'time', 'period', 'created']);
  const rawType = String(findFuzzy(['type', 'category', 'transaction', 'kind']) || '').toLowerCase();
  const rawPay = String(findFuzzy(['payment', 'mode', 'method', 'cash', 'credit', 'bank']) || '').toLowerCase();

  const quantity = parseFloat(String(rawQty ?? '1').replace(/[^0-9.]/g, '')) || 1;
  const amount = parseFloat(String(rawAmt ?? '0').replace(/[^0-9.]/g, '')) || 0;

  let type: 'sale' | 'purchase' | 'payment' = 'sale';
  if (rawType.includes('purchase') || rawType.includes('buy') || rawType.includes('stock') || rawType.includes('expense'))
    type = 'purchase';
  else if (rawType.includes('payment') || rawType.includes('pay') || rawType.includes('receipt'))
    type = 'payment';

  let payment_type: 'cash' | 'credit' = 'cash';
  if (rawPay.includes('credit') || rawPay.includes('owe') || rawPay.includes('debt') || rawPay.includes('loan'))
    payment_type = 'credit';

  let date: string | null = null;
  if (rawDate) {
    try { date = new Date(rawDate).toISOString(); } catch { date = null; }
  }

  // --- Last-resort scan: pick first string and first number from ANY column ---
  let fallbackProduct: string | null = null;
  let fallbackAmount = 0;
  for (const col of cols) {
    const val = row[col];
    if (val === null || val === undefined || String(val).trim() === '') continue;
    if (!fallbackProduct && typeof val === 'string' && isNaN(Number(val))) {
      fallbackProduct = String(val).trim();
    }
    if (fallbackAmount === 0 && typeof val === 'number' && val > 0) {
      fallbackAmount = val;
    }
  }

  const finalProduct = product || fallbackProduct;
  const finalAmount = amount > 0 ? amount : fallbackAmount;
  const finalCustomer = customer || 'walk-in';

  // Only skip the row if there is truly nothing in it
  if (!finalProduct && finalAmount === 0) return null;

  return {
    type,
    product: finalProduct || 'unknown',
    quantity,
    customer: finalCustomer,
    payment_type,
    amount: finalAmount,
    date,
  };
}
