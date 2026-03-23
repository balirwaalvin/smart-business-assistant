import Anthropic from '@anthropic-ai/sdk';

// Initialize Claude client using server-side environment variables.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

function getClaudeText(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

export async function parseTransaction(text: string) {
  try {
    // If no API key is provided, fall back to mock logic
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('No ANTHROPIC_API_KEY found, falling back to mock parser');
      return mockParseTransaction(text);
    }

    const prompt = `
      You are a business assistant parsing transaction logs for a small business in Uganda.
      Extract the specific information from the text and return ONLY a valid JSON object.
      
      Text: "${text}"
      
      Required JSON structure:
      {
        "type": "sale" | "purchase" | "payment" | "expense",
        "product": "string (the full name of the item/expense category, e.g., 'Boxes of Milk', 'Salary', 'Rent', or null if simple payment)",
        "quantity": number (default to 1 if not specified),
        "customer": "string (exact name of person/supplier/payee from the text, or 'walk-in' if not specified)",
        "payment_type": "cash" | "credit",
        "amount": number (the calculated total value in UGX. If stated as 'at X each' or 'X per item', you MUST multiply quantity by X. For example, '10 at 30000 each' means amount must be 300000. If the total is explicitly stated like 'for 50000', simply use 50000. Do not invent prices not in the text)
      }
      
      Rules:
      - NEVER fabricate or guess prices. Extract only exactly what the user mentioned.
      - If they bought stock/inventory, type is "purchase".
      - If they sold something, type is "sale".
      - If someone is paying off a debt, type is "payment".
      - If they mention salary, wages, musaala, rent, electricity bill, water bill, phone bill, fuel, transport costs, internet bill, utilities, or any staff/employee payment → type is "expense". Set product to the expense category (e.g., 'Salary', 'Rent', 'Electricity').
      - If they say "on credit" or "owes", payment_type is "credit".
      - Return ONLY the JSON object, no markdown formatting, no backticks.
    `;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.1,
    });

    const responseText = getClaudeText(response) || '{}';
    // Clean up any potential markdown formatting
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    // Fallback to mock parser on error
    return mockParseTransaction(text);
  }
}

export async function generateTransactionOverview(transaction: {
  type?: string;
  product?: string | null;
  quantity?: number;
  payment_type?: string;
  amount?: number;
  notes?: string;
  customer?: string | null;
}) {
  const type = String(transaction.type || '').toLowerCase();
  const product = String(transaction.product || 'item').trim();
  const quantity = Number(transaction.quantity || 1);
  const paymentType = String(transaction.payment_type || 'cash').toLowerCase();
  const amount = Number(transaction.amount || 0);
  const customer = String(transaction.customer || '').trim();

  const fallback = (() => {
    const actor = customer ? `with ${customer}` : '';
    if (type === 'purchase') {
      return `You are recording a ${paymentType} purchase of ${quantity} ${product} for UGX ${amount.toLocaleString()} ${actor}. This increases stock.`.trim();
    }
    if (type === 'sale') {
      return `You are recording a ${paymentType} sale of ${quantity} ${product} for UGX ${amount.toLocaleString()} ${actor}. This reduces stock and increases sales.`.trim();
    }
    if (type === 'expense') {
      return `You are recording an expense of UGX ${amount.toLocaleString()} for ${product}. This reduces cash and affects profit.`;
    }
    if (type === 'drawing') {
      return `You are recording an owner drawing of UGX ${amount.toLocaleString()} for ${product}. This reduces business cash.`;
    }
    return `You are recording a transaction of UGX ${amount.toLocaleString()} for ${product}.`;
  })();

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return fallback;
    }

    const prompt = `
You are TUNDA AI. Write one brief, user-friendly summary (max 28 words) explaining this transaction clearly.

Transaction JSON:
${JSON.stringify({ type, product, quantity, paymentType, amount, customer })}

Rules:
- Keep it practical and simple.
- Mention accounting effect in plain terms.
- No markdown. One sentence only.
`;

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.2,
    });

    const text = getClaudeText(response);
    return text || fallback;
  } catch (error) {
    console.error('Error generating transaction overview:', error);
    return fallback;
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

  // Simple keyword matching — expense must be checked FIRST to avoid misclassification
  const expenseKeywords = [
    'salary', 'salaries', 'wage', 'wages', 'musaala', 'rent', 'electricity',
    'water bill', 'phone bill', 'internet bill', 'fuel', 'transport cost',
    'utilities', 'utility', 'staff payment', 'employee payment', 'overhead'
  ];
  if (expenseKeywords.some(kw => lowerText.includes(kw))) {
    result.type = 'expense';
    // Set product to the expense category if not yet detected
    result.product = 'expense';
  } else if (lowerText.includes('bought') || lowerText.includes('received') || lowerText.includes('supplier')) {
    result.type = 'purchase';
  } else if (lowerText.includes('paid') && lowerText.includes('credit')) {
    result.type = 'payment';
  }

  if (lowerText.includes('credit') || lowerText.includes('owe')) {
    result.payment_type = 'credit';
  }

  // Extract numbers to guess quantity and amount
  const numbers = (text.match(/\d+/g) || []).map(Number);
  if (numbers.length > 0) {
    if (numbers.length > 1) {
      if (lowerText.includes('each') || lowerText.includes(' at ')) {
        result.quantity = numbers[0];
        result.amount = numbers[0] * numbers[1];
      } else {
        result.amount = Math.max(...numbers);
        result.quantity = Math.min(...numbers);
        if (result.quantity === result.amount) result.quantity = 1;
      }
    } else {
      result.amount = numbers[0];
    }
  }

  // Extract customer
  const commonNames = ['grace', 'treasure', 'james', 'john', 'mary', 'supplier', 'peter', 'paul'];
  for (const name of commonNames) {
    if (lowerText.includes(name)) {
      result.customer = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
  }

  // basic product extraction
  const productMatch = text.match(/(?:sold|bought|record)?\s*(?:\d+\s+)?(.+?)(?:\s+at|\s+for|\s+each|\d|$)/i);
  if (productMatch && productMatch[1] && productMatch[1].trim().length > 2) {
    result.product = productMatch[1].trim();
  } else {
    const productWords = ['soda', 'cake', 'sugar', 'bread', 'milk', 'phone', 'laptop', 'coffee', 'shoes', 'shirt'];
    for (const product of productWords) {
      if (lowerText.includes(product)) {
        result.product = product;
        break;
      }
    }
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return result;
}

// Analyze raw Excel rows and map them to transaction format using Claude
export async function analyzeExcelRows(rows: Record<string, any>[]): Promise<any[]> {
  if (rows.length === 0) return [];

  // --- Smart pre-processor: detect & handle sparse/grouped Excel layouts ---
  // These are sheets where dates only appear on the first row of a group,
  // totals rows are mixed in, and payment columns may hold numbers directly.
  const preProcessed = preProcessSparseSheet(rows);
  if (preProcessed.length > 0) {
    console.log(`[AI] Pre-processor extracted ${preProcessed.length} transactions directly`);
    return preProcessed;
  }

  // --- Fallback: direct column-name mapping (no API key) ---
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('No ANTHROPIC_API_KEY — using direct column mapper for Excel rows');
    return rows.map(row => mapRowDirectly(row)).filter(Boolean) as any[];
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
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.1,
      });

      const text = getClaudeText(response) || '[]';
      const cleanJson = text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

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

    // Per-batch fallback if AI returned nothing
    if (batchParsed.length === 0) {
      console.warn(`Batch ${i / batchSize + 1}: AI returned 0 results — using direct column mapper`);
      batchParsed = batch.map(row => mapRowDirectly(row)).filter(Boolean) as any[];
    }

    results.push(...batchParsed);
  }

  return results;
}

/**
 * Pre-processor for sparse/grouped Excel sheets commonly used in manual bookkeeping.
 * Handles patterns like:
 *  - Dates only on the first row of a daily group
 *  - Subtotal rows mixed with transaction rows
 *  - Amount values sitting directly under a "Payment Method" or similar header column
 *  - Multiple payment type columns (e.g. Cash vs Momo side by side)
 */
function preProcessSparseSheet(rows: Record<string, any>[]): any[] {
  if (rows.length === 0) return [];

  const cols = Object.keys(rows[0]);

  // Detect column roles using fuzzy matching
  const findCol = (keywords: string[]) =>
    cols.find(c => keywords.some(kw =>
      c.toLowerCase().replace(/[^a-z0-9]/g, '').includes(kw.toLowerCase().replace(/[^a-z0-9]/g, ''))
    ));

  const dateCol = findCol(['date', 'day']);
  const productCol = findCol(['coffee', 'item', 'product', 'goods', 'description', 'particulars', 'service', 'type']);
  const totalCol = findCol(['totalsale', 'totalsales', 'total', 'grandtotal', 'dailytotal']);

  // Find all numeric columns (likely payment/amount columns)
  // A column is "numeric" if >30% of non-null values are numbers
  const numericCols: string[] = [];
  for (const col of cols) {
    const nonNull = rows.filter(r => r[col] !== null && r[col] !== undefined && String(r[col]).trim() !== '');
    const numCount = nonNull.filter(r => typeof r[col] === 'number' || !isNaN(Number(String(r[col]).replace(/[^0-9.]/g, '')))).length;
    if (nonNull.length > 0 && numCount / nonNull.length > 0.3) {
      numericCols.push(col);
    }
  }

  // If we can't identify the minimum structure, skip this pre-processor
  if (!productCol && numericCols.length === 0) return [];

  const transactions: any[] = [];
  let lastDate: string | null = null;

  for (const row of rows) {
    // --- Skip subtotal/header rows ---
    // A subtotal row: has a value in the total column, but no product
    const hasTotal = totalCol && row[totalCol] !== null && row[totalCol] !== undefined && String(row[totalCol]).trim() !== '';
    const hasProduct = productCol && row[productCol] !== null && row[productCol] !== undefined && String(row[productCol]).trim() !== '';
    const productStr = hasProduct ? String(row[productCol]).trim() : '';

    // Skip rows that are pure header/label rows (no numbers anywhere)
    const anyNumber = numericCols.some(c => typeof row[c] === 'number');
    const isHeaderRow = !hasProduct && !anyNumber;
    if (isHeaderRow) continue;

    // Skip subtotal-only rows (has total column filled, no named product)
    if (hasTotal && !hasProduct) continue;

    // --- Carry date forward ---
    if (dateCol && row[dateCol] !== null && row[dateCol] !== undefined && String(row[dateCol]).trim() !== '') {
      try {
        lastDate = new Date(row[dateCol]).toISOString();
      } catch {
        // Keep previous date if parse fails (e.g. "27th Jan, 2026")
        const raw = String(row[dateCol]).replace(/(\d+)(st|nd|rd|th)/, '$1');
        try { lastDate = new Date(raw).toISOString(); } catch { /* keep lastDate */ }
      }
    }

    // --- Determine amount and payment type ---
    // Walk numeric columns: the one with a value determines payment type & amount
    // Column name clue: "Cash" → cash, "Momo"/"Mobile"/"Bank"/"Credit" → credit
    let amount = 0;
    let payment_type: 'cash' | 'credit' = 'cash';

    for (const col of numericCols) {
      const val = row[col];
      if (val === null || val === undefined) continue;
      const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        amount = num;
        const colLower = col.toLowerCase();
        if (colLower.includes('momo') || colLower.includes('mobile') || colLower.includes('bank') ||
          colLower.includes('credit') || colLower.includes('transfer') || colLower.includes('empty_1')) {
          payment_type = 'credit'; // Momo is effectively non-cash
        }
        break; // Use the first non-zero numeric column
      }
    }

    // Skip rows with no product name AND no amount
    if (!hasProduct && amount === 0) continue;

    transactions.push({
      type: 'sale',
      product: productStr || 'Coffee',
      quantity: 1,
      customer: 'walk-in',
      payment_type,
      amount,
      date: lastDate,
    });
  }

  return transactions;
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
