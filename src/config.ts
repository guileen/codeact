import { SandboxRuntimeConfig, getDefaultWritePaths } from "@anthropic-ai/sandbox-runtime";
import { tmpdir } from "os";

// 构建允许写入的路径列表
function getAllowWritePaths(): string[] {
  const paths = [
    tmpdir(),
    ...getDefaultWritePaths()
  ];

  // 添加用户目录下的安全路径
  if (process.env.HOME) {
    paths.push(
      `${process.env.HOME}/Downloads`,
      `${process.env.HOME}/Desktop`,
      `${process.env.HOME}/tmp`
    );
  }

  return paths;
}

export const SANDBOX_CONFIG: SandboxRuntimeConfig = {
  network: {
    allowedDomains: ["localhost", "127.0.0.1"], // 允许访问的域名列表，包括localhost和127.0.0.1
    deniedDomains: [],  // 明确拒绝的域名列表
    // 允许本地绑定端口
    allowLocalBinding: true,
  },
  filesystem: {
    denyRead: [
      // 只阻止读取最敏感的文件
      '/etc/shadow',
      '~/.ssh/id_rsa*'
    ],
    allowWrite: getAllowWritePaths(), // 允许写入的路径列表
    denyWrite: [
      // 严格限制写入系统关键目录
      '/etc',
      '/usr/bin',
      '/bin',
      '/sbin',
      '/usr/sbin',
      '/System',
      '/System/Library',
      '/usr/lib',
      '/usr/libexec',
      '/boot',
      '/proc',
      '/sys',
      '~/.ssh',
      '~/.aws',
      '~/.kube',
      '~/.config'
    ], // 拒绝写入的路径列表
  },
};

export const EXECUTION_TIMEOUT = 30000; // 30秒超时

// 默认沙箱配置，用于上下文系统
export const DEFAULT_SANDBOX_CONFIG = {
  timeout: 30000,
  maxMemory: 512 * 1024 * 1024, // 512MB
  allowNetwork: true,
  workingDirectory: process.cwd(),
  allowedPaths: [process.cwd()],
  forbiddenPaths: []
};