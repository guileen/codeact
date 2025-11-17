import { tmpdir } from 'os'

import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime'
import { getDefaultWritePaths } from '@anthropic-ai/sandbox-runtime'

export type SecurityMode = 'strict' | 'moderate' | 'inquire'

// 安全路径配置
const SECURE_PATHS = {
  denyRead: [
    '/etc/shadow',
    '/etc/sudoers',
    '~/.ssh/id_rsa*',
    '~/.aws/credentials',
    '~/.kube/config',
  ],
  denyWrite: [
    '/etc',
    '/usr/bin',
    '/bin',
    '/sbin',
    '/System',
    '/boot',
    '/proc',
    '/sys',
    '~/.ssh',
    '~/.aws',
    '~/.kube',
  ],
}

// 开发工具缓存路径
const DEV_CACHE_PATHS = process.env.HOME
  ? [
      `${process.env.HOME}/Downloads`,
      `${process.env.HOME}/tmp`,
      `${process.env.HOME}/.npm`,
      `${process.env.HOME}/.yarn`,
      `${process.env.HOME}/.cache`,
    ]
  : []

// 创建沙箱配置 - 直接使用sandbox runtime字段
export function createSandboxConfig(
  workDir: string,
  mode: SecurityMode = 'moderate',
  options: {
    allowedDomains?: string[]
    allowLocalBinding?: boolean
    extraAllowWrite?: string[]
    extraDenyRead?: string[]
    extraDenyWrite?: string[]
  } = {}
): SandboxRuntimeConfig {
  // 基础允许写入路径
  const allowWrite = [tmpdir(), workDir, ...getDefaultWritePaths()]
  if (mode !== 'strict') {
    allowWrite.push(...DEV_CACHE_PATHS)
  }
  if (options.extraAllowWrite) {
    allowWrite.push(...options.extraAllowWrite)
  }

  // 拒绝读取路径
  const denyRead = [...SECURE_PATHS.denyRead]
  if (mode === 'strict') {
    denyRead.push('/etc/passwd')
  }
  if (options.extraDenyRead) {
    denyRead.push(...options.extraDenyRead)
  }

  // 拒绝写入路径
  const denyWrite = [...SECURE_PATHS.denyWrite]
  if (options.extraDenyWrite) {
    denyWrite.push(...options.extraDenyWrite)
  }

  return {
    network: {
      allowedDomains: options.allowedDomains || ['localhost', '127.0.0.1'],
      deniedDomains: [],
      allowLocalBinding: options.allowLocalBinding !== false,
    },
    filesystem: {
      denyRead,
      allowWrite,
      denyWrite,
    },
  }
}

// 默认配置
export const SANDBOX_CONFIG: SandboxRuntimeConfig = createSandboxConfig(process.cwd(), 'moderate')
export const EXECUTION_TIMEOUT = 30000

export const SECURITY_MODE_CONFIGS = {
  strict: '严格模式：仅允许修改工作目录文件',
  moderate: '适中模式：允许工作目录和开发工具缓存',
  inquire: '询问模式：适中模式 + 文件修改前询问确认',
} as const
