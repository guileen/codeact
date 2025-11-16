import { LightAgent } from '../src';
import { getWeather } from './tools/get-weather';
import { calculate } from './tools/calculator';

/**
 * Example 2: Agent with Multiple Tools
 * Demonstrates how to use tools with an agent
 */

async function runToolsAgentExample() {
  console.log('=== Tools Agent Example ===\n');

  // Create an agent with multiple tools
  const agent = new LightAgent({
    name: 'ToolsAgent',
    instructions: 'You are a helpful assistant that can provide weather information and perform calculations.',
    role: 'Weather and Math Assistant',
    model: 'gpt-4o-mini',
    debug: true,
    tools: [getWeather, calculate]
  });

  // Test weather tool
  console.log('1. Testing weather tool:');
  const weatherResponse = await agent.run('What is the weather like in Beijing?');
  console.log('Weather Response:', weatherResponse);

  console.log('\n2. Testing calculator tool:');
  const calcResponse = await agent.run('Calculate 15 * 8 + 32');
  console.log('Calculation Response:', calcResponse);

  console.log('\n3. Combined query:');
  const combinedResponse = await agent.run('If it\'s 25°C in Shanghai, what would that be in Fahrenheit? Use the formula F = (C × 9/5) + 32');
  console.log('Combined Response:', combinedResponse);

  // Show tool information
  console.log('\nAvailable Tools:');
  const tools = agent.getTools();
  tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.function.name}: ${tool.function.description}`);
  });
}

// Run the example
if (require.main === module) {
  runToolsAgentExample().catch(console.error);
}

export { runToolsAgentExample };