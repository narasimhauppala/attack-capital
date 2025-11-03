import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callLog = await prisma.callLog.findUnique({
      where: { id: params.id },
      include: {
        events: {
          orderBy: { timestamp: 'desc' },
        },
      },
    })

    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    return NextResponse.json({ callLog })
  } catch (error) {
    console.error('Call Log Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
