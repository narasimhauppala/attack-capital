import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { amdCallbackSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const callLogId = searchParams.get('callLogId')

    if (!callLogId) {
      return NextResponse.json({ error: 'Missing callLogId' }, { status: 400 })
    }

    const formData = await request.formData()
    const data = Object.fromEntries(formData.entries())

    // Validate Twilio webhook data
    const validated = amdCallbackSchema.parse(data)

    // Find the call log
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
    })

    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 })
    }

    // Calculate latency if AMD result is present
    let latencyMs: number | undefined
    if (validated.MachineDetectionDuration) {
      latencyMs = parseInt(validated.MachineDetectionDuration, 10)
    }

    // Map Twilio status to our enum
    let status = callLog.status
    if (validated.CallStatus) {
      const statusMap: Record<string, string> = {
        'initiated': 'INITIATED',
        'ringing': 'RINGING',
        'in-progress': 'IN_PROGRESS',
        'completed': 'COMPLETED',
        'failed': 'FAILED',
        'busy': 'BUSY',
        'no-answer': 'NO_ANSWER',
      }
      status = (statusMap[validated.CallStatus.toLowerCase()] || status) as any
    }

    // Update call log
    await prisma.callLog.update({
      where: { id: callLogId },
      data: {
        callSid: validated.CallSid,
        amdResult: validated.AnsweredBy,
        latencyMs,
        status,
        answeredAt: validated.AnsweredBy ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    })

    // Create AMD event if we have a decision
    if (validated.AnsweredBy) {
      await prisma.amdEvent.create({
        data: {
          callLogId,
          decision: validated.AnsweredBy,
          payload: data as any,
        },
      })
    }

    // Return TwiML to continue the call
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This is a test call from AMD system. AMD detected ${validated.AnsweredBy || 'unknown'}. Goodbye.</Say>
  <Hangup/>
</Response>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    )
  } catch (error) {
    console.error('AMD Callback Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
