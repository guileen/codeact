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

# Run development mode with tsx (for original CodeAct CLI)
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

### Dual Architecture
This repository contains two distinct agent systems:

1. **Legacy CodeAct** (`src-legacy/`): Original TypeScript code execution agent
2. **LightAgent TypeScript** (`src/`): Complete TypeScript rewrite of Python LightAgent

### LightAgent TypeScript Architecture

#### Core Components
- **LightAgent** (`src/light-agent.ts`): Main agent class with tool integration, memory support, and streaming
- **LightSwarm** (`src/light-swarm.ts`): Multi-agent coordination system
- **Tool System**: Modular tool registration and execution
  - `ToolRegistry`: Centralized tool management
  - `ToolLoader`: Dynamic tool loading with caching
  - `ToolDispatcher`: Async tool execution
  - `tool-decorator.ts`: Decorator-based tool creation
- **Types** (`src/types.ts`): Comprehensive TypeScript interfaces

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
Agents support OpenAI API integration, tool systems, memory interfaces, MCP (Model Context Protocol), streaming, and comprehensive logging. The current implementation uses mock responses for testing.

### Legacy CodeAct Architecture
- **Agent** (`src-legacy/agent.ts`): Code execution agent with strict four-step process
- **Sandbox** (`src-legacy/sandbox.ts`): Code execution environment using Anthropic AI Sandbox
- **CLI** (`src-legacy/cli.ts`): Command-line interface for interactive use

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
├── src/                    # LightAgent TypeScript implementation
│   ├── light-agent.ts     # Main agent class
│   ├── light-swarm.ts     # Multi-agent coordination
│   ├── tool-*.ts          # Tool system components
│   └── types.ts           # TypeScript definitions
├── src-legacy/            # Original CodeAct implementation
├── examples/              # Usage examples and tests
│   ├── 01-single-agent-simple.ts
│   ├── 04-multi-agent-simple.ts
│   ├── 03-tools-test.ts
│   ├── 06-error-handling.ts
│   └── tools/             # Example tool implementations
├── dist/                  # Compiled JavaScript output
└── test_comprehensive.ts  # Comprehensive test suite
```

## Development Notes

- The LightAgent implementation is production-ready but uses mock API responses
- Tool decorators require `experimentalDecorators` in tsconfig.json for full decorator support
- All examples are self-contained and demonstrate specific features
- The codebase maintains compatibility between the original Python LightAgent API and TypeScript patterns
- Error handling is comprehensive with detailed logging when debug mode is enabled