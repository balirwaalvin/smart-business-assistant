// Mock AI parsing logic for MVP
// In a real app, this would call OpenAI or Anthropic API

export async function parseTransaction(text: string) {
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

  // Simple keyword matching for MVP
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

  // Extract amount (number with currency symbol or just a number if it looks like price)
  // For MVP, let's just assign a mock price based on product if amount isn't explicitly stated
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

  // Extract customer (capitalized word that isn't at the start, or specific names)
  const commonNames = ['grace', 'treasure', 'james', 'john', 'mary', 'supplier'];
  for (const name of commonNames) {
    if (lowerText.includes(name)) {
      result.customer = name.charAt(0).toUpperCase() + name.slice(1);
      break;
    }
  }

  // If no amount was calculated, set a default
  if (result.amount === 0 && result.type !== 'payment') {
    result.amount = result.quantity * 1500; // Default 1500 per item
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return result;
}
