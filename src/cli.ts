#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import path from "node:path";
import { Agent } from "./agent.js";
import { ContextManager } from "./context.js";

async function single(prompt: string, workingDir?: string) {
  // 初始化上下文
  const contextManager = ContextManager.getInstance();
  const context = contextManager.initializeContext(prompt, workingDir);

  console.log(`工作目录: ${context.workingDirectory}`);
  console.log(`会话ID: ${context.sessionId}`);

  const agent = new Agent();
  const res = await agent.run(prompt);
  process.stdout.write(`${res.text}\n`);

  // 显式退出程序，防止卡住
  setTimeout(() => {
    process.exit(0);
  }, 100);
}

async function interactive() {
  const contextManager = ContextManager.getInstance();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  process.stdout.write("CodeAct对话模式，输入exit退出\n");
  process.stdout.write(`当前工作目录: ${process.cwd()}\n`);
  
  const ask = () => rl.question("> ", async q => {
    if (!q.trim()) return ask();
    if (q.trim().toLowerCase() === "exit") { rl.close(); return; }
    
    // 初始化或更新上下文
    const context = contextManager.initializeContext(q);
    
    const agent = new Agent();
    const res = await agent.run(q);
    process.stdout.write(`${res.text}\n`);
    ask();
  });
  ask();
}

const args = process.argv.slice(2);
if (args.length) {
  const workingDir = process.env.WORKING_DIRECTORY || path.join(process.cwd(), 'test_workspace');
  single(args.join(" "), workingDir);
} else {
  interactive();
}
