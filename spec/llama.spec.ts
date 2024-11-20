import os from "os";
import dotenv from "dotenv";
import Together from "together-ai";
import { CompletionCreateParamsNonStreaming } from "together-ai/resources/chat/completions";
import { flow } from "../src/flow";

dotenv.config();

async function getWeather({ location, unit }: any) {
  return " celsius: 15°C, partly cloudy";
}

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

async function useLLamaApi(prompt: string) {
  flow.logPrompt(prompt, "user-input");

  const requestData: CompletionCreateParamsNonStreaming = {
    messages: [{ role: "user", content: prompt }],
    model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    max_tokens: 512,
    temperature: 0.7,
    top_k: 50,
    top_p: 0.9,
    tools: [
      {
        type: "function",
        function: {
          name: "getWeather",
          description: "Get the current weather in a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state, e.g. San Francisco, CA",
              },
              unit: {
                type: "string",
                enum: ["celsius", "fahrenheit"],
              },
            },
          },
        },
      },
    ],
  };

  flow.logRequest(requestData);

  try {
    const response = await together.chat.completions.create(requestData);

    flow.logResponse(response);

    // Handle function call if present
    const functionCall =
      response?.choices?.[0]?.message?.tool_calls?.[0]?.function;
    //   console.log("Function Call:", functionCall);
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

describe.skip("Llama Flow", () => {
  it("should log prompts, requests, responses, function calls using live api", async () => {
    const logEntry = await useLLamaApi("What's the weather in Ikorodu, Lagos?");

    // Assertions for Request
    expect(logEntry?.request?.prompt).toEqual(
      "What's the weather in Ikorodu, Lagos?",
    );
    expect(logEntry?.request?.model).toEqual(
      "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    );
    expect(logEntry?.request?.temperature).toEqual(0.7);
    expect(logEntry?.request?.maxTokens).toEqual(512);

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
