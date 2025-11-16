# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Principles
- **Code Golf**: Write as few lines/tokens of code as possible while maintaining readability and functionality.
- **Minimal Modification**: Use `git diff` to check for minimal changes when implementing new features or fixing bugs.
- **Less File Creation**: Avoid creating new files unless absolutely necessary. Focus on modifying existing files.
- **Wise Dependencies**: Use only the necessary dependencies. Judge implement ourself or use existing libraries base on complexity and maintainability. Avoid use huge dependencies that may cause performance issues.
- **Lint and Test**: After implementing a feature or fixing a bug, run linting and tests to ensure code quality and functionality.
- **Check Affected Files**: Before modify a share function, use `rg` to check where it is used. If it is used in multiple places, think about the impact of the change.
- **Think Before Implement**: understand execution flow, think the state before do it. what if you do something what the state of code will be, what will happen, can it
be success? If there are multiple ways to implement a feature, for each way think the state after implementation, pros and cons, overview all ways, choose the most maintainable and efficient one.

## Development Commands

### Build and Development
```bash
# Build TypeScript to JavaScript
npm run build

# Run development mode with tsx (LightAgent-powered CLI)
npm run dev

# Start production build
npm start

# Install dependencies
npm install
# or
pnpm install
```

### Running Examples
```bash
# Run TypeScript examples (LightAgent implementation)
npx tsx examples/01-single-agent-simple.ts
npx tsx examples/04-multi-agent-simple.ts
npx tsx examples/03-tools-test.ts
npx tsx examples/06-error-handling.ts

# Build and run compiled examples
npm run build
node dist/examples/01-single-agent-simple.js
```

### Testing
```bash
# Run comprehensive test suite
npx tsx test_comprehensive.ts

# Manual testing examples (from project root)
npx tsx examples/01-single-agent-simple.ts && echo "✅ Single agent test passed"
npx tsx examples/04-multi-agent-simple.ts && echo "✅ Multi-agent test passed"
npx tsx examples/03-tools-test.ts && echo "✅ Tools test passed"
npx tsx examples/06-error-handling.ts && echo "✅ Error handling test passed"
```

## Project Architecture

### Unified Architecture
This repository now uses LightAgent as the primary agent system:

1. **LightAgent-Powered CLI** (`src/cli.ts`): Main command-line interface using LightAgent for all interactions
2. **LightAgent TypeScript** (`src/lightagent/`): Complete TypeScript implementation with tool system, memory, and streaming
3. **Legacy Components** (`src/agent.ts`, etc.): Original implementations retained for reference

### Main Architecture (LightAgent-Powered)

#### Core Components
- **CLI** (`src/cli.ts`): Command-line interface powered by LightAgent for interactive code execution
- **LightAgent** (`src/lightagent/light-agent.ts`): Main agent class with tool integration, memory support, and streaming
- **Legacy Agent** (`src/agent.ts`): Original code execution agent (deprecated, use LightAgent)
- **Sandbox** (`src/sandbox.ts`): Code execution environment using Anthropic AI Sandbox
- **Tool System**: (`src/tools.ts`, `src/tool_executor.ts`): Tool integration and execution
- **UI** (`src/ui_clean.ts`): User interface components
- **LLM** (`src/llm.ts`): Language model integration
- **Config** (`src/config.ts`): Configuration management

### LightAgent TypeScript Architecture

#### Core Components
- **LightAgent** (`src/lightagent/light-agent.ts`): Main agent class with tool integration, memory support, and streaming
- **LightSwarm** (`src/lightagent/light-swarm.ts`): Multi-agent coordination system
- **Tool System**: Modular tool registration and execution
  - `ToolRegistry` (`src/lightagent/tool-registry.ts`): Centralized tool management
  - `ToolLoader` (`src/lightagent/tool-loader.ts`): Dynamic tool loading with caching
  - `ToolDispatcher` (`src/lightagent/tool-dispatcher.ts`): Async tool execution
  - `tool-decorator.ts` (`src/lightagent/tool-decorator.ts`): Decorator-based tool creation
- **Types** (`src/lightagent/types.ts`): Comprehensive TypeScript interfaces
- **Logger** (`src/lightagent/logger.ts`): Logging utilities

#### Tool Creation Patterns
```typescript
// Using decorators (requires experimentalDecorators)
@tool({
  tool_name: 'my_tool',
  tool_description: 'Description',
  tool_params: [{ name: 'param', type: 'string', description: '...', required: true }]
})
function myTool(param: string): string { return result; }

// Using createTool helper (preferred)
const tool = createTool(myFunction, {
  tool_name: 'my_tool',
  tool_description: 'Description',
  tool_params: [...]
});
```

#### Agent Configuration
Agents support real LLM API integration (via existing LLM module), tool systems, memory interfaces, MCP (Model Context Protocol), streaming, and comprehensive logging. The implementation now uses real LLM calls instead of mock responses.

### Reference Implementations
- **LightAgent Python** (`LightAgent/`): Python LightAgent submodule for reference and comparison
- **Legacy Agent** (`src/agent.ts`): Original four-step process agent (deprecated, use LightAgent)

## Key Technical Decisions

### TypeScript Configuration
- Target: ES2020, Module: ES2020
- Strict mode enabled with full type checking
- Declaration maps and source maps for debugging
- Isolated modules for compatibility

### Tool System Design
- Tools are first-class citizens with metadata
- Dynamic loading from TypeScript files
- Type-safe parameter validation
- Async/sync execution support with streaming

### Multi-Agent Coordination
- Swarm pattern for agent management
- Task delegation capabilities
- Shared context and history management
- Individual agent specialization

## Environment Setup

### Required Environment Variables
```bash
OPENAI_API_KEY=your_openai_key_here
```

### Project Structure
```
├── src/                           # Main source code
│   ├── cli.ts                    # Command-line interface (LightAgent-powered)
│   ├── agent.ts                  # Legacy CodeAct agent (deprecated)
│   ├── lightagent/               # LightAgent TypeScript implementation
│   │   ├── light-agent.ts        # Main LightAgent class
│   │   ├── code-execution-tools.ts # Code execution tools
│   │   ├── light-swarm.ts        # Multi-agent coordination
│   │   ├── tool-*.ts             # Tool system components
│   │   ├── types.ts              # TypeScript definitions
│   │   ├── logger.ts             # Logging utilities
│   │   └── index.ts              # Entry point
│   ├── llm.ts                    # Language model integration
│   ├── sandbox.ts                # Code execution environment
│   ├── config.ts                 # Configuration management
│   ├── context.ts                # Context management
│   ├── tools.ts                  # Tool integration
│   ├── tool_executor.ts          # Tool execution engine
│   ├── ui_clean.ts               # User interface components
│   ├── prompt.ts                 # Prompt templates
│   └── schemas.ts                # Type schemas
├── examples/                      # Usage examples and tests
│   ├── 01-single-agent-simple.ts
│   ├── 04-multi-agent-simple.ts
│   ├── 03-tools-test.ts
│   ├── 06-error-handling.ts
│   └── tools/                    # Example tool implementations
├── tests/                         # Test files
│   └── test_comprehensive.ts      # Comprehensive test suite
├── docs/                          # Documentation
│   └── AGI_RESEARCH.md            # Research documentation
├── LightAgent/                    # Python LightAgent submodule (reference)
├── dist/                          # Compiled JavaScript output
├── README.md                      # Main project documentation
├── CLAUDE.md                      # Claude Code guidance (this file)
├── package.json                   # Node.js dependencies
└── tsconfig.json                  # TypeScript configuration
```

## Development Notes

- The LightAgent implementation now uses real LLM API calls via the existing `src/llm.ts` module
- Supports configurable models via `LLM_MODEL` environment variable (defaults to `gpt-4o-mini`)
- Uses `LLM_API_KEY` and `LLM_BASE_URL` environment variables for API configuration
- Fallback to error responses if LLM calls fail, ensuring robust operation
- Tool decorators require `experimentalDecorators` in tsconfig.json for full decorator support
- All examples are self-contained and demonstrate specific features
- The codebase maintains compatibility between the original Python LightAgent API and TypeScript patterns
- Error handling is comprehensive with detailed logging when debug mode is enabled