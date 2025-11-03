import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  console.log('=== Media Stream TwiML Request (from TwiML App) ===')
  console.log('URL:', request.url)

  // When using TwiML App, Twilio sends the call details in the request body
  const formData = await request.formData()
  const callSid = formData.get('CallSid')?.toString()
  
  console.log('CallSid from Twilio:', callSid)

  if (!callSid) {
    console.error('Missing CallSid in TwiML App request!')
    return new Response('Missing CallSid', { status: 400 })
  }

  // Look up the callLogId from the database using CallSid
  // The CallSid should have been stored when we initiated the call
  let callLogId: string | null = null
  
  try {
    const callLog = await prisma.callLog.findFirst({
      where: { callSid: callSid },
      orderBy: { startedAt: 'desc' }
    })
    
    if (callLog) {
      callLogId = callLog.id
      console.log('Found callLogId:', callLogId)
    } else {
      console.log('CallLog not found for CallSid, will extract from CallSid or create new')
      // This might happen if the TwiML is called before the call record is created
      // We'll pass the CallSid and handle it in the WebSocket
    }
  } catch (error) {
    console.error('Error looking up CallLog:', error)
  }

  // Use NEXT_PUBLIC_APP_URL from environment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${request.headers.get('host')}`
  const wsUrl = appUrl.replace('http://', 'ws://').replace('https://', 'wss://')

  console.log('App URL:', appUrl)
  console.log('WebSocket URL:', wsUrl)

  // Return TwiML to start Media Stream
  // Pass both callLogId (if found) and CallSid
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Start>
        <Stream url="${wsUrl}/api/ws/media-stream">
            ${callLogId ? `<Parameter name="callLogId" value="${callLogId}" />` : ''}
            <Parameter name="callSid" value="${callSid}" />
        </Stream>
    </Start>
    <Say>Hello, please say something for answering machine detection.</Say>
    <Pause length="5"/>
</Response>`

  console.log('Generated TwiML:', twiml)

  return new Response(twiml, {
    headers: {
      'Content-Type': 'text/xml',
    },
  })
}
