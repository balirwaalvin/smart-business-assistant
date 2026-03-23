import { NextResponse } from 'next/server';
import { addInventoryStock, getInventoryItems, upsertInventoryItem } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
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
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const product = String(body.product || '').trim();

    if (!product) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const mode = String(body.mode || '').trim().toLowerCase();

    const item = mode === 'add-stock'
      ? await addInventoryStock(userId, {
          product,
          quantity: Number(body.quantity) || 0,
          price: Number(body.price) || 0,
          cost_price: Number(body.cost_price) || 0,
          low_stock_threshold: Number(body.low_stock_threshold) || 5,
        })
      : await upsertInventoryItem(userId, {
          product,
          quantity: Number(body.quantity) || 0,
          price: Number(body.price) || 0,
          cost_price: Number(body.cost_price) || 0,
          low_stock_threshold: Number(body.low_stock_threshold) || 5,
        });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error saving inventory item:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to save inventory item',
      },
      { status: 500 }
    );
  }
}
