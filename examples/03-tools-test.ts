import { LightAgent, createTool } from '../src';

/**
 * Example 3: Test various tool features
 * Comprehensive testing of tool system
 */

// Test 1: Tool with parameters
function addNumbers(params: { a: number; b: number }): string {
  const result = params.a + params.b;
  return `The sum of ${params.a} and ${params.b} is ${result}`;
}

const addTool = createTool(addNumbers, {
  tool_name: 'add_numbers',
  tool_title: 'Add Numbers',
  tool_description: 'Add two numbers together',
  tool_params: [
    {
      name: 'a',
      type: 'number',
      description: 'First number',
      required: true
    },
    {
      name: 'b',
      type: 'number',
      description: 'Second number',
      required: true
    }
  ]
});

// Test 2: Tool with optional parameters
function greet(params: { name?: string }): string {
  const name = params.name || 'World';
  return `Hello, ${name}!`;
}

const greetTool = createTool(greet, {
  tool_name: 'greet',
  tool_title: 'Greeting',
  tool_description: 'Generate a greeting message',
  tool_params: [
    {
      name: 'name',
      type: 'string',
      description: 'Name to greet (optional)',
      required: false
    }
  ]
});

async function runToolsTest() {
  console.log('=== Tools Test Example ===\n');

  try {
    // Create agent with multiple tools
    const agent = new LightAgent({
      name: 'ToolsTestAgent',
      instructions: 'You are a helpful assistant that can perform calculations and greetings.',
      role: 'Tools Test Assistant',
      model: 'gpt-4o-mini',
      debug: true,
      tools: [addTool, greetTool]
    });

    console.log('=== Tool Information ===');
    const tools = agent.getTools();
    console.log(`Total tools: ${tools.length}`);

    tools.forEach((tool, index) => {
      console.log(`\nTool ${index + 1}:`);
      console.log(`  Name: ${tool.function.name}`);
      console.log(`  Description: ${tool.function.description}`);
      console.log(`  Required params: ${tool.function.parameters.required.join(', ')}`);
      console.log(`  All params: ${Object.keys(tool.function.parameters.properties).join(', ')}`);
    });

    console.log('\n=== Testing Tool Execution ===');

    // Test 1: Tool with required parameters
    console.log('\n1. Testing math tool:');
    const mathResponse = await agent.run('What is 15 + 27?');
    console.log('Math Response:', mathResponse);

    // Test 2: Tool with optional parameters
    console.log('\n2. Testing greeting tool:');
    const greetResponse = await agent.run('Say hello to Alice');
    console.log('Greeting Response:', greetResponse);

    // Test 3: General greeting without name
    console.log('\n3. Testing general greeting:');
    const generalGreetResponse = await agent.run('Say hello');
    console.log('General Greeting Response:', generalGreetResponse);

    // Test 4: Edge case - complex query
    console.log('\n4. Testing complex query:');
    const complexResponse = await agent.run('Calculate 100 + 200 and then greet John');
    console.log('Complex Response:', complexResponse);

    // Test 5: Error handling
    console.log('\n5. Testing error handling:');
    try {
      const errorResponse = await agent.run('This should not cause any errors');
      console.log('Error Test Response:', errorResponse);
    } catch (error) {
      console.log('Caught error:', error);
    }

    console.log('\n=== Tool Registry Information ===');
    console.log('Tool names from agent:', tools.map(t => t.function.name));

    // Test accessing tools directly
    console.log('\n=== Direct Tool Access ===');
    const addToolFunc = agent.getTool('add_numbers');
    if (addToolFunc) {
      // Note: This would work in a real implementation with proper tool execution
      console.log('Add tool found and accessible');
    }

    const greetToolFunc = agent.getTool('greet');
    if (greetToolFunc) {
      console.log('Greet tool found and accessible');
    }

    console.log('\n✅ Tools test completed successfully!');

  } catch (error) {
    console.error('❌ Error in tools test:', error);
  }
}

// Run the test
if (require.main === module) {
  runToolsTest().catch(console.error);
}

export { runToolsTest };