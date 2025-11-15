import { VM } from "vm2";
import { CodeBlock } from "./schemas";
import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import { spawn } from "child_process";
import { SANDBOX_CONFIG, EXECUTION_TIMEOUT } from "./config";
import { tmpdir } from "os";
import * as fs from "fs";
import * as path from "path";

type SandboxResult = { output?: unknown; logs: string[] };

// 保持向后兼容，对于 JavaScript 代码仍使用 vm2
// 因为 sandbox-runtime 主要用于执行外部进程
export async function runJSCode(codeBlock: CodeBlock): Promise<SandboxResult> {
  if(codeBlock.language !== "javascript") {
    throw new Error("Only javascript code block is supported");
  }
  const logs: string[] = [];
  const tools = {
    echo: (v: unknown) => v,
    now: () => new Date().toISOString()
  }
  const context: Record<string, unknown> = {};
  const vm = new VM({
    timeout: 10000,
    sandbox: { tools, context, console: { log: (...a: unknown[]) => logs.push(a.map(String).join(" ")) } },
    allowAsync: true
  })
  const wrapped = `(async () => { ${codeBlock.code} })()`;
  const output = await vm.run(wrapped);
  return { output, logs };
}

// 使用 sandbox-runtime 实现 Bash 代码执行
export async function runBashCode(codeBlock: CodeBlock): Promise<SandboxResult> {
  const logs: string[] = [];
  
  // 创建临时文件保存 bash 代码
  const tempDir = tmpdir();
  const tempScriptPath = path.join(tempDir, `script_${Date.now()}.sh`);
  
  try {
    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);
    fs.chmodSync(tempScriptPath, '755'); // 添加执行权限
    
    // 使用集中配置的 SandboxManager 设置
    const config = SANDBOX_CONFIG;
    
    // 初始化 SandboxManager
    await SandboxManager.initialize(config);
    
    // 获取包装后的命令
    const wrappedCommand = await SandboxManager.wrapWithSandbox(`bash -c ${tempScriptPath}`);
    
    // 执行命令并收集输出
    const output = await new Promise<string>((resolve, reject) => {
      const process = spawn(wrappedCommand, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      
      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        logs.push(chunk.trim());
      });
      
      process.stderr.on('data', (data) => {
        logs.push(`stderr: ${data.toString().trim()}`);
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        process.kill();
        reject(new Error('Command timed out'));
      }, EXECUTION_TIMEOUT);
    });
    
    return { output, logs };
  } catch (error) {
    logs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { logs };
  } finally {
    // 清理临时文件
    try {
      if (fs.existsSync(tempScriptPath)) {
        fs.unlinkSync(tempScriptPath);
      }
    } catch (e) {
      // 忽略清理错误
    }
  }
}

export async function runCode(codeBlock: CodeBlock): Promise<SandboxResult> {
  if(codeBlock.language === "javascript") {
    return runJSCode(codeBlock);
  }
  if(codeBlock.language === 'bash') {
    return runBashCode(codeBlock);
  }
  throw new Error(`Language ${codeBlock.language} is not supported`);
}