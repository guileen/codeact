import { v4 as uuidv4 } from 'uuid'

import { chat } from '../shared/llm.js'
import { ToolExecutor } from '../tools/tool_executor.js'
import type { ToolCall, ToolResult, Task, AgentState } from '../tools/tools.js'
import { ToolType, TaskStatus } from '../tools/tools.js'
import { CleanUI } from '../ui/clean.js'

type Msg = { role: 'user' | 'assistant' | 'tool'; content: string }

export class Agent {
  private toolExecutor: ToolExecutor
  private state: AgentState
  private memory: Msg[] = []
  private statusBar: InstanceType<typeof CleanUI.StatusBar>
  private spinner: InstanceType<typeof CleanUI.SingleLineSpinner>
  private display: InstanceType<typeof CleanUI.CompactDisplay>

  constructor() {
    this.toolExecutor = new ToolExecutor()
    this.state = {
      sessionStart: new Date(),
      lastActivity: new Date(),
      completedTasks: [],
    }

    // 初始化UI组件
    this.statusBar = new CleanUI.StatusBar()
    this.spinner = new CleanUI.SingleLineSpinner(this.statusBar)
    this.display = new CleanUI.CompactDisplay()
  }

  /**
   * 执行用户请求
   */
  async run(
    userPrompt: string
  ): Promise<{ text: string; requiresInput?: boolean; inputPrompt?: string }> {
    // 只在第一次运行时显示头部
    if (this.memory.length === 0) {
      this.showSessionHeader()
    }

    // 简化用户输入显示
    this.displayUserInput(userPrompt)

    // 记录到记忆
    this.memory.push({ role: 'user', content: userPrompt })
    this.state.lastActivity = new Date()

    // 如果有进行中的任务，继续处理
    if (this.state.currentTask && this.state.currentTask.status !== TaskStatus.COMPLETED) {
      return await this.continueTask(userPrompt)
    }

    // 创建新任务
    const task: Task = {
      id: uuidv4(),
      description: userPrompt,
      status: TaskStatus.IN_PROGRESS,
      toolCalls: [],
      results: [],
      currentStep: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.state.currentTask = task

    return await this.processTask()
  }

  /**
   * 处理任务执行（清洁版本）
   */
  private async processTask(): Promise<{
    text: string
    requiresInput?: boolean
    inputPrompt?: string
  }> {
    if (!this.state.currentTask) {
      throw new Error('No current task to process')
    }

    const task = this.state.currentTask

    // 简化的思考状态显示
    this.spinner.start('思考中', CleanUI.Icons.thinking)

    try {
      // 构建LLM消息
      const messages = this.buildLLMMessages()

      // 调用LLM
      const llmResponse = await chat(messages, false)

      // 停止思考动画
      this.spinner.stop()

      // 解析工具调用
      const toolCalls = this.parseToolCalls(llmResponse)

      // 显示AI思考和工具调用
      this.displayAIAndTools(llmResponse)

      if (toolCalls.length === 0) {
        // 没有工具调用，直接返回LLM响应
        this.memory.push({ role: 'assistant', content: llmResponse })
        task.status = TaskStatus.COMPLETED
        this.state.completedTasks.push(task)
        this.state.currentTask = undefined
        return { text: llmResponse }
      }

      // 执行工具调用（带进度）
      const results = await this.executeToolsClean(toolCalls)

      // 检查是否需要用户输入
      const userInputResult = results.find(r => r.type === ToolType.USER_INPUT)
      if (userInputResult?.success) {
        task.status = TaskStatus.WAITING_FOR_INPUT
        task.toolCalls.push(...toolCalls)
        task.results.push(...results)
        task.updatedAt = new Date()

        this.memory.push({ role: 'tool', content: this.formatToolResults(results) })

        console.log(`\n💭 ${userInputResult.output || '需要用户输入'}`)

        return {
          text: userInputResult.output || '需要用户输入',
          requiresInput: true,
          inputPrompt: userInputResult.output,
        }
      }

      // 显示完整的工具执行结果
      if (results.length > 0) {
        results.forEach(result => {
          this.displayToolResult(result)
        })
      }

      // 更新任务状态
      task.toolCalls.push(...toolCalls)
      task.results.push(...results)
      task.currentStep += toolCalls.length
      task.updatedAt = new Date()

      this.memory.push({ role: 'tool', content: this.formatToolResults(results) })

      // 检查任务是否完成
      const taskComplete = this.isTaskComplete(task, results)

      if (taskComplete) {
        task.status = TaskStatus.COMPLETED
        this.state.completedTasks.push(task)
        this.state.currentTask = undefined

        const finalText = this.formatToolResults(results)
        this.memory.push({ role: 'assistant', content: finalText })

        console.log(`${CleanUI.Style.success('✅ 完成')}`)
        return { text: finalText }
      }

      // 继续处理任务
      return await this.processTask()
    } catch (error) {
      this.spinner.stop('思考出错', CleanUI.Icons.error)
      this.statusBar.error(`处理失败: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }

  /**
   * 清洁的工具执行（显示进度但不污染历史）
   */
  private async executeToolsClean(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = []

    for (let i = 0; i < toolCalls.length; i++) {
      const toolCall = toolCalls[i]

      // 显示执行进度（单行状态）
      this.statusBar.update(
        `执行工具 ${i + 1}/${toolCalls.length}: ${toolCall.type.toUpperCase()}`,
        CleanUI.Icons.processing
      )

      try {
        // 执行工具
        const result = await this.toolExecutor.execute(toolCall)
        results.push(result)

        // 短暂显示成功状态
        this.statusBar.update(`工具 ${toolCall.type.toUpperCase()} 执行成功`, CleanUI.Icons.success)
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        const errorResult: ToolResult = {
          toolCallId: toolCall.id,
          type: toolCall.type,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          logs: [],
        }
        results.push(errorResult)

        this.statusBar.update(`工具 ${toolCall.type.toUpperCase()} 执行失败`, CleanUI.Icons.error)
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 清除状态
    this.statusBar.clear()

    return results
  }

  /**
   * 显示会话头部
   */
  private showSessionHeader(): void {
    console.log(CleanUI.Style.title('🤖 CodeAct V4 - 清洁版'))
    console.log(CleanUI.Style.muted('─'.repeat(50)))
  }

  /**
   * 显示用户输入
   */
  private displayUserInput(prompt: string): void {
    console.log(`\n💬 ${prompt}`)
  }

  /**
   * 完整显示AI响应和工具调用
   */
  private displayAIAndTools(llmResponse: string): void {
    // 解析工具调用
    const toolCalls = this.parseToolCalls(llmResponse)

    // 显示完整的AI响应
    console.log(`${CleanUI.Style.highlight('🤖 AI完整响应:')}`)
    console.log(CleanUI.Style.muted('─'.repeat(80)))

    // 显示AI的原始思考（移除工具调用代码块后的文本）
    let aiThinking = llmResponse
    toolCalls.forEach(call => {
      if (call.type === 'user_input') {
        aiThinking = aiThinking.replace(/<tool>user_input<\/tool><input>.*?<\/input>/gs, '')
      } else {
        aiThinking = aiThinking.replace(/```(\w*)\n[\s\S]*?```/gs, '')
      }
    })

    aiThinking = aiThinking.trim()
    if (aiThinking) {
      console.log(CleanUI.Style.info('💭 AI思考:'))
      console.log(aiThinking)
    } else {
      console.log(CleanUI.Style.muted('💭 AI思考: (无文字内容，直接执行工具)'))
    }

    // 显示工具调用
    if (toolCalls.length > 0) {
      console.log(CleanUI.Style.warning('\n🔧 工具调用:'))
      toolCalls.forEach((call, index) => {
        this.displayDetailedToolCall(call, index + 1)
      })
    }

    console.log(CleanUI.Style.muted('─'.repeat(80)))
    console.log('')
  }

  /**
   * 显示详细的工具调用信息
   */
  private displayDetailedToolCall(toolCall: ToolCall, index: number): void {
    const icon = this.getToolIcon(toolCall.type)
    const toolName = toolCall.type.toUpperCase()

    console.log(`${CleanUI.Style.highlight(`  ${index}. ${icon} ${toolName}`)}`)

    // 显示完整的输入内容
    if (toolCall.input) {
      console.log(`${CleanUI.Style.muted('     输入:')}`)
      if (toolCall.input.includes('```')) {
        // 显示完整的代码块
        console.log(CleanUI.Style.code(toolCall.input))
      } else {
        console.log(CleanUI.Style.muted(`       ${toolCall.input}`))
      }
    }
  }

  /**
   * 显示完整的工具执行结果
   */
  private displayToolResult(result: ToolResult): void {
    const icon = result.success ? CleanUI.Icons.success : CleanUI.Icons.error
    const toolName = result.type.toUpperCase()
    const status = result.success ? '成功' : '失败'

    console.log(`${CleanUI.Style.highlight('📊 工具执行结果:')}`)
    console.log(CleanUI.Style.muted('─'.repeat(80)))

    console.log(
      `${icon} ${toolName} - ${CleanUI.Style[result.success ? 'success' : 'error'](status)}`
    )

    // 显示完整的输出内容
    if (result.output?.trim()) {
      console.log(CleanUI.Style.info('\n📤 输出:'))
      console.log(CleanUI.Style.code(result.output))
    }

    // 显示错误信息
    if (!result.success && result.error) {
      console.log(CleanUI.Style.error('\n❌ 错误:'))
      console.log(CleanUI.Style.muted(`  ${result.error}`))
    }

    // 显示日志信息
    if (result.logs && result.logs.length > 0) {
      console.log(CleanUI.Style.warning('\n📋 日志:'))
      result.logs.forEach(log => {
        console.log(CleanUI.Style.muted(`  • ${log}`))
      })
    }

    console.log(CleanUI.Style.muted('─'.repeat(80)))
    console.log('')
  }

  /**
   * 获取工具图标
   */
  private getToolIcon(toolType: string): string {
    const iconMap: { [key: string]: string } = {
      bash: CleanUI.Icons.bash,
      javascript: CleanUI.Icons.javascript,
      python: CleanUI.Icons.python,
      user_input: CleanUI.Icons.user_input,
    }
    return iconMap[toolType.toLowerCase()] || CleanUI.Icons.processing
  }

  /**
   * 显示用户输入请求
   */
  private displayUserInputRequest(prompt: string): void {
    console.log(`${CleanUI.Icons.user_input} ${CleanUI.Style.warning('需要输入:')} ${prompt}`)
  }

  /**
   * 继续处理任务（用户输入后）
   */
  private async continueTask(
    userInput: string
  ): Promise<{ text: string; requiresInput?: boolean; inputPrompt?: string }> {
    if (!this.state.currentTask) {
      throw new Error('No current task to continue')
    }

    this.displayUserInput(userInput)

    const userInputTool = this.toolExecutor.createUserInputTool(userInput)
    const userInputResult = await this.toolExecutor.execute(userInputTool)

    this.state.currentTask.status = TaskStatus.IN_PROGRESS
    this.state.currentTask.toolCalls.push(userInputTool)
    this.state.currentTask.results.push(userInputResult)
    this.state.currentTask.updatedAt = new Date()

    this.memory.push({ role: 'user', content: userInput })
    this.memory.push({ role: 'tool', content: this.formatToolResults([userInputResult]) })

    return await this.processTask()
  }

  private buildLLMMessages(): any[] {
    const systemPrompt = this.buildSystemPrompt()
    const messages = [{ role: 'system', content: systemPrompt }]

    for (const msg of this.memory) {
      if (msg.role === 'tool') {
        messages.push({ role: 'assistant', content: msg.content })
      } else {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    return messages
  }

  private buildSystemPrompt(): string {
    return `你是一个AI代码助手，可以使用工具来帮助用户完成任务。

可用工具:
1. user_input - 请求用户输入信息，格式: <tool>user_input</tool><input>你的问题</input>
2. bash - 执行bash命令，格式: \`\`\`bash\n命令\n\`\`\`
3. javascript - 执行JavaScript代码，格式: \`\`\`javascript\n代码\n\`\`\`
4. python - 执行Python代码，格式: \`\`\`python\n代码\n\`\`\`

重要格式要求:
- 所有代码执行必须使用标准的markdown代码块格式：\`\`\`语言\n代码\n\`\`\`
- 不要使用 [bash] 或其他方括号格式
- 每个工具调用都应该有明确的代码块
- 在代码块外可以添加说明文字

文件操作指南:
1. **创建文件**:
   - Python: \`\`\`python\nwith open('filename.txt', 'w') as f:\n    f.write('content')\n\`\`\`
   - Bash: \`\`\`bash\necho 'content' > filename.txt\n\`\`\`

2. **编辑/修改文件**:
   - Python: \`\`\`python\nwith open('filename.txt', 'w') as f:\n    f.write('new content')\n\`\`\`
   - Bash: \`\`\`bash\necho 'new content' > filename.txt\n# 或者追加内容\necho 'more content' >> filename.txt\n\`\`\`

3. **读取文件**:
   - Python: \`\`\`python\nwith open('filename.txt', 'r') as f:\n    content = f.read()\nprint(content)\n\`\`\`
   - Bash: \`\`\`bash\ncat filename.txt\n\`\`\`

4. **文件路径**: 使用相对路径或绝对路径，注意工作目录是: ${process.cwd()}

5. **编程文件**:
   - 创建.py文件时，确保包含正确的Python语法
   - 创建.js文件时，确保包含正确的JavaScript语法
   - 创建.html文件时，确保包含正确的HTML结构

任务完成标志:
- 当你认为任务已经完全完成时，请使用明确的完成标志: **任务完成**
- 完成标志必须放在代码块外面，单独一行
- 不要在代码块内部使用完成标志
- 完成标志应该是你回应的最后一部分内容
- 正确示例：代码块执行完毕后，在新的一行写 **任务完成**

当前会话状态:
- 已完成任务数: ${this.state.completedTasks.length}
- 会话开始时间: ${this.state.sessionStart.toLocaleString()}
- 最后活动时间: ${this.state.lastActivity.toLocaleString()}

${this.state.currentTask ? `当前任务: ${this.state.currentTask.description} (步骤 ${this.state.currentTask.currentStep + 1})` : '无进行中的任务'}

请按照以下原则工作:
1. 优先使用代码来验证和解决问题
2. 如果需要更多信息才能继续，使用user_input工具询问用户
3. 复杂任务可以分解为多个步骤，逐步执行
4. 每个工具调用后，根据结果决定下一步行动
5. 任务完成后给出清晰的总结，并使用 **任务完成** 标志
6. 始终使用正确的代码块格式，不要使用方括号格式
7. 只有在真正完成用户要求的所有工作时才使用完成标志
8. 文件操作时要使用明确的代码块，确保文件创建、编辑、读取操作正确执行

当前工作目录: ${process.cwd()}`
  }

  private parseToolCalls(llmResponse: string): ToolCall[] {
    const toolCalls: ToolCall[] = []

    const userInputMatches = llmResponse.match(/<tool>user_input<\/tool><input>(.*?)<\/input>/gs)
    if (userInputMatches) {
      for (const match of userInputMatches) {
        const input = match.match(/<input>(.*?)<\/input>/s)?.[1]
        if (input) {
          toolCalls.push(this.toolExecutor.createUserInputTool(input.trim()))
        }
      }
    }

    const codeBlockMatches = llmResponse.match(/\`\`\`(.*?)\n(.*?)\`\`\`/gs) || []
    for (const match of codeBlockMatches) {
      const [_, language, code] = match.match(/\`\`\`(.*?)\n(.*?)\`\`\`/s) || ['', '', '']
      const lang = language.trim().toLowerCase()

      if (lang === 'bash' || lang === 'javascript' || lang === 'python') {
        toolCalls.push(
          this.toolExecutor.createCodeTool(
            lang as ToolType.BASH | ToolType.JAVASCRIPT | ToolType.PYTHON,
            code.trim()
          )
        )
      }
    }

    return toolCalls
  }

  private formatToolResults(results: ToolResult[]): string {
    return results
      .map(result => {
        let output = `[${result.type}] `
        if (result.success) {
          output += result.output || '执行成功'
        } else {
          output += `错误: ${result.error}`
        }
        if (result.logs.length > 0) {
          output += '\n日志: ' + result.logs.join('\n')
        }
        return output
      })
      .join('\n\n')
  }

  private isTaskComplete(task: Task, results: ToolResult[]): boolean {
    if (results.some(r => !r.success)) {
      return false
    }

    const hasUserInput = task.toolCalls.some(call => call.type === ToolType.USER_INPUT)
    if (hasUserInput) {
      return false
    }

    // 智能启发式判断
    return this.determineTaskCompletion(task, results)
  }

  private shouldTaskComplete(task: Task, results: ToolResult[]): boolean {
    const taskDescription = task.description.toLowerCase()

    // 多步骤任务识别
    const isMultiStepTask =
      taskDescription.includes('然后') ||
      taskDescription.includes('接着') ||
      taskDescription.includes('再') ||
      taskDescription.includes('，然后') ||
      taskDescription.includes('并') ||
      (taskDescription.match(/(创建|读取|写入|执行|分析|检查)/g) || []).length > 1

    // 如果是多步骤任务，需要更多信息来判断是否完成
    if (isMultiStepTask) {
      // 对于多步骤任务，让LLM通过完成标志来判断
      return false // 保守策略，等待LLM明确完成
    }

    // 单步骤任务的判断逻辑
    // 文件创建任务 - 检查是否有成功的文件操作
    if (taskDescription.includes('创建') && taskDescription.includes('文件')) {
      return results.some(
        r =>
          r.success &&
          (r.output?.includes('成功') ||
            r.output?.includes('created') ||
            r.output?.includes('written') ||
            r.logs?.some(log => log.includes('成功')))
      )
    }

    // 执行任务 - 有成功执行就认为完成
    if (taskDescription.includes('执行') || taskDescription.includes('运行')) {
      return results.some(r => r.success)
    }

    // 检查任务 - 有成功检查就认为完成
    if (taskDescription.includes('检查') || taskDescription.includes('验证')) {
      return results.some(r => r.success)
    }

    // 默认策略：如果执行了工具且都成功，且有合理数量的步骤
    const hasSuccessfulTools = results.length > 0 && results.every(r => r.success)
    const hasReasonableSteps = task.currentStep >= 1

    return hasSuccessfulTools && hasReasonableSteps
  }

  /**
   * 智能判断任务是否真正完成（增强版）
   */
  private determineTaskCompletion(task: Task, results: ToolResult[]): boolean {
    // 首先检查基本条件
    if (results.some(r => !r.success)) {
      return false
    }

    const hasUserInput = task.toolCalls.some(call => call.type === ToolType.USER_INPUT)
    if (hasUserInput) {
      return false
    }

    // 获取最新的LLM响应来检查完成标志
    const latestMemory = this.memory[this.memory.length - 1]
    const hasCompletionFlag =
      latestMemory?.content?.includes('**任务完成**') || latestMemory?.content?.includes('任务完成')

    // 如果LLM明确提供了完成标志，认为任务完成
    if (hasCompletionFlag) {
      return true
    }

    const taskDescription = task.description.toLowerCase()

    // 对于分析类任务，检查是否真的提供了分析
    if (
      taskDescription.includes('分析') ||
      taskDescription.includes('告诉我') ||
      taskDescription.includes('总结')
    ) {
      const lastResult = results[results.length - 1]
      const hasMeaningfulAnalysis =
        lastResult?.output &&
        (lastResult.output.length > 50 ||
          lastResult.output.includes('功能') ||
          lastResult.output.includes('作用') ||
          lastResult.output.includes('代码') ||
          lastResult.output.includes('这是一个') ||
          lastResult.output.includes('这个程序'))

      return Boolean(hasMeaningfulAnalysis)
    }

    // 对于多步骤任务，使用保守策略
    const isMultiStepTask =
      taskDescription.includes('然后') ||
      taskDescription.includes('接着') ||
      taskDescription.includes('再') ||
      taskDescription.includes('，然后') ||
      taskDescription.includes('并') ||
      (taskDescription.match(/(创建|读取|写入|执行|分析|检查)/g) || []).length > 1

    if (isMultiStepTask) {
      return false // 保守策略，等待LLM明确完成
    }

    // 单步骤任务使用原有逻辑
    return this.shouldTaskComplete(task, results)
  }

  public getState(): AgentState {
    return { ...this.state }
  }

  public getMemory(): Msg[] {
    return [...this.memory]
  }

  public reset(): void {
    this.state = {
      sessionStart: new Date(),
      lastActivity: new Date(),
      completedTasks: [],
    }
    this.memory = []
  }
}
