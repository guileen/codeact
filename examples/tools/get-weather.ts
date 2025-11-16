import { tool } from '../../src';

/**
 * Weather tool example
 * Fetches weather information for a given city
 */

@tool({
  tool_name: 'get_weather',
  tool_title: 'Weather Query',
  tool_description: 'Get the current weather information for a specified city',
  tool_params: [
    {
      name: 'city_name',
      type: 'string',
      description: 'The name of the city to get weather for',
      required: true
    }
  ]
})
export function getWeather(cityName: string): string {
  // Mock weather data - in real implementation, you'd call a weather API
  const mockWeatherData: Record<string, any> = {
    'beijing': { temp: 22, condition: 'Sunny', humidity: 45 },
    'shanghai': { temp: 25, condition: 'Cloudy', humidity: 60 },
    'guangzhou': { temp: 28, condition: 'Rainy', humidity: 75 },
    'shenzhen': { temp: 27, condition: 'Partly Cloudy', humidity: 65 },
    'new york': { temp: 18, condition: 'Sunny', humidity: 50 },
    'london': { temp: 15, condition: 'Rainy', humidity: 80 },
    'tokyo': { temp: 20, condition: 'Cloudy', humidity: 55 }
  };

  const normalizedCity = cityName.toLowerCase();

  if (mockWeatherData[normalizedCity]) {
    const weather = mockWeatherData[normalizedCity];
    return `Weather in ${cityName}: ${weather.temp}°C, ${weather.condition}, Humidity: ${weather.humidity}%`;
  } else {
    return `Sorry, I don't have weather data for ${cityName}. Available cities: ${Object.keys(mockWeatherData).join(', ')}`;
  }
}