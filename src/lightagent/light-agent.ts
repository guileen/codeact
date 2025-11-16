import { randomUUID } from 'crypto';
import { MemoryProtocol, AgentConfig, ChatMessage, ToolCall, MCPConfig } from './types';
import { ToolRegistry } from './tool-registry';
import { ToolLoader } from './tool-loader';
import { ToolDispatcher } from './tool-dispatcher';
import { LoggerManager } from './logger';

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
  private logger?: LoggerManager;

  // Chat history
  private chatParams: any = {};
  private history: ChatMessage[] = [];

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
    this.api_key = config.api_key || process.env.OPENAI_API_KEY || '';
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

    // Setup logging
    if (this.debug) {
      this.logger = new LoggerManager(
        this.name,
        this.debug,
        this.log_level,
        this.log_file
      );
    }

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
    if (this.logger) {
      this.logger.setTraceId(traceId);
    }

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

    // Mock response for now - in a real implementation, you'd call the OpenAI API
    const mockResponse = this.createMockResponse(stream);

    return this.processResponse(mockResponse, stream, max_retry);
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
      // Mock processing - in real implementation, handle tool calls here
      const content = response.choices?.[0]?.message?.content || 'No content available';

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
    if (this.logger) {
      this.logger.log(level, action, data);
    }
  }
}