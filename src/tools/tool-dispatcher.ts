import type { ToolRegistry } from './tool-registry.js'

/**
 * Async tool dispatcher
 */
export class ToolDispatcher {
  private functionMappings: Map<string, Function>

  constructor(toolRegistry: ToolRegistry) {
    this.functionMappings = (toolRegistry as any).functionMappings || new Map()
  }

  /**
   * Call tool execution, supports sync/async tools and streaming output
   */
  async dispatch(
    toolName: string,
    toolParams: Record<string, any>
  ): Promise<string | AsyncGenerator<string, void, unknown> | Generator<string, void, unknown>> {
    const toolCall = this.functionMappings.get(toolName)
    if (!toolCall) {
      return `Tool '${toolName}' not found.`
    }

    try {
      let result: any

      // Handle different types of tools
      if (this.isAsyncFunction(toolCall)) {
        result = await toolCall(toolParams)
      } else if (this.isAsyncGeneratorFunction(toolCall)) {
        result = toolCall(toolParams)
      } else {
        result = toolCall(toolParams)
      }

      // Handle streaming output
      if (this.isAsyncGenerator(result)) {
        return this.asyncStreamGenerator(result)
      } else if (this.isGenerator(result)) {
        return this.streamGenerator(result)
      }

      return String(result)
    } catch (error) {
      return `Tool call error: ${error}`
    }
  }

  /**
   * Handle async stream generator
   */
  private async *asyncStreamGenerator(
    asyncGen: AsyncGenerator<any, void, unknown>
  ): AsyncGenerator<string, void, unknown> {
    for await (const chunk of asyncGen) {
      yield String(chunk)
    }
  }

  /**
   * Handle sync stream generator
   */
  private *streamGenerator(
    syncGen: Generator<any, void, unknown>
  ): Generator<string, void, unknown> {
    for (const chunk of syncGen) {
      yield String(chunk)
    }
  }

  /**
   * Check if function is async
   */
  private isAsyncFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction'
  }

  /**
   * Check if function is async generator
   */
  private isAsyncGeneratorFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncGeneratorFunction'
  }

  /**
   * Check if object is async generator
   */
  private isAsyncGenerator(obj: any): obj is AsyncGenerator {
    return obj && typeof obj[Symbol.asyncIterator] === 'function'
  }

  /**
   * Check if object is generator
   */
  private isGenerator(obj: any): obj is Generator {
    return obj && typeof obj[Symbol.iterator] === 'function' && !this.isAsyncGenerator(obj)
  }
}
