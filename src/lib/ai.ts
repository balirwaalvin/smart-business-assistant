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
 * Direct column-name mapper: handles common Excel header patterns
 * without relying on AI. Used as fallback when AI fails or is unavailable.
 */
function mapRowDirectly(row: Record<string, any>): any | null {
  // Helper to find a value by trying multiple possible column names
  const find = (keys: string[]): any => {
    for (const key of keys) {
      for (const col of Object.keys(row)) {
        if (col.toLowerCase().replace(/[^a-z]/g, '') === key.toLowerCase().replace(/[^a-z]/g, '')) {
          const val = row[col];
          if (val !== null && val !== undefined && val !== '') return val;
        }
      }
    }
    return null;
  };

  const product = find(['product', 'productname', 'item', 'itemname', 'description', 'goods', 'service']);
  const quantity = parseFloat(find(['quantity', 'qty', 'units', 'count', 'pieces', 'amount_qty']) || '1') || 1;
  const amount = parseFloat(String(find(['amount', 'total', 'price', 'totalprice', 'value', 'cost', 'totalamount', 'salesprice']) || '0').replace(/[^0-9.]/g, '')) || 0;
  const customer = find(['customer', 'client', 'buyer', 'name', 'supplier', 'vendor', 'person']) || 'walk-in';
  const rawDate = find(['date', 'transactiondate', 'saledate', 'purchasedate', 'datetime']);

  let type: 'sale' | 'purchase' | 'payment' = 'sale';
  const rawType = String(find(['type', 'transactiontype', 'category']) || '').toLowerCase();
  if (rawType.includes('purchase') || rawType.includes('buy') || rawType.includes('stock')) type = 'purchase';
  else if (rawType.includes('payment') || rawType.includes('pay')) type = 'payment';

  let payment_type: 'cash' | 'credit' = 'cash';
  const rawPayment = String(find(['paymenttype', 'payment', 'paymentmode', 'mode', 'paymentmethod']) || '').toLowerCase();
  if (rawPayment.includes('credit') || rawPayment.includes('owe') || rawPayment.includes('debt')) payment_type = 'credit';

  let date: string | null = null;
  if (rawDate) {
    try {
      date = new Date(rawDate).toISOString();
    } catch {
      date = null;
    }
  }

  // Skip completely empty rows
  if (!product && amount === 0 && customer === 'walk-in') return null;

  return { type, product: product || 'unknown', quantity, customer, payment_type, amount, date };
}
