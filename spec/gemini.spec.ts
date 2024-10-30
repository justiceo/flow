import { flow } from "../src/flow";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";
import { start } from "repl";
import { text } from "stream/consumers";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

// This is a demo function i created to simulate a weather API call
async function getWeather(location: string) {
  const weatherData = {
    location: location,
    temperature: "22°C",
    condition: "Sunny",
  };
  return weatherData;
}

// Weather Function call Declaration
const getWeatherFunctionDeclaration = {
  name: "getWeather",
  parameters: {
    type: SchemaType.OBJECT,
    description: "Gets the weather information for a location",
    properties: {
      location: {
        type: SchemaType.STRING,
        description: "The name of the city to get the weather for",
      },
    },
    required: ["location"],
  },
};

export async function useGeminiApi(prompt: string) {
  flow.logPrompt(prompt, "user-input");

  const requestData = {
    model: "gemini-1.5-flash",

    generationConfig: {
      candidateCount: 1,
      stopSequences: ["x"],
      maxOutputTokens: 200,
      temperature: 1.0,
    },

    tools: [
      {
        functionDeclarations: [getWeatherFunctionDeclaration],
      },
    ],
  };

  flow.logRequest(requestData);
  const generativeModel = genAI.getGenerativeModel(requestData);

  try {
    const result = await generativeModel.generateContent(prompt);

    flow.logResponse({ ...result.response, status: 200 });

    const functionCalls = result.response.functionCalls();
    const functionCall = functionCalls?.[0];

    if (functionCall && functionCall.name === "getWeather") {
      try {
        const args = functionCall.args as { location: string };
        const weatherData = await getWeather(args.location);
        flow.logFunctionCall({ ...functionCall, result: weatherData });
        // console.log(`Weather Data for ${args.location}:`, weatherData);
      } catch (parseError) {
        console.error("Error parsing function call arguments:", parseError);
      }
    }

    const logEntry = await flow.flushLogs();

    return logEntry;
  } catch (error) {
    console.error("Error generating content:", error);
  }
}

describe("Gemini Flow", () => {
  it("should log prompts, requests, responses, function calls using live api", async () => {
    const logEntry = await useGeminiApi(
      "What's the weather in Ikorodu, Lagos?"
    );

    // Assertions for Request
    expect(logEntry?.request?.prompt).toEqual(
      "What's the weather in Ikorodu, Lagos?"
    );
    expect(logEntry?.request?.model).toEqual("gemini-1.5-flash");
    expect(logEntry?.request?.temperature).toEqual(1.0);
    expect(logEntry?.request?.maxOutputTokens).toEqual(200);

    // Assertions for Response
    expect(logEntry?.response?.status).toEqual(200);

    // Assertions for Function Call
    expect(logEntry?.functionCalls?.[0]?.name).toEqual("getWeather");
  }, 20000);

  it("should log prompts, requests, responses, function calls, and custom metadata with mock data", async () => {
    // Log Prompt
    flow.logPrompt("Hello, World!", "user-input");

    // Log Request
    flow.logRequest({
      model: "gemini-1.5-mini",
      tools: [
        {
          functionDeclarations: [
            {
              name: "getWeather",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  location: {
                    type: SchemaType.STRING,
                    description: "The city to get weather info for",
                  },
                },
                required: ["location"],
              },
            },
          ],
        },
      ],
      generationConfig: {
        candidateCount: 1,
        stopSequences: ["x"],
        maxOutputTokens: 150,
        temperature: 0.7,
      },
      prompt: "Hello, World!",
    });

    // Log Response
    flow.logResponse({
      status: 200,
      timestamp: new Date().toISOString(),
      usageMetadata: {
        totalTokenCount: 120,
      },
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      candidates: [
        {
          finishReason: "stop",
        },
      ],
      text: () => "It's sunny in Lagos!",
    });

    // Log Function Call
    flow.logFunctionCall({
      name: "getWeather",
      args: JSON.stringify({ location: "Lagos" }),
      result: "Sunny, 22°C",
      exitCode: 0,
    });

    // Log Custom Meta Data
    flow.log("meta", {
      totalTokenCount: 120,
      inputTokenCost1k: 0.6,
      outputTokenCost1k: 0.8,
      triggerSource: "API",
      outputMode: "streaming",
      userId: "hashed_user_id",
      country: "Nigeria",
      operatingSystem: "mac os",
      shell: "/bin/bash",
      userTimeZone: "WAT",
      machineId: "machine_id",
      memory: 16,
      env: "production",
    });

    // Flush logs
    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request?.prompt).toEqual("Hello, World!");
    expect(logEntry?.request?.model).toEqual("gemini-1.5-mini");
    expect(logEntry?.request?.temperature).toEqual(0.7);
    expect(logEntry?.request?.maxOutputTokens).toEqual(150);

    // Assertions for Response
    expect(logEntry?.response?.text).toEqual("It's sunny in Lagos!");
    expect(logEntry?.response?.status).toEqual(200);

    // Assertions for Function Call
    expect(logEntry?.functionCalls?.[0]?.name).toEqual("getWeather");
    expect(logEntry?.functionCalls?.[0]?.args).toEqual(
      JSON.stringify({ location: "Lagos" })
    );
    expect(logEntry?.functionCalls?.[0]?.result).toEqual("Sunny, 22°C");

    // Assertions for Meta Data
    expect(logEntry?.meta?.totalTokenCount).toEqual(120);
    expect(logEntry?.meta?.inputTokenCost1k).toEqual(0.6);
    expect(logEntry?.meta?.outputTokenCost1k).toEqual(0.8);
    expect(logEntry?.meta?.triggerSource).toEqual("API");
    expect(logEntry?.meta?.userId).toEqual("hashed_user_id");
    expect(logEntry?.meta?.country).toEqual("Nigeria");
    expect(logEntry?.meta?.operatingSystem).toEqual("mac os");
    expect(logEntry?.meta?.userTimeZone).toEqual("WAT");
    expect(logEntry?.meta?.machineId).toEqual("machine_id");
    expect(logEntry?.meta?.memory).toEqual(16);
    expect(logEntry?.meta?.env).toEqual("production");
  });
});
