import os from "os";
import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { flow } from "../src/flow";

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
    model: "models/gemini-1.5-pro",

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
    // console.log(result)

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

describe.skip("Gemini Flow", () => {
  it("should log prompts, requests, responses, function calls using live api", async () => {
    const logEntry = await useGeminiApi(
      "What's the weather in Ikorodu, Lagos?",
    );

    // Assertions for Request
    expect(logEntry?.request?.prompt).toEqual(
      "What's the weather in Ikorodu, Lagos?",
    );
    expect(logEntry?.request?.model).toEqual("models/gemini-1.5-pro");
    expect(logEntry?.request?.temperature).toEqual(1.0);
    expect(logEntry?.request?.maxOutputTokens).toEqual(200);

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
