import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const history = await prisma.priceHistory.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(history);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
