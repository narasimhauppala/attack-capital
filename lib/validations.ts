import { z } from 'zod'

export const dialRequestSchema = z.object({
  toNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  strategy: z.enum(['TWILIO_NATIVE', 'JAMBONZ_SIP', 'HUGGINGFACE_ML']),
})

export const amdCallbackSchema = z.object({
  CallSid: z.string(),
  AccountSid: z.string(),
  AnsweredBy: z.string().optional(),
  CallStatus: z.string().optional(),
  MachineDetectionDuration: z.string().optional(),
})

export const jambonzEventSchema = z.object({
  callSid: z.string(),
  event: z.enum(['amd_human_detected', 'amd_machine_detected']),
  duration: z.number().optional(),
})

export const hfPredictionSchema = z.object({
  callSid: z.string(),
  label: z.enum(['human', 'machine']),
  confidence: z.number().min(0).max(1),
})

export type DialRequest = z.infer<typeof dialRequestSchema>
export type AmdCallback = z.infer<typeof amdCallbackSchema>
export type JambonzEvent = z.infer<typeof jambonzEventSchema>
export type HfPrediction = z.infer<typeof hfPredictionSchema>
