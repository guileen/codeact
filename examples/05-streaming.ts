import { LightAgent } from '../src';
import { getCurrentTime } from './01-single-agent';

/**
 * Example 5: Streaming Responses
 * Demonstrates how to use streaming output
 */

async function runStreamingExample() {
  console.log('=== Streaming Example ===\n');

  // Create an agent
  const agent = new LightAgent({
    name: 'StreamingAgent',
    instructions: 'You are a helpful assistant that provides detailed, step-by-step responses.',
    role: 'Streaming Assistant',
    model: 'gpt-4o-mini',
    debug: true,
    tools: [getCurrentTime]
  });

  // Test streaming response
  console.log('1. Streaming Response:');
  const stream = await agent.run('Tell me a story about AI development', { stream: true });

  console.log('Streaming output:');
  if (typeof stream === 'object' && stream[Symbol.asyncIterator]) {
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    console.log('\n');
  }

  console.log('\n2. Non-Streaming Response:');
  const nonStream = await agent.run('What is the capital of France?', { stream: false });
  console.log('Non-streaming output:', nonStream);

  console.log('\n3. Streaming with Tool:');
  const streamWithTool = await agent.run('What time is it and tell me about current technology trends?', {
    stream: true
  });

  console.log('Streaming with tool output:');
  if (typeof streamWithTool === 'object' && streamWithTool[Symbol.asyncIterator]) {
    for await (const chunk of streamWithTool) {
      process.stdout.write(chunk);
    }
    console.log('\n');
  }
}

// Utility function for the current time tool
function getCurrentTime(): string {
  const now = new Date();
  return `Current time: ${now.toLocaleString()}`;
}
(getCurrentTime as any).tool_info = {
  tool_name: 'get_current_time',
  tool_title: 'Current Time',
  tool_description: 'Get the current date and time',
  tool_params: []
};

// Run the example
if (require.main === module) {
  runStreamingExample().catch(console.error);
}

export { runStreamingExample };