import { LightAgent, createTool } from '../src'

/**
 * Example 6: Error Handling and Edge Cases
 * Test various error scenarios and edge cases
 */

async function runErrorHandlingTest() {
  console.log('=== Error Handling Test ===\n')

  try {
    // Test 1: Missing API key
    console.log('1. Testing missing API key:')
    try {
      const agentNoKey = new LightAgent({
        name: 'NoKeyAgent',
        instructions: 'Test agent',
        model: 'gpt-4o-mini',
        api_key: '', // Empty API key
        debug: true,
      })
      console.log('❌ Should have failed with missing API key')
    } catch (error) {
      console.log('✅ Correctly caught missing API key error:', error.message)
    }

    // Test 2: Agent with no tools
    console.log('\n2. Testing agent with no tools:')
    const agentNoTools = new LightAgent({
      name: 'NoToolsAgent',
      instructions: 'You are an assistant with no tools',
      model: 'gpt-4o-mini',
      debug: true,
    })
    console.log('✅ Agent created successfully without tools')
    console.log('Tool count:', agentNoTools.getTools().length)

    // Test 3: Agent with invalid tool
    console.log('\n3. Testing agent with invalid tool:')
    function invalidFunction() {
      return 'test'
    }
    // Don't add tool_info - should not be registered
    const agentInvalidTool = new LightAgent({
      name: 'InvalidToolAgent',
      instructions: 'Test agent',
      model: 'gpt-4o-mini',
      debug: true,
      tools: [invalidFunction],
    })
    console.log('Tool count with invalid function:', agentInvalidTool.getTools().length)

    // Test 4: Test getting non-existent tool
    console.log('\n4. Testing getting non-existent tool:')
    const nonExistentTool = agentNoTools.getTool('non_existent')
    console.log('Non-existent tool:', nonExistentTool || 'undefined (correct)')

    // Test 5: Test agent with different configurations
    console.log('\n5. Testing various agent configurations:')

    // Agent with all parameters
    const fullAgent = new LightAgent({
      name: 'FullAgent',
      instructions: 'Complete agent configuration',
      role: 'Senior Assistant',
      model: 'gpt-4o-mini',
      debug: true,
      log_level: 'DEBUG',
      tree_of_thought: true,
      self_learning: true,
      filter_tools: false,
      memory: {
        store: async (data, userId) => ({ success: true }),
        retrieve: async (query, userId) => ({ results: [] }),
      },
    })
    console.log('✅ Full agent created successfully')
    console.log('Full agent name:', fullAgent.name)
    console.log('Full agent tools:', fullAgent.getTools().length)

    // Test 6: Test swarm operations
    console.log('\n6. Testing swarm edge cases:')
    const { LightSwarm } = await import('../src')
    const swarm = new LightSwarm()

    // Test getting non-existent agent
    try {
      const nonExistentAgent = swarm.getAgent('non_existent')
      console.log('Non-existent agent:', nonExistentAgent || 'undefined (correct)')
    } catch (error) {
      console.log('Error getting non-existent agent:', error.message)
    }

    // Test running non-existent agent
    try {
      await swarm.run('non_existent', 'test query')
      console.log('❌ Should have failed')
    } catch (error) {
      console.log('✅ Correctly caught non-existent agent error:', error.message)
    }

    // Test empty swarm
    console.log('Empty swarm agent count:', swarm.getAgentCount())
    console.log('Empty swarm agent names:', swarm.getAgentNames().join(', ') || '(empty)')

    // Add agents and test
    swarm.registerAgent(agentNoTools, agentInvalidTool)
    console.log('Swarm after adding agents:', swarm.getAgentCount())
    console.log('Swarm agents:', swarm.getAgentNames().join(', '))

    // Test agent removal
    const removed = swarm.removeAgent('InvalidToolAgent')
    console.log('Agent removal result:', removed)
    console.log('Swarm after removal:', swarm.getAgentCount())

    // Test removing non-existent agent
    const notRemoved = swarm.removeAgent('non_existent')
    console.log('Removing non-existent agent:', notRemoved)

    // Test running valid agent from swarm
    console.log('\n7. Testing swarm agent execution:')
    const swarmResponse = await swarm.run('NoToolsAgent', 'Hello from swarm')
    console.log('✅ Swarm response:', swarmResponse)

    console.log('\n✅ All error handling tests completed successfully!')
  } catch (error) {
    console.error('❌ Unexpected error in error handling test:', error)
  }
}

// Run the test
if (require.main === module) {
  runErrorHandlingTest().catch(console.error)
}

export { runErrorHandlingTest }
