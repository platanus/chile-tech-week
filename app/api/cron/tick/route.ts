import { NextResponse } from 'next/server';
import { tickJobs } from '@/src/lib/jobs';

export async function POST() {
  try {
    const results = await tickJobs();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Cron tick error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
