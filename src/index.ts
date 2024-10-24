import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';
import { flow } from './flow';
import dotenv from 'dotenv';
import { consoleTransport, fileTransport} from "./transports";
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';


dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});


// This is a demo function i created to simulate a weather API call
async function getWeather(location: string) {
  const weatherData = {
    location: location,
    temperature: "22°C",
    condition: "Sunny",
  };
  return weatherData;
}

export async function useChatGptApi(prompt: string) {
  flow.logPrompt(prompt, 'user-input');

  const requestData: ChatCompletionCreateParamsNonStreaming = {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
    top_p : 0,
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
    
  }

  flow.logRequest(requestData);

  try {
    const aiResponse: any = await openai.chat.completions.create(
      requestData
    );

    flow.logResponse(aiResponse);

    // Handle function call if present
    const functionCall = aiResponse.choices[0]?.message?.function_call;
    if (functionCall && functionCall.name === 'getWeather') {
      try {
        const args = JSON.parse(functionCall.arguments); 
        const weatherData = await getWeather(args.location);
        flow.logFunctionCall({...functionCall, result : weatherData});
        // console.log(`Weather Data for ${args.location}:`, weatherData);
      } catch (parseError) {
        console.error('Error parsing function call arguments:', parseError);
      }
    }

    const logEntry = await flow.flushLogs();

    return logEntry;

  } catch (error: unknown) {
    if (error instanceof Error) {
        flow.logError(error);
    } else {
        console.error('Unexpected error', error);
    }
}
}

useChatGptApi("What's the weather in Ikorodu, Lagos?");
