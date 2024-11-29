import os from "os";
import OpenAI from "openai";
import dotenv from "dotenv";
// import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { flow } from "../src/flow";
import { start } from "repl";

describe("Gemini Flow", () => {
  let genAI: GoogleGenerativeAI;

  beforeAll(() => {
    dotenv.config();
  });

  beforeEach(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  });

  it("should process a simple request", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    const generativeModel = genAI.getGenerativeModel(request);

    let StartTime = new Date().toISOString();
    const result = await generativeModel.generateContent(TestPrompt);
    let EndTime = new Date().toISOString();

    flow.logResponse({
      ...result.response,
      start_time: StartTime,
      end_time: EndTime,
    });

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "models/gemini-1.5-pro",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      functionCalls: undefined,
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      // topK: TestTopK,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "STOP",
      text: expect.any(String),
      tokenCount: expect.any(Number),
      errorReason: "",
      startTime: StartTime,
      endTime: EndTime,
    });

    // Assertions for Function Call
    expect(logEntry?.functionCalls).toEqual([]);

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
      triggerSource: "",
      userId: "",
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      operatingSystem: `${os.platform()}/${os.release()}`,
      shell: os.userInfo().shell || "Unknown",
      memory: 0,
      machineId: expect.any(String),
      env: "test",
    });
  }, 50000);

  it("should process prompt with function call", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    const generativeModel = genAI.getGenerativeModel(request);

    let StartTime = new Date().toISOString();
    const result = await generativeModel.generateContent(TestPrompt);
    let EndTime = new Date().toISOString();

    flow.logResponse({
      ...result.response,
      start_time: StartTime,
      end_time: EndTime,
    });
    const functionCalls = result.response.functionCalls();
    const functionCall = functionCalls?.[0];
    if (functionCall) {
      flow.logFunctionCall(functionCall);
    }
    // console.log("from gemini", result.response);

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "models/gemini-1.5-pro",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      functionCalls: [TEST_WEATHER_FUNC_SCHEMA],
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "STOP",
      text: "",
      tokenCount: expect.any(Number),
      errorReason: "",
      startTime: StartTime,
      endTime: EndTime,
    });

    // Assertions for Function Call
    expect(logEntry?.functionCalls).toEqual([
      {
        name: "TEST_WEATHER_FUNC_IMPL",
        args: expect.any(Object),
        exitCode: undefined,
        startTime: undefined,
        endTime: undefined,
        result: undefined,
        // TODO: Process these fields.
      },
    ]);

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
      triggerSource: "",
      userId: "",
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      operatingSystem: `${os.platform()}/${os.release()}`,
      shell: os.userInfo().shell || "Unknown",
      memory: 0,
      machineId: expect.any(String),
      env: "test",
    });
  }, 20000);

  // it("should process request with failure", async () => {
  //   const TestPrompt = "Deliberate failure test";

  //   flow.logPrompt(TestPrompt, "user-input");

  //   const request = createFailureRequest(TestPrompt, []);
  //   flow.logRequest(request);

  //   try {
  //     await openai.chat.completions.create(request);
  //   } catch (error) {
  //     flow.logError(error);
  //   }

  //   const logEntry = await flow.flushLogs();

  //   // Assertions for Request
  //   expect(logEntry?.request).toEqual({
  //     prompt: TestPrompt,
  //     model: "gpt-4o-mini",
  //     temperature: TestTemperature,
  //     topP: FailureTestTopP,
  //     maxTokens: TestMaxTokens,
  //     errorReason: "",
  //     functionCalls: undefined,
  //     outputMode: undefined,
  //     systemPrompt: undefined,
  //     tokenCount: undefined,
  //     topK: undefined,
  //   });

  //   // Assertions for Meta
  //   expect(logEntry?.meta).toEqual({
  //     totalTokenCount: undefined,
  //     inputTokenCost1k: expect.any(Number),
  //     outputTokenCost1k: expect.any(Number),
  //     triggerSource: "",
  //     userId: "",
  //     locale: Intl.DateTimeFormat().resolvedOptions().locale,
  //     userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  //     operatingSystem: `${os.platform()}/${os.release()}`,
  //     shell: os.userInfo().shell || "Unknown",
  //     memory: 0,
  //     machineId: expect.any(String),
  //     env: "test",
  //   });

  //   // Assertions for Error
  //   expect(logEntry?.error).toEqual({
  //     error: expect.any(String),
  //     stack: expect.any(String),
  //   });
  // });

  it("should process request without a response", async () => {
    const TestPrompt = "Request without a response";

    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    const logEntry = await flow.flushLogs();

    // Assertions for request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      functionCalls: undefined,
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });
  });

  it("should process prompt without a request", async () => {
    const TestPrompt = "Prompt without request";

    flow.logPrompt(TestPrompt, "user-input");

    const logEntry = await flow.flushLogs();

    // Assertions for prompt
    expect(logEntry?.prompt).toEqual("Prompt without request");
  });

  it("should set request and session IDs for a conversation", async () => {});

  it("should process request and response containing func call, even if func call is not executed", async () => {});

  it("should process a response that results in multiple parallel function calls", async () => {});

  it("should process a response that has both text and function call", async () => {});

  it("should return multiple log entries in a multi-turn conversation", async () => {});

  it("should support streaming responses", async () => {});

  it("should support custom logs transport", async () => {});

  it("should work with OpenAI's vision models", async () => {});

  it("should work with OpenAI's embedding models", async () => {});

  it("should work with OpenAI's assistant API", async () => {});

  it("should compute latency between prompt, request and response", async () => {});

  it("should compute additional latency metrics for function calls", async () => {});

  it("should compute additional latency metrics for streaming responses", async () => {});

  it("should compute cost of each request", async () => {});
});

///// Test Helpers /////

const TEST_WEATHER_FUNC_IMPL = (location: string) => {
  const weatherData = {
    location: location,
    temperature: "22°C",
    condition: "Sunny",
  };
  return weatherData;
};

const TEST_WEATHER_FUNC_SCHEMA = {
  name: "TEST_WEATHER_FUNC_IMPL",
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

let TestTemperature = 0.7;
let TestTopP = 0.3;
let TestTopK = 0.3;
let FailureTestTopP = -1;
let TestMaxTokens = 150;
const createRequest = (prompt: string, functions: any[]) => {
  const req = {
    model: "models/gemini-1.5-pro",
    generationConfig: {
      candidateCount: 1,
      stopSequences: ["x"],
      maxOutputTokens: TestMaxTokens,
      temperature: TestTemperature,
      topP: TestTopP,
      // topK: TestTopK,
    },
    ...(functions.length > 0 && {
      tools: [
        {
          functionDeclarations: [TEST_WEATHER_FUNC_SCHEMA],
        },
      ],
    }),
  };

  return req;
};

const createFailureRequest = (prompt: string, functions: any[]) => {
  return {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: FailureTestTopP,
    ...(functions.length > 0 && { functions: functions }),
  };
};

const NO_OP_TRANSPORT = () => {};
