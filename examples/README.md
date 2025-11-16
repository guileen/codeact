# LightAgent TypeScript Examples

This directory contains examples demonstrating how to use the LightAgent TypeScript implementation.

## Examples Overview

### 1. Single Agent (`01-single-agent.ts`)
- Demonstrates basic agent setup
- Shows how to create and use a simple tool with decorators
- Covers basic agent configuration and usage

### 2. Agent with Tools (`02-tools-agent.ts`)
- Shows how to use multiple tools with an agent
- Demonstrates tool integration and usage
- Includes weather and calculator tools

### 3. Multi-Agent Swarm (`04-multi-agent.ts`)
- Demonstrates how to use multiple specialized agents
- Shows swarm coordination and agent registration
- Covers agent specialization and task delegation

### 4. Streaming Responses (`05-streaming.ts`)
- Shows how to use streaming output
- Demonstrates both streaming and non-streaming modes
- Covers streaming with tool usage

## Tools Directory

The `tools/` directory contains example tool implementations:

- `get-weather.ts` - Weather information tool
- `calculator.ts` - Mathematical calculation tool

## Running the Examples

### Prerequisites

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

### Running Individual Examples

```bash
# Single agent example
npx tsx examples/01-single-agent.ts

# Agent with tools example
npx tsx examples/02-tools-agent.ts

# Multi-agent swarm example
npx tsx examples/04-multi-agent.ts

# Streaming example
npx tsx examples/05-streaming.ts
```

### Building the Project

```bash
# Compile TypeScript
npm run build

# Run the compiled examples
node dist/examples/01-single-agent.js
```

## Key Features Demonstrated

### Tool Creation
Tools can be created using the `@tool` decorator:

```typescript
@tool({
  tool_name: 'my_tool',
  tool_title: 'My Tool',
  tool_description: 'Description of what this tool does',
  tool_params: [
    {
      name: 'param1',
      type: 'string',
      description: 'Parameter description',
      required: true
    }
  ]
})
function myTool(param1: string): string {
  // Tool implementation
  return `Result: ${param1}`;
}
```

### Agent Configuration
```typescript
const agent = new LightAgent({
  name: 'MyAgent',
  instructions: 'You are a helpful assistant.',
  role: 'Assistant',
  model: 'gpt-4o-mini',
  debug: true,
  tools: [myTool]
});
```

### Swarm Management
```typescript
const swarm = new LightSwarm();
swarm.registerAgent(agent1, agent2, agent3);

const response = await swarm.run('AgentName', 'User query');
```

### Streaming Usage
```typescript
const stream = await agent.run('User query', { stream: true });

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

## Notes

- The examples use mock responses for demonstration purposes
- In a real implementation, you'd need to configure actual OpenAI API calls
- Tools are loaded dynamically and should export functions with the `tool_info` metadata
- The TypeScript implementation maintains compatibility with the original Python LightAgent concepts while adapting to TypeScript/JavaScript patterns