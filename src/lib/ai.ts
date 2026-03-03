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
