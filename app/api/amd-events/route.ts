import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { jambonzEventSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const callLogId = searchParams.get('callLogId')

    if (!callLogId) {
      return NextResponse.json({ error: 'Missing callLogId' }, { status: 400 })
    }

    const body = await request.json()
    const validated = jambonzEventSchema.parse(body)

    // Find the call log
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    })

    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    // Map Jambonz event to our result
    const amdResult = validated.event === 'amd_human_detected' ? 'human' : 'machine'

    // Update call log
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        callSid: validated.callSid,
        amdResult,
        latencyMs: validated.duration,
        status: 'IN_PROGRESS',
        answeredAt: new Date(),
      },
    })

    // Create AMD event
    await prisma.amdEvent.create({
      data: {
        callLogId,
        decision: amdResult,
        payload: body as any,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Jambonz Event Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
