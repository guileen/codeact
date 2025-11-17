#!/usr/bin/env node
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

import { codeExecutionTools } from './core/code-execution-tools.js'
import { LightAgent } from './core/light-agent.js'
import { ContextManager } from './shared/context.js'
import { CleanUI } from './ui/clean.js'

async function single(prompt: string, workingDir?: string) {
  // 初始化上下文
  const contextManager = ContextManager.getInstance()
  const context = contextManager.initializeContext(prompt, workingDir)
  try {
    fs.writeFileSync(path.join(context.workingDirectory, '.cli_probe.txt'), 'ok')
  } catch {}

  console.log(CleanUI.Style.info('🚀 CodeAct V4 - 清洁版单次模式'))
  console.log(CleanUI.Style.muted(`工作目录: ${context.workingDirectory}`))
  console.log(CleanUI.Style.muted(`会话ID: ${context.sessionId}`))
  console.log('')

  const agent = new LightAgent({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    instructions: `You are a problem-solving assistant that **MUST USE CODE** to answer user questions. Follow these strict steps:

1. **THINK FIRST**: Analyze the user's question and decide what code is needed to solve it.
   - Surround your thinking with </think> tags
   - Explain why you need to use code for this task

2. **WRITE EXECUTABLE CODE**: Create code that will solve the problem
   - Use markdown code blocks with explicit language tags
   - For file system operations (ls, cat, find, grep, etc.) - ALWAYS use bash
   - For math calculations and data processing - use javascript or python
   - Make sure the code is correct and executable
   - The code must print the result to stdout

3. **WAIT FOR RESULTS**: After writing code, you will receive the execution result

4. **ANSWER THE USER**: Once you get the result, provide a clear answer based on the output

**CRITICAL RULES:**
- NEVER answer directly without using code first
- ALWAYS use markdown code blocks for code
- For file system operations, ALWAYS use bash (ls, cat, grep, find, wc, etc.)
- For calculations and data processing, use javascript or python
- ALWAYS print results to stdout so they can be observed

**EXAMPLE FLOW:**
User: What is 2 + 2?
Assistant:
</think>User is asking for a math calculation. I must use code to get the correct answer. I'll use javascript to calculate 2 + 2.</think>

\`\`\`javascript
console.log(2 + 2);
\`\`\`

After code execution, you'll receive the result, then respond with the answer.

**ANOTHER EXAMPLE:**
User: How many files are in the current directory?
Assistant:
User wants to know the number of files in the current directory. I need to use bash to list files and count them.

\`\`\`bash
ls -la | wc -l
\`\`\`

After code execution, you'll receive the result, then respond with the answer.

**CODE EXECUTION EXAMPLE:**
User: 计算 1 到 100 的总和
Assistant:

\`\`\`javascript
console.log(Array.from({length:100}, (_,i)=>i+1).reduce((a,b)=>a+b,0));
\`\`\`

After code execution, you'll receive the result, then provide the answer based on the output.`,
    debug: true,
    tools: codeExecutionTools,
  })

  try {
    const result = await agent.run(prompt, { log_detail: 'verbose' })

    if (typeof result === 'string') {
      console.log(result)
    } else {
      let output = ''
      for await (const chunk of result) {
        output += chunk
      }
      console.log(output)
    }

    // 显示最终统计
    const finalState = agent.getState()
    console.log(CleanUI.Style.muted('─'.repeat(50)))
    console.log(CleanUI.Style.info('📊 最终统计:'))
    console.log(`${CleanUI.Style.highlight('完成任务数:')} ${finalState.completedTasks.length}`)
    console.log(
      `${CleanUI.Style.highlight('会话时长:')} ${Math.round((Date.now() - finalState.sessionStart.getTime()) / 1000)}秒`
    )
    console.log(CleanUI.Style.muted('─'.repeat(50)))
  } catch (error) {
    console.error(
      CleanUI.Style.error(`❌ 执行错误: ${error instanceof Error ? error.message : String(error)}`)
    )
  }

  setTimeout(() => {
    process.exit(0)
  }, 2000)
}

async function interactive() {
  const contextManager = ContextManager.getInstance()
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 100,
  })

  // 显示欢迎界面
  console.clear()
  console.log(CleanUI.Style.title('🎯 CodeAct V4 - 清洁版交互模式'))
  console.log(CleanUI.Style.muted('─'.repeat(50)))
  console.log(`${CleanUI.Style.info('💻')} 工作目录: ${process.cwd()}`)
  console.log(`${CleanUI.Style.info('🎯')} 特性: 单行状态显示 | 历史清洁 | 实时反馈`)
  console.log(
    `${CleanUI.Style.info('❓')} 命令: 'exit' 退出 | 'status' 状态 | 'clear' 清屏 | 'help' 帮助`
  )
  console.log(CleanUI.Style.muted('─'.repeat(50)))

  const agent = new LightAgent({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    instructions: `You are a problem-solving assistant that **MUST USE CODE** to answer user questions. Follow these strict steps:

1. **THINK FIRST**: Analyze the user's question and decide what code is needed to solve it.
   - Surround your thinking with </think> tags
   - Explain why you need to use code for this task

2. **WRITE EXECUTABLE CODE**: Create code that will solve the problem
   - Use markdown code blocks with explicit language tags
   - For file system operations (ls, cat, find, grep, etc.) - ALWAYS use bash
   - For math calculations and data processing - use javascript or python
   - Make sure the code is correct and executable
   - The code must print the result to stdout

3. **WAIT FOR RESULTS**: After writing code, you will receive the execution result

4. **ANSWER THE USER**: Once you get the result, provide a clear answer based on the output

**CRITICAL RULES:**
- NEVER answer directly without using code first
- ALWAYS use markdown code blocks for code
- For file system operations, ALWAYS use bash (ls, cat, grep, find, wc, etc.)
- For calculations and data processing, use javascript or python
- ALWAYS print results to stdout so they can be observed

**EXAMPLE FLOW:**
User: What is 2 + 2?
Assistant:
</think>User is asking for a math calculation. I must use code to get the correct answer. I'll use javascript to calculate 2 + 2.</think>

\`\`\`javascript
console.log(2 + 2);
\`\`\`

After code execution, you'll receive the result, then respond with the answer.

**ANOTHER EXAMPLE:**
User: How many files are in the current directory?
Assistant:
User wants to know the number of files in the current directory. I need to use bash to list files and count them.

\`\`\`bash
ls -la | wc -l
\`\`\`

After code execution, you'll receive the result, then respond with the answer.

**CODE EXECUTION EXAMPLE:**
User: 计算 1 到 100 的总和
Assistant:

\`\`\`javascript
console.log(Array.from({length:100}, (_,i)=>i+1).reduce((a,b)=>a+b,0));
\`\`\`

After code execution, you'll receive the result, then provide the answer based on the output.`,
    debug: true,
    tools: codeExecutionTools,
  })

  const ask = () =>
    rl.question(`${CleanUI.Style.info('➤')} `, async (input: string) => {
      const q = input.trim()
      if (!q) {
        return ask()
      }

      const command = q.toLowerCase()

      // 处理特殊命令
      if (command === 'exit') {
        const state = agent.getState()
        console.log('')
        console.log(CleanUI.Style.muted('─'.repeat(50)))
        console.log(CleanUI.Style.info('👋 感谢使用 CodeAct V4!'))
        console.log(`${CleanUI.Style.highlight('完成任务数:')} ${state.completedTasks.length}`)
        console.log(
          `${CleanUI.Style.highlight('会话时长:')} ${Math.round((Date.now() - state.sessionStart.getTime()) / 1000)}秒`
        )
        console.log(CleanUI.Style.success('🎉 期待下次再见!'))
        console.log(CleanUI.Style.muted('─'.repeat(50)))
        rl.close()
        return
      }

      if (command === 'status') {
        console.log('')
        const state = agent.getState()
        const duration = Math.round((Date.now() - state.sessionStart.getTime()) / 1000)
        const currentTask = state.currentTask?.description

        console.log(CleanUI.Style.muted('─'.repeat(50)))
        new CleanUI.MinimalStatusPanel().showSessionStatus(
          state.completedTasks.length,
          duration,
          currentTask
        )
        console.log(CleanUI.Style.muted('─'.repeat(50)))
        return ask()
      }

      if (command === 'clear') {
        console.clear()
        console.log(CleanUI.Style.title('🎯 CodeAct V4 - 清洁版交互模式'))
        console.log(CleanUI.Style.muted('界面已清屏'))
        return ask()
      }

      if (command === 'help') {
        showCleanHelp()
        return ask()
      }

      if (command === 'reset') {
        agent.reset()
        console.log(CleanUI.Style.success('✅ 会话已重置'))
        return ask()
      }

      try {
        // 初始化上下文
        const context = contextManager.initializeContext(q)

        const result = await agent.run(q, { log_detail: 'verbose' })

        if (typeof result === 'string') {
          console.log(result)
        } else {
          let output = ''
          for await (const chunk of result) {
            output += chunk
          }
          console.log(output)
        }

        console.log(
          `${CleanUI.Style.success('✅')} ${CleanUI.Style.muted('任务处理完成，继续对话...')}`
        )
      } catch (error) {
        console.error(
          CleanUI.Style.error(
            `❌ 执行错误: ${error instanceof Error ? error.message : String(error)}\n`
          )
        )
      }

      ask()
    })

  ask()
}

function showCleanHelp() {
  console.log('')
  console.log(CleanUI.Style.muted('─'.repeat(50)))
  console.log(CleanUI.Style.title('📖 帮助信息'))
  console.log(CleanUI.Style.muted('─'.repeat(50)))

  const helpItems = [
    { cmd: 'exit', desc: '退出程序' },
    { cmd: 'status', desc: '查看当前状态和统计信息' },
    { cmd: 'clear', desc: '清屏，重新显示界面' },
    { cmd: 'reset', desc: '重置会话，清除所有记忆' },
    { cmd: 'help', desc: '显示此帮助信息' },
  ]

  helpItems.forEach(item => {
    console.log(
      `${CleanUI.Style.highlight(item.cmd.padEnd(10))} ${CleanUI.Style.muted('-')} ${item.desc}`
    )
  })

  console.log('')
  console.log(CleanUI.Style.info('💡 提示: ') + '你可以直接输入任务，如:')
  console.log(`  ${CleanUI.Style.muted('• "创建一个hello.txt文件"')}`)
  console.log(`  ${CleanUI.Style.muted('• "读取当前目录的文件列表"')}`)
  console.log(`  ${CleanUI.Style.muted('• "创建一个简单的计算器程序"')}`)

  console.log('')
  console.log(CleanUI.Style.info('🎯 特性: ') + '清洁的界面设计，单行状态显示，不污染终端历史')
  console.log(CleanUI.Style.muted('─'.repeat(50)))
  console.log('')
}

// 主程序逻辑
const args = process.argv.slice(2)

if (args.length) {
  const workingDir = process.env.WORKING_DIRECTORY || path.join(process.cwd(), 'test_workspace')
  single(args.join(' '), workingDir)
} else {
  interactive()
}
