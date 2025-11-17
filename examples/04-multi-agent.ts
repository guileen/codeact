import { LightAgent, LightSwarm } from '../src'
import { getWeather } from './tools/get-weather'
import { calculate } from './tools/calculator'

/**
 * Example 4: Multi-Agent Swarm
 * Demonstrates how to use multiple agents together
 */

async function runMultiAgentExample() {
  console.log('=== Multi-Agent Swarm Example ===\n')

  // Create specialized agents
  const weatherAgent = new LightAgent({
    name: 'WeatherAgent',
    instructions:
      'You are a weather expert. Provide detailed weather information and climate-related insights.',
    role: 'Weather Specialist',
    model: 'gpt-4o-mini',
    debug: true,
    tools: [getWeather],
  })

  const mathAgent = new LightAgent({
    name: 'MathAgent',
    instructions:
      'You are a mathematics expert. Solve calculations and provide mathematical explanations.',
    role: 'Mathematics Specialist',
    model: 'gpt-4o-mini',
    debug: true,
    tools: [calculate],
  })

  const generalAgent = new LightAgent({
    name: 'GeneralAgent',
    instructions:
      'You are a helpful general assistant. Handle various types of queries and coordinate with specialists when needed.',
    role: 'General Assistant',
    model: 'gpt-4o-mini',
    debug: true,
  })

  // Create swarm and register agents
  const swarm = new LightSwarm()
  swarm.registerAgent(weatherAgent, mathAgent, generalAgent)

  console.log('Registered Agents:')
  swarm.getAgentNames().forEach((name, index) => {
    console.log(`${index + 1}. ${name}`)
  })

  // Test individual agents
  console.log('\n=== Testing Individual Agents ===')

  console.log('\n1. Weather Agent:')
  const weatherResponse = await swarm.run('WeatherAgent', 'What is the weather like in Tokyo?')
  console.log('Weather Response:', weatherResponse)

  console.log('\n2. Math Agent:')
  const mathResponse = await swarm.run('MathAgent', 'Calculate the square root of 144')
  console.log('Math Response:', mathResponse)

  console.log('\n3. General Agent:')
  const generalResponse = await swarm.run('GeneralAgent', 'Can you help me plan a trip?')
  console.log('General Response:', generalResponse)

  // Demonstrate agent capabilities
  console.log('\n=== Agent Capabilities ===')

  console.log('\nWeather Agent Tools:')
  weatherAgent.getTools().forEach(tool => {
    console.log(`- ${tool.function.name}: ${tool.function.description}`)
  })

  console.log('\nMath Agent Tools:')
  mathAgent.getTools().forEach(tool => {
    console.log(`- ${tool.function.name}: ${tool.function.description}`)
  })

  console.log('\nGeneral Agent Tools:')
  console.log(`- Tools: ${generalAgent.getTools().length} (General agent has no specialized tools)`)

  // Swarm statistics
  console.log('\n=== Swarm Statistics ===')
  console.log(`Total Agents: ${swarm.getAgentCount()}`)
  console.log(`Available Agents: ${swarm.getAgentNames().join(', ')}`)
}

// Run the example
if (require.main === module) {
  runMultiAgentExample().catch(console.error)
}

export { runMultiAgentExample }
