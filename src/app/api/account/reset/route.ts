import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clearUserRecords } from '@/lib/db';

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedCounts = await clearUserRecords(userId);
    return NextResponse.json({
      success: true,
      message: 'Account records cleared successfully',
      deleted: deletedCounts,
    });
  } catch (error) {
    console.error('Error clearing account records:', error);
    return NextResponse.json({ error: 'Failed to clear account records' }, { status: 500 });
  }
}
