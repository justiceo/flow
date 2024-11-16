import os from "os";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { flow } from "../src/flow";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string,
});

// Demo function to simulate a weather API call
async function getWeather(location: string) {
  const weatherData = {
    location: location,
    temperature: "22°C",
    condition: "Sunny",
  };
  return weatherData;
}

export async function useChatGptApi(prompt: string) {
  flow.logPrompt(prompt, "user-input");

  const requestData: ChatCompletionCreateParamsNonStreaming = {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
    top_p: 0,
    functions: [
      {
        name: "getWeather",
        description: "Gets the weather information for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The name of the city to get the weather for",
            },
          },
          required: ["location"],
        },
      },
    ],
  };

  flow.logRequest(requestData);

  try {
    const aiResponse: any = await openai.chat.completions.create(requestData);

    flow.logResponse(aiResponse);

    // Handle function call if present
    const functionCall = aiResponse.choices[0]?.message?.function_call;
    if (functionCall && functionCall.name === "getWeather") {
      try {
        const args = JSON.parse(functionCall.arguments);
        const weatherData = await getWeather(args.location);
        flow.logFunctionCall({ ...functionCall, result: weatherData });
        // console.log(`Weather Data for ${args.location}:`, weatherData);
      } catch (parseError) {
        console.error("Error parsing function call arguments:", parseError);
      }
    }

    const logEntry = await flow.flushLogs();

    return logEntry;
  } catch (error: unknown) {
    if (error instanceof Error) {
      flow.logError(error);
    } else {
      console.error("Unexpected error", error);
    }
  }
}

describe("Flow", () => {
  it("should log prompts, requests, responses, function calls using live api", async () => {
    const logEntry = await useChatGptApi(
      "What's the weather in Ikorodu, Lagos?",
    );

    // Assertions for Request
    expect(logEntry?.request?.prompt).toEqual(
      "What's the weather in Ikorodu, Lagos?",
    );
    expect(logEntry?.request?.model).toEqual("gpt-4o-mini");
    expect(logEntry?.request?.temperature).toEqual(0.7);
    expect(logEntry?.request?.maxTokens).toEqual(150);
    expect(logEntry?.request?.topP).toEqual(0);

    // Assertions for Response
    expect(logEntry?.response?.status).toEqual(200);

    // Assertions for Function Call
    expect(logEntry?.functionCalls?.[0]?.name).toEqual("getWeather");

    // Assertions for Meta
    expect(logEntry?.meta?.operatingSystem).toEqual(
      `${os.platform()}/${os.release()}`,
    );
  }, 20000);
});
