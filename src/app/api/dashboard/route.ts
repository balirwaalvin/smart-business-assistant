import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db';

export async function GET() {
  try {
    const metrics = getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
