import twilio from 'twilio'

export interface AmdDetector {
  detect(payload: DetectPayload): Promise<AmdResult>
}

export interface DetectPayload {
  toNumber: string
  fromNumber: string
  callLogId: string
}

export interface AmdResult {
  callSid?: string
  success: boolean
  error?: string
}

export class TwilioNativeDetector implements AmdDetector {
  private client: twilio.Twilio

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }

  async detect(payload: DetectPayload): Promise<AmdResult> {
    try {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/amd/callback?callLogId=${payload.callLogId}`

      const call = await this.client.calls.create({
        to: payload.toNumber,
        from: payload.fromNumber,
        url: callbackUrl,
        machineDetection: 'Enable',
        asyncAmd: 'true',
        asyncAmdStatusCallback: callbackUrl,
        asyncAmdStatusCallbackMethod: 'POST',
        machineDetectionTimeout: 30,
        statusCallback: callbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      })

      return {
        callSid: call.sid,
        success: true,
      }
    } catch (error) {
      console.error('Twilio Native AMD Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export class JambonzSipDetector implements AmdDetector {
  async detect(payload: DetectPayload): Promise<AmdResult> {
    try {
      // Implement Jambonz SIP integration
      // This would involve creating a Twilio call that routes to Jambonz SIP trunk
      // Jambonz then performs AMD and sends results to /api/amd-events
      
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      )

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/amd-events?callLogId=${payload.callLogId}`
      
      // This is a simplified version - in production you'd configure a SIP trunk
      const call = await twilioClient.calls.create({
        to: payload.toNumber,
        from: payload.fromNumber,
        url: callbackUrl,
        statusCallback: callbackUrl,
      })

      return {
        callSid: call.sid,
        success: true,
      }
    } catch (error) {
      console.error('Jambonz SIP AMD Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export class HuggingFaceDetector implements AmdDetector {
  async detect(payload: DetectPayload): Promise<AmdResult> {
    try {
      // Implement HuggingFace ML integration using TwiML App
      // This uses Twilio Media Streams to send audio to FastAPI service
      
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      )

      const twimlAppSid = process.env.TWILIO_TWIML_APP_SID || 'APf1f08817fb39a36097d0079b16579b1f'
      
      // Use applicationSid instead of url - this references the TwiML App
      // Pass callLogId via StatusCallback so it's available in the TwiML endpoint
      const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/media-stream/status?callLogId=${payload.callLogId}`
      
      const call = await twilioClient.calls.create({
        to: payload.toNumber,
        from: payload.fromNumber,
        applicationSid: twimlAppSid,
        statusCallback: statusCallbackUrl,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      })

      return {
        callSid: call.sid,
        success: true,
      }
    } catch (error) {
      console.error('HuggingFace ML AMD Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

export function createDetector(strategy: 'TWILIO_NATIVE' | 'JAMBONZ_SIP' | 'HUGGINGFACE_ML'): AmdDetector {
  switch (strategy) {
    case 'TWILIO_NATIVE':
      return new TwilioNativeDetector()
    case 'JAMBONZ_SIP':
      return new JambonzSipDetector()
    case 'HUGGINGFACE_ML':
      return new HuggingFaceDetector()
    default:
      throw new Error(`Unknown strategy: ${strategy}`)
  }
}
