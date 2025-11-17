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

    // 直接使用上下文中的沙箱配置
    await SandboxManager.initialize(context.sandboxConfig);
    
    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);
    
    // 使用 sandbox-runtime 包装 Node.js 命令，设置工作目录
    // 添加环境变量来避免 OpenSSL 配置问题
    const wrappedCommand = await SandboxManager.wrapWithSandbox(`OPENSSL_CONF=/dev/null NODE_OPTIONS=--no-warnings node ${tempScriptPath}`);
    
    // 执行命令并收集输出
    const output = await new Promise<string>((resolve, reject) => {
      const childProcess = spawn(wrappedCommand, {
        // shell: true,
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

    // 直接使用上下文中的沙箱配置
    await SandboxManager.initialize(context.sandboxConfig);
    
    // 检测用户实际使用的 shell
    const userShell = process.env.SHELL || '/bin/bash';
    const shellName = userShell.split('/').pop() || 'bash';

    // 准备完整的环境变量
    const envVars = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      USER: process.env.USER || process.env.LOGNAME,
      SHELL: userShell,
      PWD: context.workingDirectory,
      TERM: process.env.TERM || 'xterm-256color',
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL
    };

    // 构建环境变量字符串
    const envString = Object.entries(envVars)
      .filter(([key, value]) => value !== undefined)
      .map(([key, value]) => `export ${key}="${value}"`)
      .join(' && ');

    // 为了避免 shell 初始化脚本的干扰，统一使用 bash 的简洁模式
    const shellCommand = `/bin/bash --noprofile --norc -c '${envString} && ${codeBlock.code}'`;

    const wrappedCommand = await SandboxManager.wrapWithSandbox(shellCommand);
    
    // 执行命令并收集输出
    const output = await new Promise<string>((resolve, reject) => {
      const childProcess = spawn(wrappedCommand, [], {
        // shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: context.workingDirectory,
        env: {
          ...process.env,
          ...envVars
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

    // 初始化 SandboxManager
    await SandboxManager.initialize(context.sandboxConfig);

    // 写入代码到临时文件
    fs.writeFileSync(tempScriptPath, codeBlock.code);

    // 使用 sandbox-runtime 包装 Python 命令
    const wrappedCommand = await SandboxManager.wrapWithSandbox(`python3 ${tempScriptPath}`);

    // 执行命令并收集输出
    const output = await new Promise<string>((resolve, reject) => {
      const childProcess = spawn(wrappedCommand, [], {
        // shell: true,
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
