import os from "os";
import OpenAI from "openai";
import dotenv from "dotenv";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { flow } from "../src/flow";

describe.skip("Grok Flow", () => {
  let openai: OpenAI;

  beforeAll(() => {
    dotenv.config();
  });

  beforeEach(() => {
    openai = new OpenAI({
      apiKey: process.env.GROK_API_KEY as string,
      baseURL: "https://api.x.ai/v1",
    });
  });

  it("should process a simple request", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    const response = await openai.chat.completions.create(request);
    flow.logResponse(response);

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "grok-beta",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      functionCalls: [],
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "stop",
      text: expect.stringContaining("Africa"),
      tokenCount: expect.any(Number),
      errorReason: "",
      // TODO: Add startTime and endTime.
    });

    // Assertions for Function Call
    expect(logEntry?.functionCalls).toEqual([]);

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: undefined,
      outputTokenCost1k: undefined,
      triggerSource: "",
      userId: "",
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      operatingSystem: `${os.platform()}/${os.release()}`,
      shell: os.userInfo().shell || "Unknown",
      memory: 0,
      // machineId: expect.any(String), // Uncomment if machineId is re-enabled
      env: "test", // Assuming test environment
    });
  }, 20000);

  it("should process prompt with function call", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    const response = await openai.chat.completions.create(request);
    flow.logResponse(response);

    if (response.choices[0]?.message?.tool_calls) {
      flow.logFunctionCall(
        response.choices[0]?.message?.tool_calls[0].function,
      );
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "grok-beta",
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
      finishReason: "tool_calls",
      text: expect.any(String),
      tokenCount: expect.any(Number),
      errorReason: "",
      startTime: undefined,
      endTime: undefined,
      // TODO: Add startTime and endTime.
    });

    // Assertions for Function Call
    expect(logEntry?.functionCalls).toEqual([
      {
        name: "TEST_WEATHER_FUNC_IMPL",
        args: expect.any(String),
        exitCode: undefined,
        startTime: undefined,
        endTime: undefined,
        result: undefined,
        // TODO: Process these fields.
      },
    ]);

    // Assertions for Meta
    expect(logEntry?.meta).toMatchObject({
      env: "test",
      shell: "/bin/zsh",
      operatingSystem: `${os.platform()}/${os.release()}`,
      // TODO: Add more fields and switch toMatchObject to toEqual.
    });
  }, 20000);

  it("should process request with failure", async () => {
    // E.g. by setting TestTopP to value > 1.
  });

  it("should process request without a response", async () => {
    // Simply flush logs without calling OpenAI API.
  });

  it("should process prompt without a request", async () => {
    // By flushing after only logging a prompt.
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
};

let TestTemperature = 0.7;
let TestTopP = 0.3;
let TestMaxTokens = 150;
const createRequest = (prompt: string, functions: any[]) => {
  return {
    model: "grok-beta",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: TestTopP,

    ...(functions.length > 0 && {
      tools: functions.map((fn) => ({
        type: "function",
        function: fn, // Map each function schema into the required format
      })),
    }),
  } as ChatCompletionCreateParamsNonStreaming;
};

const NO_OP_TRANSPORT = () => {};
