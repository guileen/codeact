import { ToolCall, ToolResult, ToolType } from "./tools";
import { runCode } from "./sandbox";
import { CodeBlock } from "./schemas";
import { v4 as uuidv4 } from "uuid";

export class ToolExecutor {
  /**
   * 执行工具调用
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      let result: ToolResult;

      switch (toolCall.type) {
        case ToolType.USER_INPUT:
          result = await this.handleUserInput(toolCall);
          break;
        case ToolType.BASH:
        case ToolType.JAVASCRIPT:
        case ToolType.PYTHON:
          result = await this.handleCodeExecution(toolCall);
          break;
        default:
          throw new Error(`Unsupported tool type: ${toolCall.type}`);
      }

      // 记录执行时间
      result.metadata = {
        ...result.metadata,
        executionTime: Date.now() - startTime
      };

      return result;
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        type: toolCall.type,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: [],
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 处理用户输入工具
   */
  private async handleUserInput(toolCall: ToolCall): Promise<ToolResult> {
    // 用户输入不需要执行，直接返回输入内容作为输出
    return {
      toolCallId: toolCall.id,
      type: ToolType.USER_INPUT,
      success: true,
      output: toolCall.input,
      logs: [`User input received: ${toolCall.input}`]
    };
  }

  /**
   * 处理代码执行工具
   */
  private async handleCodeExecution(toolCall: ToolCall): Promise<ToolResult> {
    const language = toolCall.metadata?.language || toolCall.type;
    const codeBlock: CodeBlock = {
      language,
      code: toolCall.input
    };

    const executionResult = await runCode(codeBlock);

    return {
      toolCallId: toolCall.id,
      type: toolCall.type,
      success: true,
      output: executionResult.output ? String(executionResult.output) : undefined,
      logs: executionResult.logs,
      metadata: {
        // 可以从执行结果中提取更多信息
      }
    };
  }

  /**
   * 批量执行工具调用
   */
  async executeBatch(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.execute(toolCall);
      results.push(result);

      // 如果是用户输入工具且需要等待响应，则停止后续执行
      if (toolCall.type === ToolType.USER_INPUT && result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * 创建用户输入工具调用
   */
  createUserInputTool(prompt: string): ToolCall {
    return {
      id: uuidv4(),
      type: ToolType.USER_INPUT,
      input: prompt,
      metadata: {
        timestamp: new Date()
      }
    };
  }

  /**
   * 创建代码执行工具调用
   */
  createCodeTool(language: ToolType.BASH | ToolType.JAVASCRIPT | ToolType.PYTHON, code: string): ToolCall {
    return {
      id: uuidv4(),
      type: language,
      input: code,
      metadata: {
        language,
        timestamp: new Date()
      }
    };
  }
}