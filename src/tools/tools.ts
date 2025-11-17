import { z } from 'zod'

// 工具类型枚举
export enum ToolType {
  USER_INPUT = 'user_input',
  BASH = 'bash',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
}

// 统一的工具调用接口
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ToolType),
  input: z.string(),
  metadata: z
    .object({
      language: z.string().optional(),
      workingDirectory: z.string().optional(),
      timestamp: z.date().optional(),
    })
    .optional(),
})

export type ToolCall = z.infer<typeof ToolCallSchema>

// 工具执行结果
export const ToolResultSchema = z.object({
  toolCallId: z.string(),
  type: z.nativeEnum(ToolType),
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  logs: z.array(z.string()).default([]),
  metadata: z
    .object({
      executionTime: z.number().optional(),
      exitCode: z.number().optional(),
    })
    .optional(),
})

export type ToolResult = z.infer<typeof ToolResultSchema>

// 多轮任务状态
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_INPUT = 'waiting_for_input',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 任务定义
export const TaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.nativeEnum(TaskStatus),
  toolCalls: z.array(ToolCallSchema),
  results: z.array(ToolResultSchema),
  currentStep: z.number().default(0),
  totalSteps: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Task = z.infer<typeof TaskSchema>

// Agent会话状态
export const AgentStateSchema = z.object({
  currentTask: z.optional(TaskSchema),
  completedTasks: z.array(TaskSchema).default([]),
  sessionStart: z.date(),
  lastActivity: z.date(),
})

export type AgentState = z.infer<typeof AgentStateSchema>
