import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';
import { flow } from './flow';
import dotenv from 'dotenv';
import { consoleTransport, fileTransport} from "./transports";


dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});


interface RequestData {
  model: string;
  prompt: string;
  temperature: number;
  max_tokens: number;
}

interface WeatherData {
  location: string;
  temperature: string;
  condition: string;
}

// This is a demo function i created to simulate a weather API call
async function getWeather(location: string): Promise<WeatherData> {
  const weatherData = {
    location: location,
    temperature: "22°C",
    condition: "Sunny",
  };
  return weatherData;
}

async function useChatGptApi(prompt: string): Promise<void> {
  flow.logPrompt(prompt, 'user-input');

  const requestData: RequestData = {
    model: 'gpt-4o',
    prompt: prompt,
    temperature: 0.7,
    max_tokens: 150,
  };

  flow.logRequest(requestData);

  try {
    const aiResponse: any = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: requestData.prompt }],
      max_tokens: requestData.max_tokens,
      temperature: requestData.temperature,
      functions: [
        {
          name: 'getWeather',
          description: 'Gets the weather information for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The name of the city to get the weather for',
              },
            },
            required: ['location'],
          },
        },
      ],
    });

    flow.logResponse(aiResponse);

    // Handle function call if present
    const functionCall = aiResponse.choices[0]?.message?.function_call;
    if (functionCall && functionCall.name === 'getWeather') {
      flow.logFunctionCall(functionCall);
      try {
        const args = JSON.parse(functionCall.arguments); 
        const weatherData = await getWeather(args.location);
        console.log(`Weather Data for ${args.location}:`, weatherData);
      } catch (parseError) {
        console.error('Error parsing function call arguments:', parseError);
      }
    }

    await flow.flushLogs();

  } catch (error: unknown) {
    if (error instanceof Error) {
        flow.logError(error);
    } else {
        console.error('Unexpected error', error);
    }
}
}

useChatGptApi("What's the weather in Ikorodu, Lagos?");
