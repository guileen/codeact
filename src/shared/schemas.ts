import { z } from 'zod'

export const ModelOutputSchema = z.object({
  message: z.string().optional(),
  code: z.string().optional(),
})

export type ModelOutput = z.infer<typeof ModelOutputSchema>

export type CodeBlock = { language: string; code: string }
