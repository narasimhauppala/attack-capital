import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { dialRequestSchema } from '@/lib/validations'
import { createDetector } from '@/lib/amd/detector-factory'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request
    const validated = dialRequestSchema.parse(body)

    // Create call log entry
    const callLog = await prisma.callLog.create({
      data: {
        toNumber: validated.toNumber,
        fromNumber: process.env.TWILIO_CALLER_ID!,
        strategy: validated.strategy,
        status: 'INITIATED',
      },
    })

    // Get AMD detector based on strategy
    const detector = createDetector(validated.strategy)

    // Initiate call with AMD
    const result = await detector.detect({
      toNumber: validated.toNumber,
      fromNumber: process.env.TWILIO_CALLER_ID!,
      callLogId: callLog.id,
    })

    if (!result.success) {
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { status: 'FAILED' },
      })

      return NextResponse.json(
        { error: result.error || 'Failed to initiate call' },
        { status: 500 }
      )
    }

    // Update call log with Twilio SID
    await prisma.callLog.update({
      where: { id: callLog.id },
      data: { callSid: result.callSid },
    })

    return NextResponse.json({
      success: true,
      callLogId: callLog.id,
      callSid: result.callSid,
    })
  } catch (error) {
    console.error('Dial API Error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
