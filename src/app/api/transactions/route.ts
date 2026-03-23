import { NextResponse } from 'next/server';
import { addTransaction, getRecentTransactions } from '@/lib/db';
import { generateTransactionOverview, parseTransaction } from '@/lib/ai';
import { requireUserId } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    let parsedData = body.transaction;
    if (!parsedData) {
      const text = body.text;
      if (!text) {
        return NextResponse.json({ error: 'Transaction text is required' }, { status: 400 });
      }
      // Parse natural language when no structured payload is provided
      parsedData = await parseTransaction(text);
    }

    if (!parsedData?.type || parsedData.amount === undefined || parsedData.amount === null) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 });
    }

    // 2. Save to database
    const result = await addTransaction(parsedData, userId);

    // 3. AI overview for user clarity
    const overview = await generateTransactionOverview(parsedData);

    return NextResponse.json({
      success: true,
      id: result.id,
      lowStockAlert: result.lowStockAlert ?? null,
      overview,
      parsed: parsedData
    });
  } catch (error) {
    console.error('Error processing transaction:', error);
    return NextResponse.json({ error: 'Failed to process transaction' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await getRecentTransactions(userId);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
