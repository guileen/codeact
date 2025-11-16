import { LightAgent, createTool } from '../src';

/**
 * Example 1: Simple Single Agent Usage
 * Demonstrates basic agent setup and usage without decorators
 */

// Define a simple tool using createTool helper
function getCurrentTimeFunction(): string {
  const now = new Date();
  return `Current time: ${now.toLocaleString()}`;
}

const getCurrentTime = createTool(getCurrentTimeFunction, {
  tool_name: 'get_current_time',
  tool_title: 'Current Time',
  tool_description: 'Get the current date and time',
  tool_params: []
});

async function runSingleAgentExample() {
  console.log('=== Single Agent Example ===\n');

  try {
    // Create a simple agent
    const agent = new LightAgent({
      name: 'TimeAgent',
      instructions: 'You are a helpful assistant that can tell the current time.',
      role: 'Time Assistant',
      model: 'gpt-4o-mini',
      debug: true,
      tools: [getCurrentTime]
    });

    console.log('Agent created successfully!');
    console.log('Agent name:', agent.name);
    console.log('Available tools:', agent.getTools().length);

    // Run the agent
    const response = await agent.run('What time is it now?');

    console.log('Agent Response:', response);

    // Get agent information
    console.log('\nAgent Info:');
    console.log('Name:', agent.name);
    console.log('Available tools:', agent.getTools().map(t => t.function.name));
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example
if (require.main === module) {
  runSingleAgentExample().catch(console.error);
}

export { runSingleAgentExample };