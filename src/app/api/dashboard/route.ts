import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = await getDashboardMetrics(userId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
