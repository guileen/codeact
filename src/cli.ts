#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import path from "node:path";
import { LightAgent } from "./lightagent/light-agent.js";
import { codeExecutionTools } from "./lightagent/code-execution-tools.js";
import { ContextManager } from "./context.js";
import { CleanUI } from "./ui_clean.js";

async function single(prompt: string, workingDir?: string) {
  // 初始化上下文
  const contextManager = ContextManager.getInstance();
  const context = contextManager.initializeContext(prompt, workingDir);

  console.log(CleanUI.Style.info("🚀 CodeAct V4 - 清洁版单次模式"));
  console.log(CleanUI.Style.muted(`工作目录: ${context.workingDirectory}`));
  console.log(CleanUI.Style.muted(`会话ID: ${context.sessionId}`));
  console.log("");

  const agent = new LightAgent({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    instructions: "You are CodeAct, a helpful coding assistant that can execute code and use tools to complete tasks. When users ask you to run code, create files, or perform system operations, use the available tools (bash, javascript, python) to execute the code in a sandboxed environment.",
    debug: true,
    tools: codeExecutionTools
  });

  try {
    const result = await agent.runCLI(prompt);

    // Display the agent's response
    console.log(result.text);

    if (result.requiresInput) {
      console.log(CleanUI.Style.warning("⚠️  单次模式不支持用户输入交互"));
      console.log(CleanUI.Style.info("💡 使用交互模式: tsx src/cli.ts"));
    }

    // 显示最终统计
    const finalState = agent.getState();
    console.log(CleanUI.Style.muted("─".repeat(50)));
    console.log(CleanUI.Style.info("📊 最终统计:"));
    console.log(`${CleanUI.Style.highlight("完成任务数:")} ${finalState.completedTasks.length}`);
    console.log(`${CleanUI.Style.highlight("会话时长:")} ${Math.round((Date.now() - finalState.sessionStart.getTime()) / 1000)}秒`);
    console.log(CleanUI.Style.muted("─".repeat(50)));

  } catch (error) {
    console.error(CleanUI.Style.error(`❌ 执行错误: ${error instanceof Error ? error.message : String(error)}`));
  }

  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

async function interactive() {
  const contextManager = ContextManager.getInstance();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 100
  });

  // 显示欢迎界面
  console.clear();
  console.log(CleanUI.Style.title("🎯 CodeAct V4 - 清洁版交互模式"));
  console.log(CleanUI.Style.muted("─".repeat(50)));
  console.log(`${CleanUI.Style.info("💻")} 工作目录: ${process.cwd()}`);
  console.log(`${CleanUI.Style.info("🎯")} 特性: 单行状态显示 | 历史清洁 | 实时反馈`);
  console.log(`${CleanUI.Style.info("❓")} 命令: 'exit' 退出 | 'status' 状态 | 'clear' 清屏 | 'help' 帮助`);
  console.log(CleanUI.Style.muted("─".repeat(50)));

  const agent = new LightAgent({
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    instructions: "You are CodeAct, a helpful coding assistant that can execute code and use tools to complete tasks. When users ask you to run code, create files, or perform system operations, use the available tools (bash, javascript, python) to execute the code in a sandboxed environment.",
    debug: true,
    tools: codeExecutionTools
  });

  const ask = () => rl.question(`${CleanUI.Style.info("➤")} `, async (input: string) => {
    const q = input.trim();
    if (!q) return ask();

    const command = q.toLowerCase();

    // 处理特殊命令
    if (command === "exit") {
      const state = agent.getState();
      console.log("");
      console.log(CleanUI.Style.muted("─".repeat(50)));
      console.log(CleanUI.Style.info("👋 感谢使用 CodeAct V4!"));
      console.log(`${CleanUI.Style.highlight("完成任务数:")} ${state.completedTasks.length}`);
      console.log(`${CleanUI.Style.highlight("会话时长:")} ${Math.round((Date.now() - state.sessionStart.getTime()) / 1000)}秒`);
      console.log(CleanUI.Style.success("🎉 期待下次再见!"));
      console.log(CleanUI.Style.muted("─".repeat(50)));
      rl.close();
      return;
    }

    if (command === "status") {
      console.log("");
      const state = agent.getState();
      const duration = Math.round((Date.now() - state.sessionStart.getTime()) / 1000);
      const currentTask = state.currentTask?.description;

      console.log(CleanUI.Style.muted("─".repeat(50)));
      new (CleanUI.MinimalStatusPanel)().showSessionStatus(
        state.completedTasks.length,
        duration,
        currentTask
      );
      console.log(CleanUI.Style.muted("─".repeat(50)));
      return ask();
    }

    if (command === "clear") {
      console.clear();
      console.log(CleanUI.Style.title("🎯 CodeAct V4 - 清洁版交互模式"));
      console.log(CleanUI.Style.muted("界面已清屏"));
      return ask();
    }

    if (command === "help") {
      showCleanHelp();
      return ask();
    }

    if (command === "reset") {
      agent.reset();
      console.log(CleanUI.Style.success("✅ 会话已重置"));
      return ask();
    }

    try {
      // 初始化上下文
      const context = contextManager.initializeContext(q);

      const result = await agent.runCLI(q);

      // Display the agent's response
      console.log(result.text);

      // 处理需要用户输入的情况
      if (result.requiresInput && result.inputPrompt) {
        const askInput = () => {
          rl.question(`${CleanUI.Style.warning("💭 请输入:")} `, async (userInput: string) => {
            try {
              const inputResult = await agent.runCLI(userInput);

              // Display the agent's response to input
              console.log(inputResult.text);
              console.log("");

              if (inputResult.requiresInput) {
                askInput();
              } else {
                console.log(`${CleanUI.Style.success("✅")} ${CleanUI.Style.muted("继续对话...")}\n`);
                ask();
              }
            } catch (error) {
              console.error(CleanUI.Style.error(`❌ 输入处理错误: ${error instanceof Error ? error.message : String(error)}\n`));
              ask();
            }
          });
        };

        askInput();
        return;
      }

      console.log(`${CleanUI.Style.success("✅")} ${CleanUI.Style.muted("任务处理完成，继续对话...")}\n`);
    } catch (error) {
      console.error(CleanUI.Style.error(`❌ 执行错误: ${error instanceof Error ? error.message : String(error)}\n`));
    }

    ask();
  });

  ask();
}

function showCleanHelp() {
  console.log("");
  console.log(CleanUI.Style.muted("─".repeat(50)));
  console.log(CleanUI.Style.title("📖 帮助信息"));
  console.log(CleanUI.Style.muted("─".repeat(50)));

  const helpItems = [
    { cmd: 'exit', desc: '退出程序' },
    { cmd: 'status', desc: '查看当前状态和统计信息' },
    { cmd: 'clear', desc: '清屏，重新显示界面' },
    { cmd: 'reset', desc: '重置会话，清除所有记忆' },
    { cmd: 'help', desc: '显示此帮助信息' }
  ];

  helpItems.forEach(item => {
    console.log(`${CleanUI.Style.highlight(item.cmd.padEnd(10))} ${CleanUI.Style.muted('-')} ${item.desc}`);
  });

  console.log("");
  console.log(CleanUI.Style.info("💡 提示: ") + "你可以直接输入任务，如:");
  console.log(`  ${CleanUI.Style.muted('• "创建一个hello.txt文件"')}`);
  console.log(`  ${CleanUI.Style.muted('• "读取当前目录的文件列表"')}`);
  console.log(`  ${CleanUI.Style.muted('• "创建一个简单的计算器程序"')}`);

  console.log("");
  console.log(CleanUI.Style.info("🎯 特性: ") + "清洁的界面设计，单行状态显示，不污染终端历史");
  console.log(CleanUI.Style.muted("─".repeat(50)));
  console.log("");
}

// 主程序逻辑
const args = process.argv.slice(2);

if (args.length) {
  const workingDir = process.env.WORKING_DIRECTORY || path.join(process.cwd(), 'test_workspace');
  single(args.join(" "), workingDir);
} else {
  interactive();
}
