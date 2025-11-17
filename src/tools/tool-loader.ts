import * as fs from 'fs'
import * as path from 'path'

/**
 * Tool loader for dynamic loading and caching
 */
export class ToolLoader {
  private toolsDirectory: string
  private loadedTools: Map<string, Function> = new Map()

  constructor(toolsDirectory: string = 'tools') {
    this.toolsDirectory = toolsDirectory
  }

  /**
   * Load a single tool
   */
  async loadTool(toolName: string): Promise<Function> {
    if (this.loadedTools.has(toolName)) {
      return this.loadedTools.get(toolName)!
    }

    const toolPath = path.join(this.toolsDirectory, `${toolName}.ts`)

    if (!fs.existsSync(toolPath)) {
      throw new Error(`Tool '${toolName}' not found at ${toolPath}`)
    }

    try {
      // Dynamic import of TypeScript module
      const module = await import(toolPath)

      // Get the tool function (exported with the same name as the file)
      if (module[toolName] && typeof module[toolName] === 'function') {
        const toolFunc = module[toolName]

        // Check if it has tool_info
        if ('tool_info' in toolFunc) {
          this.loadedTools.set(toolName, toolFunc)
          return toolFunc
        }
      }

      throw new Error(`Tool '${toolName}' is not properly defined in ${toolPath}`)
    } catch (error) {
      throw new Error(`Failed to load tool '${toolName}': ${error}`)
    }
  }

  /**
   * Load multiple tools
   */
  async loadTools(toolNames: string[]): Promise<Map<string, Function>> {
    for (const toolName of toolNames) {
      if (!this.loadedTools.has(toolName)) {
        await this.loadTool(toolName)
      }
    }
    return this.loadedTools
  }

  /**
   * Get all loaded tools
   */
  getLoadedTools(): Map<string, Function> {
    return new Map(this.loadedTools)
  }

  /**
   * Check if tool is loaded
   */
  isToolLoaded(toolName: string): boolean {
    return this.loadedTools.has(toolName)
  }

  /**
   * Unload a tool
   */
  unloadTool(toolName: string): boolean {
    return this.loadedTools.delete(toolName)
  }

  /**
   * Clear all loaded tools
   */
  clearTools(): void {
    this.loadedTools.clear()
  }
}
