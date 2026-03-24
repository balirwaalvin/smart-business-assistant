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
    const requestedLang = body?.lang === 'lg' ? 'lg' : 'en';

    // Accept 3 payload styles:
    // 1) { transaction: { ... } }
    // 2) Direct structured payload: { type, amount, ... }
    // 3) Natural language text: { text } / { transactionText } / { transaction_text }
    let parsedData = body.transaction;

    if (!parsedData && body?.type) {
      parsedData = body;
    }

    if (!parsedData) {
      const text =
        (typeof body.text === 'string' ? body.text : '') ||
        (typeof body.transactionText === 'string' ? body.transactionText : '') ||
        (typeof body.transaction_text === 'string' ? body.transaction_text : '');

      if (!text || !text.trim()) {
        return NextResponse.json(
          { error: 'Provide structured transaction fields or transaction text.' },
          { status: 400 }
        );
      }

      // Parse natural language when no structured payload is provided
      parsedData = await parseTransaction(text.trim());
    }

    if (!parsedData?.type || parsedData.amount === undefined || parsedData.amount === null) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 });
    }

    // 2. Save to database
    const result = await addTransaction(parsedData, userId);

    // 3. AI overview for user clarity
    const overview = await generateTransactionOverview(parsedData, requestedLang);

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
