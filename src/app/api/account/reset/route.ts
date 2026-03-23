import { NextResponse } from 'next/server';
import { clearUserRecords } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId(request);
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
