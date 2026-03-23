import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db';

export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ success: true, message: 'Appwrite connection verified' });
  } catch (error) {
    console.error('Error verifying Appwrite connection:', error);
    return NextResponse.json({ error: 'Failed to verify Appwrite connection' }, { status: 500 });
  }
}
