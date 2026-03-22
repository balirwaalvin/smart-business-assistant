import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getInventoryItems, upsertInventoryItem } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await getInventoryItems(userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const product = String(body.product || '').trim();

    if (!product) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const item = await upsertInventoryItem(userId, {
      product,
      quantity: Number(body.quantity) || 0,
      price: Number(body.price) || 0,
      cost_price: Number(body.cost_price) || 0,
      low_stock_threshold: Number(body.low_stock_threshold) || 5,
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error saving inventory item:', error);
    return NextResponse.json({ error: 'Failed to save inventory item' }, { status: 500 });
  }
}
