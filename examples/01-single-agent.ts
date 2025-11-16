import { LightAgent, tool } from '../src';

/**
 * Example 1: Single Agent Usage
 * Demonstrates basic agent setup and usage
 */

// Define a simple tool using the decorator
@tool({
  tool_name: 'get_current_time',
  tool_title: 'Current Time',
  tool_description: 'Get the current date and time',
  tool_params: []
})
function getCurrentTime(): string {
  const now = new Date();
  return `Current time: ${now.toLocaleString()}`;
}

async function runSingleAgentExample() {
  console.log('=== Single Agent Example ===\n');

  // Create a simple agent
  const agent = new LightAgent({
    name: 'TimeAgent',
    instructions: 'You are a helpful assistant that can tell the current time.',
    role: 'Time Assistant',
    model: 'gpt-4o-mini',
    debug: true,
    tools: [getCurrentTime]
  });

  // Run the agent
  const response = await agent.run('What time is it now?');

  console.log('Agent Response:', response);

  // Get agent information
  console.log('\nAgent Info:');
  console.log('Name:', agent.name);
  console.log('Available tools:', agent.getTools().map(t => t.function.name));
}

// Run the example
if (require.main === module) {
  runSingleAgentExample().catch(console.error);
}

export { runSingleAgentExample };