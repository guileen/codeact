import { CodeBlock } from "./schemas";
import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import { spawn } from "child_process";
import { SANDBOX_CONFIG, EXECUTION_TIMEOUT } from "./config";
import { ContextManager } from "./context";
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
    // 从上下文获取配置
    const contextManager = ContextManager.getInstance();
    const context = contextManager.getContext();

    // 使用 sandbox-runtime 初始化
    await SandboxManager.initialize(context.sandboxConfig);

    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);

    // 构建简单的 node 命令，避免长命令问题
    const nodeCommand = `node ${tempScriptPath}`;
    const wrappedCommand = await SandboxManager.wrapWithSandbox(nodeCommand);

    // 执行命令并收集输出 - 使用 shell: true 处理 sandbox 包装的长命令
    const output = await new Promise<string>((resolve, reject) => {
      const childProcess = spawn(wrappedCommand, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: context.workingDirectory,
        env: {
          ...process.env,
          OPENSSL_CONF: '/dev/null',
          NODE_OPTIONS: '--no-warnings'
        }
      });

      let stdout = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        logs.push(chunk.trim());
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        logs.push(`stderr: ${data.toString().trim()}`);
      });

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`JavaScript execution failed with exit code ${code}`));
        }
      });

      // 设置超时
      setTimeout(() => {
        childProcess.kill();
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

  try {
    // 从上下文获取配置
    const contextManager = ContextManager.getInstance();
    const context = contextManager.getContext();

    // 使用 sandbox-runtime 包装命令，设置 shell: true 以处理长命令
    await SandboxManager.initialize(context.sandboxConfig);
    const wrappedCommand = await SandboxManager.wrapWithSandbox(codeBlock.code);

    // 执行命令并收集输出 - 使用 shell: true 处理 sandbox 包装的长命令
    const output = await new Promise<string>((resolve, reject) => {
      const childProcess = spawn(wrappedCommand, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: context.workingDirectory,
        env: process.env
      });

      let stdout = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        logs.push(chunk.trim());
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        logs.push(`stderr: ${data.toString().trim()}`);
      });

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Bash execution failed with exit code ${code}`));
        }
      });
      
      // 设置超时
      setTimeout(() => {
        childProcess.kill();
        reject(new Error('Bash execution timed out'));
      }, EXECUTION_TIMEOUT);
    });
    
    return { output, logs };
  } catch (error) {
    logs.push(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return { logs };
  }
}

export async function runPythonCode(codeBlock: CodeBlock): Promise<SandboxResult> {
  if(codeBlock.language !== "python") {
    throw new Error("Only python code block is supported");
  }

  const logs: string[] = [];
  const tempDir = tmpdir();
  const tempScriptPath = path.join(tempDir, `script_${Date.now()}.py`);

  try {
    // 从上下文获取配置
    const contextManager = ContextManager.getInstance();
    const context = contextManager.getContext();

    // 使用 sandbox-runtime 初始化
    await SandboxManager.initialize(context.sandboxConfig);

    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);

    // 构建简单的 python3 命令，避免长命令问题
    const pythonCommand = `python3 ${tempScriptPath}`;
    const wrappedCommand = await SandboxManager.wrapWithSandbox(pythonCommand);

    // 执行命令并收集输出 - 使用 shell: true 处理 sandbox 包装的长命令
    const output = await new Promise<string>((resolve, reject) => {
      const childProcess = spawn(wrappedCommand, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: context.workingDirectory,
        env: {
          ...process.env,
          PYTHONPATH: context.workingDirectory,
          PYTHONIOENCODING: 'utf-8'
        }
      });

      let stdout = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        logs.push(chunk.trim());
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        logs.push(`stderr: ${data.toString().trim()}`);
      });

      childProcess.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Python execution failed with exit code ${code}`));
        }
      });

      // 设置超时
      setTimeout(() => {
        childProcess.kill();
        reject(new Error('Python execution timed out'));
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
  if(codeBlock.language === 'python') {
    return runPythonCode(codeBlock);
  }
  throw new Error(`Language ${codeBlock.language} is not supported`);
}
