export interface ToolInfo {
  tool_name: string;
  tool_title?: string;
  tool_description: string;
  tool_params: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface MemoryProtocol {
  store(data: string, user_id: string): Promise<any>;
  retrieve(query: string, user_id: string): Promise<any>;
}

export interface AgentConfig {
  name?: string;
  instructions?: string;
  role?: string;
  model: string;
  api_key?: string;
  base_url?: string;
  websocket_base_url?: string;
  memory?: MemoryProtocol;
  tree_of_thought?: boolean;
  tot_model?: string;
  tot_api_key?: string;
  tot_base_url?: string;
  filter_tools?: boolean;
  self_learning?: boolean;
  tools?: Array<string | Function>;
  debug?: boolean;
  log_level?: 'INFO' | 'DEBUG' | 'ERROR';
  log_file?: string;
  tracetools?: any;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface MCPServerConfig {
  disabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface ToolResponse {
  name: string;
  title?: string;
  output?: string;
  error?: string;
}