import { randomUUID } from 'crypto';
import { chat } from '../shared/llm';
import { runCode } from '../shared/sandbox';
import { CodeBlock } from '../shared/schemas';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type MemoryProtocol = { retrieve: (q: string, userId: string) => Promise<{ results?: Array<{ memory: string }> }>; store: (q: string, userId: string) => Promise<void> };
type AgentConfig = {
  name?: string;
  instructions?: string;
  role?: string;
  model: string;
  api_key?: string;
  base_url?: string;
  websocket_base_url?: string;
  memory?: MemoryProtocol;
  tree_of_thought?: boolean;
  self_learning?: boolean;
  filter_tools?: boolean;
  debug?: boolean;
  log_level?: 'INFO' | 'DEBUG' | 'ERROR';
  log_file?: string;
  tools?: Array<string | Function>;
};
type MCPConfig = any;

interface AgentState {
  sessionStart: Date;
  lastActivity: Date;
  completedTasks: Array<{
    id: string;
    description: string;
    completedAt: Date;
  }>;
  currentTask?: {
    id: string;
    description: string;
    startedAt: Date;
  };
}
import { ToolRegistry } from '../tools/tool-registry';
import { ToolLoader } from '../tools/tool-loader';
import { ToolDispatcher } from '../tools/tool-dispatcher';

/**
 * Main LightAgent class - TypeScript implementation
 */
export class LightAgent {
  public readonly name: string;
  public readonly version: string = '1.0.0';

  private instructions: string;
  private role?: string;
  private model: string;
  private api_key: string;
  private base_url: string;
  private websocket_base_url?: string;
  private memory?: MemoryProtocol;
  private tree_of_thought: boolean;
  private self_learning: boolean;
  private filter_tools: boolean;
  private debug: boolean;
  private log_level: 'INFO' | 'DEBUG' | 'ERROR';
  private log_file?: string;

  // Core components
  private toolRegistry: ToolRegistry;
  private toolLoader: ToolLoader;
  private toolDispatcher: ToolDispatcher;

  // Chat history
  private chatParams: any = {};
  private history: ChatMessage[] = [];

  // Agent state for CLI compatibility
  private state: AgentState = {
    sessionStart: new Date(),
    lastActivity: new Date(),
    completedTasks: []
  };

  // MCP support
  private mcpConfig?: MCPConfig;
  private mcpEnabled: boolean = false;

  constructor(config: AgentConfig) {
    // Generate random name if not provided
    this.name = config.name || `LightAgent${Math.floor(Math.random() * 90000000) + 10000000}`;

    // Set defaults
    this.instructions = config.instructions || 'You are a helpful agent.';
    this.role = config.role;
    this.model = config.model;
    this.api_key = config.api_key || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
    this.base_url = config.base_url || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.websocket_base_url = config.websocket_base_url;
    this.memory = config.memory;
    this.tree_of_thought = config.tree_of_thought || false;
    this.self_learning = config.self_learning || false;
    this.filter_tools = config.filter_tools !== false; // default true
    this.debug = config.debug || false;
    this.log_level = config.log_level || 'INFO';
    this.log_file = config.log_file;

    // Initialize components
    this.toolRegistry = new ToolRegistry();
    this.toolLoader = new ToolLoader();
    this.toolDispatcher = new ToolDispatcher(this.toolRegistry);

    // Logging simplified to console when debug=true

    // Load tools if provided
    if (config.tools && config.tools.length > 0) {
      this.loadTools(config.tools);
    }

    // Validate API key
    if (!this.api_key) {
      throw new Error(
        'The api_key client option must be set either by passing api_key to the client or by setting the OPENAI_API_KEY environment variable'
      );
    }

    this.log('INFO', 'agent_initialized', {
      name: this.name,
      model: this.model,
      debug: this.debug
    });
  }

  /**
   * Set up MCP (Model Context Protocol) support
   */
  async setupMCP(mcpConfig?: MCPConfig): Promise<void> {
    if (mcpConfig) {
      this.mcpConfig = mcpConfig;
    }

    if (this.mcpConfig) {
      this.mcpEnabled = true;
      this.log('INFO', 'setup_mcp', 'MCP module initialized successfully');
    }
  }

  /**
   * Load and register tools
   */
  async loadTools(tools: Array<string | Function>): Promise<void> {
    for (const tool of tools) {
      if (typeof tool === 'string') {
        try {
          const toolFunc = await this.toolLoader.loadTool(tool);
          this.toolRegistry.registerTool(toolFunc);
          this.log('DEBUG', 'load_tools', { tool, status: 'success' });
        } catch (error) {
          this.log('ERROR', 'load_tools', { tool, error: String(error) });
        }
      } else if (typeof tool === 'function' && 'tool_info' in tool) {
        if (this.toolRegistry.registerTool(tool)) {
          this.log('DEBUG', 'register_tool', { tool: tool.name, status: 'success' });
        }
      }
    }
  }

  /**
   * Run the agent with user query
   */
  async run(
    query: string,
    options: {
      stream?: boolean;
      max_retry?: number;
      user_id?: string;
      history?: ChatMessage[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string | AsyncGenerator<string, void, unknown>> {
    const {
      stream = false,
      max_retry = 10,
      user_id = 'default_user',
      history = [],
      metadata
    } = options;

    // Set trace ID
    const traceId = randomUUID();

    this.log('INFO', 'run_start', { query, user_id, stream });

    // Initialize history
    this.history = history;

    // Build system prompt
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    let systemPrompt = `##Agent Name: ${this.name}\n##Agent Instructions: ${this.instructions}\n##Role: ${this.role || 'AI Assistant'}\nPlease think step by step to complete the user's requirements. Try your best to answer the user's questions and call tools if needed until you get all the answers needed to satisfy the user's question.\nToday's date: ${currentDate} Current time: ${currentTime}`;

    // Add memory context
    const enhancedQuery = await this.addMemoryContext(query, user_id);

    // Prepare API parameters
    this.chatParams = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.history,
        { role: 'user', content: enhancedQuery }
      ],
      stream
    };

    // Add metadata
    if (metadata) {
      Object.assign(this.chatParams, metadata);
    }

    // Add tools
    const tools = this.toolRegistry.getTools();
    if (tools.length > 0) {
      this.chatParams.tools = tools;
      this.chatParams.tool_choice = 'auto';
    }

    // Log request parameters
    this.log('DEBUG', 'request_params', { params: this.chatParams });

    try {
      // Convert chatParams to the format expected by the LLM function
      const messages = this.chatParams.messages as { role: "system" | "user" | "assistant"; content: string }[];

      // Call real LLM
      const llmResponse = await chat(messages, false);

      // Create response object compatible with existing processing
      const realResponse = {
        choices: [{
          message: {
            content: llmResponse,
            tool_calls: null
          },
          finish_reason: 'stop'
        }]
      };

      return this.processResponse(realResponse, stream, max_retry);
    } catch (error) {
      this.log('ERROR', 'llm_call_failed', { error: String(error) });

      // Fallback to mock response on error
      const fallbackResponse = this.createMockResponse(stream);
      fallbackResponse.choices[0].message.content = `LLM Error: ${error instanceof Error ? error.message : String(error)}`;
      return this.processResponse(fallbackResponse, stream, max_retry);
    }
  }

  /**
   * Add memory context to query
   */
  private async addMemoryContext(query: string, userId: string): Promise<string> {
    if (!this.memory) {
      return query;
    }

    let context = '';

    try {
      // Get user memories
      const userMemories = await this.memory.retrieve(query, userId);
      if (userMemories && userMemories.results && userMemories.results.length > 0) {
        context += '\n##User Preferences\nUser previously mentioned:\n' +
          userMemories.results.map((m: any) => m.memory).join('\n');
      }

      // Store current query
      await this.memory.store(query, userId);

      // Get agent memories if self-learning is enabled
      if (this.self_learning) {
        const agentMemories = await this.memory.retrieve(query, this.name);
        if (agentMemories && agentMemories.results && agentMemories.results.length > 0) {
          context += '\n##Problem-related Supplementary Information:\n' +
            agentMemories.results.map((m: any) => m.memory).join('\n');
        }
        await this.memory.store(query, this.name);
      }
    } catch (error) {
      this.log('ERROR', 'memory_context_error', { error: String(error) });
    }

    return context ? `${context}\n##User Question:\n${query}` : query;
  }

  /**
   * Process API response
   */
  private async processResponse(
    response: any,
    stream: boolean,
    maxRetry: number
  ): Promise<string | AsyncGenerator<string, void, unknown>> {
    if (stream) {
      return this.processStreamResponse(response, maxRetry);
    } else {
      return this.processNonStreamResponse(response, maxRetry);
    }
  }

  /**
   * Process non-streaming response
   */
  private async processNonStreamResponse(response: any, maxRetry: number): Promise<string> {
    for (let attempt = 0; attempt < maxRetry; attempt++) {
      const content = response.choices?.[0]?.message?.content || 'No content available';

      // Parse tool calls from the content (like the original agent does)
      const toolCalls = this.parseToolCallsFromContent(content);

      // If there are tool calls, execute them
      if (toolCalls.length > 0) {
        const toolResults = await this.executeParsedToolCalls(toolCalls);

        // Append tool results to conversation history
        this.history.push({ role: 'assistant', content });
        for (const toolResult of toolResults) {
          this.history.push({
            role: 'system',
            content: `Tool ${toolResult.name} result: ${toolResult.result}`
          });
        }

        // Make a follow-up call to LLM with tool results
        const followUpResponse = await this.makeLLMCallWithHistory();
        return followUpResponse;
      }

      this.log('INFO', 'final_reply', { reply: content });
      return content;
    }

    this.log('ERROR', 'max_retry_reached', { message: 'Failed to generate a valid response.' });
    return 'Failed to generate a valid response.';
  }

  /**
   * Process streaming response
   */
  private async* processStreamResponse(
    response: any,
    maxRetry: number
  ): AsyncGenerator<string, void, unknown> {
    for (let attempt = 0; attempt < maxRetry; attempt++) {
      // Mock streaming - in real implementation, handle streaming tool calls here
      const mockChunks = [
        'This is a simulated response from ',
        'the LightAgent TypeScript implementation. ',
        'In a real implementation, this would stream ',
        'actual responses from the AI model.'
      ];

      for (const chunk of mockChunks) {
        yield chunk;
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return;
    }

    this.log('ERROR', 'max_retry_reached', { message: 'Failed to generate a valid streaming response.' });
    yield 'Failed to generate a valid response.';
  }

  /**
   * Create mock response for demonstration
   */
  private createMockResponse(stream: boolean): any {
    return {
      choices: [{
        message: {
          content: 'This is a mock response from LightAgent TypeScript implementation. In a real implementation, this would call the OpenAI API.',
          tool_calls: null
        },
        finish_reason: 'stop'
      }]
    };
  }

  /**
   * Get chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Get available tools
   */
  getTools(): any[] {
    return this.toolRegistry.getTools();
  }

  /**
   * Get specific tool by name
   */
  getTool(toolName: string): Function | undefined {
    return this.toolRegistry.getToolFunction(toolName);
  }

  /**
   * Log message
   */
  public log(level: string, action: string, data: any): void {
    if (this.debug) {
      console.log(`[${level}] ${action}`, data);
    }
  }

  /**
   * Get agent state - CLI compatibility method
   */
  public getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get memory/history - CLI compatibility method
   */
  public getMemory(): ChatMessage[] {
    return [...this.history];
  }

  /**
   * Reset agent state - CLI compatibility method
   */
  public reset(): void {
    this.state = {
      sessionStart: new Date(),
      lastActivity: new Date(),
      completedTasks: []
    };
    this.history = [];
  }

  /**
   * Update last activity and track task completion
   */
  private updateActivity(taskDescription?: string): void {
    this.state.lastActivity = new Date();

    if (taskDescription) {
      // Complete current task if exists
      if (this.state.currentTask) {
        this.state.completedTasks.push({
          ...this.state.currentTask,
          completedAt: new Date()
        });
      }

      // Start new task
      this.state.currentTask = {
        id: randomUUID(),
        description: taskDescription,
        startedAt: new Date()
      };
    }
  }

  /**
   * Parse tool calls from LLM content (similar to original agent)
   */
  private parseToolCallsFromContent(content: string): Array<{ type: string; language: string; code: string }> {
    const toolCalls: Array<{ type: string; language: string; code: string }> = [];

    // Parse code blocks
    const codeBlockMatches = content.match(/\`\`\`(.*?)\n(.*?)\`\`\`/gs) || [];
    for (const match of codeBlockMatches) {
      const [_, language, code] = match.match(/\`\`\`(.*?)\n(.*?)\`\`\`/s) || ["", "", ""];
      const lang = language.trim().toLowerCase();
      if (lang === "bash" || lang === "javascript" || lang === "python" || lang === "js") {
        toolCalls.push({
          type: lang === "js" ? "javascript" : lang,
          language: lang === "js" ? "javascript" : lang,
          code: code.trim()
        });
      }
    }

    // Parse interpreter JSON blocks
    const interpMatches = content.match(/<\|interpreter\|>\s*\n?\s*\{[\s\S]*?\}/g) || [];
    for (const m of interpMatches) {
      const jsonStr = m.replace(/^[\s\S]*?<\|interpreter\|>/, '').trim();
      try {
        const data = JSON.parse(jsonStr);
        const code = (data.code || '').trim();
        if (code) {
          const lang = (data.language || 'bash').toLowerCase();
          const resolved = lang === 'js' ? 'javascript' : (lang === 'python' || lang === 'javascript' || lang === 'bash' ? lang : 'bash');
          toolCalls.push({ type: resolved, language: resolved, code });
        }
      } catch {}
    }

    // Parse bare JSON code objects
    const bareJsonMatches = content.match(/\{\s*"code"\s*:\s*"[\s\S]*?"[\s\S]*?\}/g) || [];
    for (const jm of bareJsonMatches) {
      try {
        const obj = JSON.parse(jm);
        const code = (obj.code || '').trim();
        if (code) {
          const lang = (obj.language || 'bash').toLowerCase();
          const resolved = lang === 'js' ? 'javascript' : (lang === 'python' || lang === 'javascript' || lang === 'bash' ? lang : 'bash');
          toolCalls.push({ type: resolved, language: resolved, code });
        }
      } catch {}
    }

    return toolCalls;
  }

  /**
   * Execute parsed tool calls
   */
  private async executeParsedToolCalls(toolCalls: Array<{ type: string; language: string; code: string }>): Promise<Array<{ name: string; result: string }>> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        this.log('DEBUG', 'executing_tool', { type: toolCall.type, language: toolCall.language });

        // Execute the code using the sandbox
        const codeBlock: CodeBlock = {
          language: toolCall.language,
          code: toolCall.code
        };

        const executionResult = await runCode(codeBlock);

        // Format the output
        let output = '';
        if (executionResult.logs && executionResult.logs.length > 0) {
          output += 'Logs:\n' + executionResult.logs.join('\n') + '\n';
        }
        if (executionResult.output !== undefined) {
          output += 'Output:\n' + String(executionResult.output);
        }

        results.push({
          name: toolCall.type,
          result: output || 'Code executed successfully with no output'
        });
      } catch (error) {
        results.push({
          name: toolCall.type,
          result: `Error executing ${toolCall.language} code: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return results;
  }

  /**
   * Execute tool calls from LLM response
   */
  private async executeToolCalls(toolCalls: any[]): Promise<Array<{ name: string; result: string }>> {
    const results = [];

    for (const toolCall of toolCalls) {
      try {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        this.log('DEBUG', 'executing_tool', { name: toolName, args });

        // Execute the tool using the tool registry
        const tool = this.toolRegistry.getToolFunction(toolName);
        if (tool) {
          const result = await tool(args.language, args.code);
          results.push({ name: toolName, result });
        } else {
          results.push({
            name: toolName,
            result: `Error: Tool ${toolName} not found`
          });
        }
      } catch (error) {
        results.push({
          name: toolCall.function.name,
          result: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return results;
  }

  /**
   * Make follow-up LLM call with current history
   */
  private async makeLLMCallWithHistory(): Promise<string> {
    try {
      const messages = this.history.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      }));

      const llmResponse = await chat(messages, false);
      this.log('INFO', 'followup_reply', { reply: llmResponse });

      return llmResponse;
    } catch (error) {
      this.log('ERROR', 'followup_llm_error', { error: String(error) });
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * CLI-compatible run method that returns expected format
   */
  async runCLI(prompt: string): Promise<{ text: string; requiresInput?: boolean; inputPrompt?: string }> {
    this.updateActivity(prompt);

    try {
      const result = await this.run(prompt);

      // Handle different return types
      let text: string;
      if (typeof result === 'string') {
        text = result;
      } else {
        // It's an AsyncGenerator, consume it
        text = '';
        for await (const chunk of result) {
          text += chunk;
        }
      }

      return {
        text,
        requiresInput: false,
        inputPrompt: undefined
      };
    } catch (error) {
      this.log('ERROR', 'run_cli_error', { error: String(error) });
      return {
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        requiresInput: false
      };
    }
  }
}
