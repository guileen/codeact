export type ToolInfo = {
  tool_name: string
  tool_title?: string
  tool_description: string
  tool_params: Array<{
    name: string
    type: string
    description: string
    required: boolean
  }>
}

type OpenAIFunction = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required: string[]
    }
  }
}

/**
 * Centralized tool registry management
 */
export class ToolRegistry {
  private functionMappings: Map<string, Function> = new Map()
  private functionInfo: Map<string, ToolInfo> = new Map()
  private openaiFunctionSchemas: OpenAIFunction[] = []

  /**
   * Register a single tool
   */
  registerTool(func: Function): boolean {
    if (!('tool_info' in func)) {
      return false
    }

    const toolInfo = (func as any).tool_info as ToolInfo
    const toolName = toolInfo.tool_name

    // Register to maps
    this.functionInfo.set(toolName, toolInfo)
    this.functionMappings.set(toolName, func)

    // Build OpenAI format tool description
    const toolParamsOpenai: Record<string, any> = {}
    const toolRequired: string[] = []

    for (const param of toolInfo.tool_params) {
      toolParamsOpenai[param.name] = {
        type: param.type,
        description: param.description,
      }
      if (param.required) {
        toolRequired.push(param.name)
      }
    }

    const toolDefOpenai: OpenAIFunction = {
      type: 'function',
      function: {
        name: toolName,
        description: toolInfo.tool_description,
        parameters: {
          type: 'object',
          properties: toolParamsOpenai,
          required: toolRequired,
        },
      },
    }

    this.openaiFunctionSchemas.push(toolDefOpenai)
    return true
  }

  /**
   * Batch register tools
   */
  registerTools(tools: Function[]): boolean {
    let success = true
    for (const func of tools) {
      if (!this.registerTool(func)) {
        success = false
      }
    }
    return success
  }

  /**
   * Get all tool descriptions (OpenAI format)
   */
  getTools(): OpenAIFunction[] {
    return [...this.openaiFunctionSchemas]
  }

  /**
   * Convert tool descriptions to formatted JSON string
   */
  getToolsStr(): string {
    return JSON.stringify(this.openaiFunctionSchemas, null, 2)
  }

  /**
   * Filter tools based on tool reflection result
   */
  filterTools(toolReflectionResult: string): OpenAIFunction[] {
    try {
      // Safely parse JSON that might contain Markdown code blocks
      let refinedContent = toolReflectionResult.trim()
      if (refinedContent.startsWith('```json') && refinedContent.endsWith('```')) {
        refinedContent = refinedContent.slice(7, -3).trim()
      }

      const parsedData = JSON.parse(refinedContent)
      const validTools = new Set(
        (parsedData.tools || []).map((tool: any) => tool.name.trim().toLowerCase())
      )

      return this.openaiFunctionSchemas.filter(schema =>
        validTools.has(schema.function.name.trim().toLowerCase())
      )
    } catch (error) {
      throw new Error(`Tool filtering failed: ${error}`)
    }
  }

  /**
   * Get tool function by name
   */
  getToolFunction(toolName: string): Function | undefined {
    return this.functionMappings.get(toolName)
  }

  /**
   * Get tool info by name
   */
  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.functionInfo.get(toolName)
  }

  /**
   * Check if tool exists
   */
  hasTool(toolName: string): boolean {
    return this.functionMappings.has(toolName)
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.functionMappings.keys())
  }
}
