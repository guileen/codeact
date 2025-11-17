import { LightAgent, LightSwarm, createTool } from '../src'

/**
 * Example 4: Simple Multi-Agent Swarm
 * Demonstrates how to use multiple agents together without decorators
 */

// Simple weather tool
function getWeatherFunction(cityName: string): string {
  const mockWeatherData: Record<string, any> = {
    beijing: { temp: 22, condition: 'Sunny' },
    shanghai: { temp: 25, condition: 'Cloudy' },
    tokyo: { temp: 20, condition: 'Cloudy' },
  }

  const normalizedCity = cityName.toLowerCase()
  if (mockWeatherData[normalizedCity]) {
    const weather = mockWeatherData[normalizedCity]
    return `Weather in ${cityName}: ${weather.temp}°C, ${weather.condition}`
  } else {
    return `Sorry, no weather data for ${cityName}`
  }
}

const getWeather = createTool(getWeatherFunction, {
  tool_name: 'get_weather',
  tool_title: 'Weather Query',
  tool_description: 'Get weather information for a city',
  tool_params: [
    {
      name: 'city_name',
      type: 'string',
      description: 'City name to get weather for',
      required: true,
    },
  ],
})

async function runMultiAgentExample() {
  console.log('=== Multi-Agent Swarm Example ===\n')

  try {
    // Create specialized agents
    const weatherAgent = new LightAgent({
      name: 'WeatherAgent',
      instructions: 'You are a weather expert. Provide weather information.',
      role: 'Weather Specialist',
      model: 'gpt-4o-mini',
      debug: true,
      tools: [getWeather],
    })

    const generalAgent = new LightAgent({
      name: 'GeneralAgent',
      instructions: 'You are a helpful general assistant.',
      role: 'General Assistant',
      model: 'gpt-4o-mini',
      debug: true,
    })

    // Create swarm and register agents
    const swarm = new LightSwarm()
    swarm.registerAgent(weatherAgent, generalAgent)

    console.log('Registered Agents:')
    swarm.getAgentNames().forEach((name, index) => {
      console.log(`${index + 1}. ${name}`)
    })

    console.log('\n=== Testing Individual Agents ===')

    console.log('\n1. Weather Agent:')
    const weatherResponse = await swarm.run('WeatherAgent', 'What is the weather like in Tokyo?')
    console.log('Weather Response:', weatherResponse)

    console.log('\n2. General Agent:')
    const generalResponse = await swarm.run('GeneralAgent', 'Can you help me with a question?')
    console.log('General Response:', generalResponse)

    console.log('\n=== Agent Capabilities ===')
    console.log('Weather Agent Tools:', weatherAgent.getTools().length)
    console.log('General Agent Tools:', generalAgent.getTools().length)

    console.log('\n=== Swarm Statistics ===')
    console.log(`Total Agents: ${swarm.getAgentCount()}`)
    console.log(`Available Agents: ${swarm.getAgentNames().join(', ')}`)
  } catch (error) {
    console.error('Error running multi-agent example:', error)
  }
}

// Run the example
if (require.main === module) {
  runMultiAgentExample().catch(console.error)
}

export { runMultiAgentExample }
