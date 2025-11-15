import { CodeBlock } from "./schemas";
import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import { spawn } from "child_process";
import { SANDBOX_CONFIG, EXECUTION_TIMEOUT } from "./config";
import { tmpdir } from "os";
import * as fs from "fs";
import * as path from "path";

type SandboxResult = { output?: unknown; logs: string[] };

// 使用 sandbox-runtime 实现 JavaScript 代码执行
export async function runJSCode(codeBlock: CodeBlock): Promise<SandboxResult> {
  if(codeBlock.language !== "javascript") {
    throw new Error("Only javascript code block is supported");
  }

  const logs: string[] = [];
  const tempDir = tmpdir();
  const tempScriptPath = path.join(tempDir, `script_${Date.now()}.js`);
  
  try {
    // 初始化 SandboxManager
    await SandboxManager.initialize(SANDBOX_CONFIG);
    
    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);
    
    // 使用 sandbox-runtime 包装 Node.js 命令
    const wrappedCommand = await SandboxManager.wrapWithSandbox(`node ${tempScriptPath}`);
    
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
          reject(new Error(`JavaScript execution failed with exit code ${code}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        process.kill();
        reject(new Error('JavaScript execution timed out'));
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

// 使用 sandbox-runtime 实现 Bash 代码执行
export async function runBashCode(codeBlock: CodeBlock): Promise<SandboxResult> {
  const logs: string[] = [];
  const tempDir = tmpdir();
  const tempScriptPath = path.join(tempDir, `script_${Date.now()}.sh`);
  
  try {
    // 初始化 SandboxManager
    await SandboxManager.initialize(SANDBOX_CONFIG);
    
    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);
    fs.chmodSync(tempScriptPath, '755'); // 添加执行权限
    
    // 使用 sandbox-runtime 包装 bash 命令
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
          reject(new Error(`Bash execution failed with exit code ${code}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        process.kill();
        reject(new Error('Bash execution timed out'));
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