import { NextResponse } from 'next/server';
import { addTransaction, getRecentTransactions } from '@/lib/db';
import { parseTransaction } from '@/lib/ai';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Transaction text is required' }, { status: 400 });
    }

    // 1. Parse natural language
    const parsedData = await parseTransaction(text);

    // 2. Save to database
    const id = addTransaction(parsedData);

    return NextResponse.json({ 
      success: true, 
      id, 
      parsed: parsedData 
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const transactions = getRecentTransactions();
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
