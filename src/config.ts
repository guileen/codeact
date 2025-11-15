import { SandboxRuntimeConfig, getDefaultWritePaths } from "@anthropic-ai/sandbox-runtime";
import { tmpdir } from "os";

export const SANDBOX_CONFIG: SandboxRuntimeConfig = {
  network: {
    allowedDomains: ["localhost", "127.0.0.1"], // 允许访问的域名列表，包括localhost和127.0.0.1
    deniedDomains: [],  // 明确拒绝的域名列表
    // 允许本地绑定端口
    allowLocalBinding: true,
  },
  filesystem: {
    denyRead: [], // 拒绝读取的路径列表
    allowWrite: [tmpdir(), ...getDefaultWritePaths()], // 允许写入的路径列表
    denyWrite: [], // 拒绝写入的路径列表
  },
};

export const EXECUTION_TIMEOUT = 30000; // 30秒超时