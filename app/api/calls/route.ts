import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const callLogs = await prisma.callLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ callLogs })
  } catch (error) {
    console.error('Call Logs Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
