import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { generateBusinessInsights } from '@/lib/ai';

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = await getDashboardMetrics(userId);
    console.log('🔵 [Insights API] Metrics retrieved:', { cashRevenue: metrics?.cashRevenue, totalPurchases: metrics?.totalPurchases });
    
    const insights = await generateBusinessInsights(metrics);
    console.log('🔵 [Insights API] Insights generated:', { source: insights.source });

    return NextResponse.json({
      success: true,
      source: insights.source,
      overview: insights.overview,
      recommendations: insights.recommendations,
      statistics: insights.statistics,
      cardAdvice: insights.cardAdvice,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('🔴 [Insights API] Error generating insights:', {
      message: errorMessage,
      stack: errorStack,
    });
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        details: errorMessage,
        source: 'fallback',
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
