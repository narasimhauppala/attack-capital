import { Server } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import axios from 'axios'
import { prisma } from './db'

interface TwilioMediaMessage {
  event: 'start' | 'media' | 'stop'
  streamSid?: string
  start?: {
    streamSid: string
    callSid: string
    mediaFormat: {
      encoding: string
      sampleRate: number
      channels: number
    }
  }
  media?: {
    track: string
    chunk: string
    timestamp: string
    payload: string
  }
  stop?: {
    callSid: string
  }
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/api/ws/media-stream'
  })

  console.log('WebSocket server initialized on /api/ws/media-stream')

  wss.on('connection', async (ws: WebSocket, req) => {
    console.log('New WebSocket connection established from Twilio')
    console.log('Request URL:', req.url)
    console.log('Request headers:', req.headers)
    console.log('Waiting for start event with callLogId parameter...')

    // Send a simple ping to keep connection alive
    ws.ping()

    // We'll get the callLogId from the 'start' event's custom parameters
    let callLogId: string | null = null
    let mlServiceWs: WebSocket | null = null
    let callSid: string | null = null
    let startTime = Date.now()

    // Function to connect to ML service (called after we get callLogId from start event)
    const connectToMLService = () => {
      const mlServiceUrl = process.env.HF_API_URL || 'http://localhost:8000'
      const mlWsUrl = mlServiceUrl.replace('http', 'ws') + '/ws/stream'
      
      console.log('Connecting to ML service at:', mlWsUrl)
      mlServiceWs = new WebSocket(mlWsUrl)

      mlServiceWs.on('open', () => {
        console.log('✓ Connected to ML service')
      })

      mlServiceWs.on('message', async (data: string) => {
        try {
          const result = JSON.parse(data)
          console.log('ML Service result:', result)

          if (result.event === 'final' || (result.event === 'prediction' && result.confidence > 0.7)) {
            const latencyMs = Date.now() - startTime

            // Update CallLog with AMD result (only if we have callLogId)
            if (callLogId) {
              await prisma.callLog.update({
                where: { id: callLogId },
                data: {
                  amdResult: result.label,
                  latencyMs,
                  status: 'COMPLETED',
                },
              })

              // Create AmdEvent
              await prisma.amdEvent.create({
                data: {
                  callLogId,
                  decision: result.label,
                  confidence: result.confidence,
                  payload: result,
                },
              })

              console.log(`AMD Complete: ${result.label} (${result.confidence.toFixed(2)}) in ${latencyMs}ms`)
            }

            // Close connections
            if (mlServiceWs) mlServiceWs.close()
            ws.close()
          }
        } catch (error) {
          console.error('Error processing ML service message:', error)
        }
      })

      mlServiceWs.on('error', (error) => {
        console.error('ML Service WebSocket error:', error)
      })
    }

    ws.on('message', async (data: Buffer) => {
      try {
        const message: TwilioMediaMessage = JSON.parse(data.toString())
        console.log('Received Twilio message event:', message.event)

        switch (message.event) {
          case 'start':
            console.log('Stream started - full message:', JSON.stringify(message, null, 2))
            
            // Extract callLogId from custom parameters
            const customParams = (message.start as any)?.customParameters
            console.log('Custom parameters:', customParams)
            
            if (customParams?.callLogId) {
              callLogId = customParams.callLogId
              console.log(`✓ Extracted callLogId from start event: ${callLogId}`)
            } else if (customParams?.callSid || message.start?.callSid) {
              // Fallback: lookup callLogId using CallSid
              const lookupCallSid = customParams?.callSid || message.start?.callSid
              console.log(`Looking up callLogId using CallSid: ${lookupCallSid}`)
              
              try {
                const callLog = await prisma.callLog.findFirst({
                  where: { callSid: lookupCallSid },
                  orderBy: { startedAt: 'desc' }
                })
                
                if (callLog) {
                  callLogId = callLog.id
                  console.log(`✓ Found callLogId from database: ${callLogId}`)
                } else {
                  console.error('✗ No callLog found for CallSid')
                }
              } catch (error) {
                console.error('Error looking up callLog:', error)
              }
            } else {
              console.error('✗ No callLogId or callSid in start event custom parameters')
              console.error('Start object:', message.start)
              ws.close()
              return
            }
            
            callSid = message.start?.callSid || null
            startTime = Date.now()

            // NOW connect to ML service (after we have callLogId)
            connectToMLService()

            // Forward start event to ML service
            if (mlServiceWs && mlServiceWs.readyState === WebSocket.OPEN) {
              mlServiceWs.send(data.toString())
            }

            // Update CallLog
            if (callSid && callLogId) {
              await prisma.callLog.update({
                where: { id: callLogId },
                data: {
                  callSid,
                  status: 'IN_PROGRESS',
                  answeredAt: new Date(),
                },
              })
            }
            break

          case 'media':
            // Forward audio to ML service
            if (mlServiceWs && mlServiceWs.readyState === WebSocket.OPEN) {
              mlServiceWs.send(data.toString())
            }
            break

          case 'stop':
            console.log('Stream stopped:', message.stop)
            
            // If we haven't gotten a result yet, mark as unknown (only if we have callLogId)
            if (callLogId) {
              const callLog = await prisma.callLog.findUnique({
                where: { id: callLogId },
              })

              if (callLog && !callLog.amdResult) {
                const latencyMs = Date.now() - startTime
                
                await prisma.callLog.update({
                  where: { id: callLogId },
                  data: {
                    amdResult: 'unknown',
                    latencyMs,
                    status: 'COMPLETED',
                  },
                })
              }
            }

            if (mlServiceWs) mlServiceWs.close()
            ws.close()
            break
        }
      } catch (error) {
        console.error('Error processing Twilio message:', error)
      }
    })

    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed - Code: ${code}, Reason: ${reason.toString()}`)
      if (mlServiceWs) mlServiceWs.close()
    })

    ws.on('error', (error) => {
      console.error('WebSocket error from Twilio:', error)
    })

    ws.on('ping', () => {
      console.log('Received ping from Twilio')
      ws.pong()
    })

    ws.on('pong', () => {
      console.log('Received pong from Twilio')
    })
  })

  return wss
}
