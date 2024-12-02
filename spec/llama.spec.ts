import os from "os";
import OpenAI from "openai";
import dotenv from "dotenv";
import {
  CompletionCreateParamsNonStreaming,
  CompletionCreateParamsStreaming,
} from "together-ai/resources/chat/completions";
import { flow } from "../src/flow";
import Together from "together-ai";

describe("Llama Flow", () => {
  // let openai: OpenAI;
  let together: Together;
  let resolvedOptionsMock: jest.SpyInstance;
  let platformSpy: jest.SpyInstance;
  let releaseSpy: jest.SpyInstance;
  let userInfoSpy: jest.SpyInstance;

  beforeAll(() => {
    dotenv.config();
  });

  beforeEach(() => {
    together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

    resolvedOptionsMock = jest.spyOn(
      Intl.DateTimeFormat.prototype,
      "resolvedOptions",
    );
    resolvedOptionsMock.mockReturnValue({
      locale: "en-TEST",
      timeZone: "MockTimeZone",
      calendar: "gregory",
      numberingSystem: "latn",
      timeZoneName: undefined,
      hourCycle: undefined,
    } as Intl.ResolvedDateTimeFormatOptions);

    platformSpy = jest.spyOn(os, "platform").mockReturnValue("darwin");
    releaseSpy = jest.spyOn(os, "release").mockReturnValue("MockedRelease");
    userInfoSpy = jest.spyOn(os, "userInfo").mockReturnValue({
      username: "mockUser",
      uid: 1000,
      gid: 1000,
      shell: "/bin/fakeshell",
      homedir: "/home/mockUser",
    });
  });

  afterEach(() => {
    // Restore original methods after test
    resolvedOptionsMock.mockRestore();
    platformSpy.mockRestore();
    releaseSpy.mockRestore();
    userInfoSpy.mockRestore();
  });

  it("should process a simple request", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    const response = await together.chat.completions.create(request);

    flow.logResponse(response);

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: undefined,
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "eos",
      text: expect.stringContaining("Africa"),
      tokenCount: expect.any(Number),
      errorReason: "",
      toolUse: expect.any(Array),
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: undefined,
      args: undefined,
      result: undefined,
      exitCode: 0,
    });

    // Assertion for Meta with mocked values
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: undefined,
      outputTokenCost1k: undefined,
      triggerSource: "",
      userId: "",
      locale: "en-TEST",
      userTimeZone: "MockTimeZone",
      operatingSystem: "darwin/MockedRelease",
      shell: "/bin/fakeshell",
      memory: 0,
      machineId: expect.any(String),
      env: "test",
    });
  }, 20000);

  it("should process prompt with function call", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    const response = await together.chat.completions.create(request);

    flow.logResponse(response);

    const functionCall =
      response?.choices?.[0]?.message?.tool_calls?.[0]?.function ?? null;

    if (response.choices[0]?.message?.tool_calls) {
      const args = JSON.parse(functionCall?.arguments ?? "");
      const weatherData = TEST_WEATHER_FUNC_IMPL(args.location);
      flow.logFunctionCall({
        name: functionCall?.name,
        args: functionCall?.arguments,
        result: weatherData,
      });
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: [TEST_WEATHER_FUNC_SCHEMA],
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "tool_calls",
      text: null,
      tokenCount: expect.any(Number),
      errorReason: "",
      toolUse: expect.any(Array),
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: functionCall?.name,
      args: functionCall?.arguments,
      result: expect.anything(),
      exitCode: 0,
    });

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: undefined,
      outputTokenCost1k: undefined,
      triggerSource: "",
      userId: "",
      locale: "en-TEST",
      userTimeZone: "MockTimeZone",
      operatingSystem: "darwin/MockedRelease",
      shell: "/bin/fakeshell",
      memory: 0,
      machineId: expect.any(String),
      env: "test",
    });
  }, 20000);

  it("should process request with failure", async () => {
    const TestPrompt = "Deliberate failure test";

    flow.logPrompt(TestPrompt, "user-input");

    const request = createFailureRequest(TestPrompt, []);
    flow.logRequest(request);

    try {
      await together.chat.completions.create(request);
    } catch (error: any) {
      flow.logError(error);
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      temperature: TestTemperature,
      topP: FailureTestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: undefined,
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: undefined,
      text: undefined,
      tokenCount: undefined,
      errorReason: "",
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: undefined,
      args: undefined,
      result: undefined,
      exitCode: 0,
    });

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: undefined,
      inputTokenCost1k: undefined,
      outputTokenCost1k: undefined,
      triggerSource: "",
      userId: "",
      locale: "en-TEST",
      userTimeZone: "MockTimeZone",
      operatingSystem: "darwin/MockedRelease",
      shell: "/bin/fakeshell",
      memory: 0,
      machineId: expect.any(String),
      env: "test",
    });

    // Assertions for Error
    expect(logEntry?.error).toEqual({
      error_message: "-1 is less than the minimum of 0 - 'top_p'",
    });
  }, 20000);

  it("should process request without a response", async () => {
    const TestPrompt = "Request without a response";

    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    const logEntry = await flow.flushLogs();

    // Assertions for request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: undefined,
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
    expect(logEntry?.request.prompt).toEqual("Prompt without request");
  });

  it("should set request and session IDs for a conversation", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    const logEntry = await flow.flushLogs();

    expect(logEntry?.requestId).toBeDefined();
    expect(typeof logEntry?.requestId).toBe("string");
    expect(logEntry?.requestId.length).toBeGreaterThanOrEqual(5);

    expect(logEntry?.sessionId).toBeDefined();
    expect(typeof logEntry?.sessionId).toBe("string");
    expect(logEntry?.sessionId.length).toBeGreaterThanOrEqual(5);
  });

  it("should process request and response containing func call, even if func call is not executed", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    const response = await together.chat.completions.create(request);

    flow.logResponse(response);

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: [TEST_WEATHER_FUNC_SCHEMA],
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "tool_calls",
      text: null,
      tokenCount: expect.any(Number),
      errorReason: "",
      toolUse: expect.any(Array),
    });

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: undefined,
      outputTokenCost1k: undefined,
      triggerSource: "",
      userId: "",
      locale: "en-TEST",
      userTimeZone: "MockTimeZone",
      operatingSystem: "darwin/MockedRelease",
      shell: "/bin/fakeshell",
      memory: 0,
      machineId: expect.any(String),
      env: "test",
    });
  }, 20000);

  it("should process a response that results in multiple parallel function calls", async () => {}, 20000);

  it("should process a response that has both text and function call", async () => {});

  it("should return multiple log entries in a multi-turn conversation", async () => {});

  it("should support streaming responses", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequestWithStreamTrue(TestPrompt, []);
    flow.logRequest(request);

    // Initialize an object to aggregate the full response
    let aggregatedResponse = {
      id: "",
      object: "",
      created: 0,
      model: "",
      system_fingerprint: "",
      choices: [] as Array<{
        index: number;
        delta: { content?: string };
        logprobs: any;
        finish_reason: string | null;
      }>,
    };

    const response = await together.chat.completions.create(request);

    for await (const chunk of response) {
      if (!aggregatedResponse.id) {
        aggregatedResponse.id = chunk.id;
        aggregatedResponse.object = chunk.object;
        aggregatedResponse.created = chunk.created;
        aggregatedResponse.model = chunk.model;
        aggregatedResponse.system_fingerprint = chunk.system_fingerprint ?? "";
      }

      chunk.choices.forEach((choice, index) => {
        if (!aggregatedResponse.choices[index]) {
          aggregatedResponse.choices[index] = {
            index: choice.index,
            delta: { content: "" },
            logprobs: choice.logprobs ?? null,
            finish_reason: null,
          };
        }

        if (choice.delta?.content) {
          aggregatedResponse.choices[index].delta.content +=
            choice.delta.content;
        }

        if (choice.finish_reason) {
          aggregatedResponse.choices[index].finish_reason =
            choice.finish_reason;
        }
      });
    }

    flow.logResponse({
      ...aggregatedResponse,
    });

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      toolUse: undefined,
      outputMode: undefined,
      systemPrompt: undefined,
      tokenCount: undefined,
      topK: undefined,
    });

    // Assertions for Streaming Response
    expect(logEntry?.response).toEqual({
      status: 200,
      finishReason: "eos",
      text: expect.stringContaining("Africa"),
      tokenCount: expect.any(Number),
      errorReason: "",
      toolUse: undefined,
    });
  }, 20000);

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
const TEST_HIKING_TIME_FUNC_IMPL = (
  departureTime: string,
  daylightDuration: number,
) => {
  const startHour = parseInt(departureTime.split(":")[0]);
  const hikingHours = daylightDuration - startHour;
  return {
    departureTime,
    daylightDuration,
    hikingHours: hikingHours > 0 ? hikingHours : 0,
  };
};

const TEST_WEATHER_FUNC_SCHEMA = {
  type: "function",
  function: {
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
  },
};

const TEST_HIKING_TIME_FUNC_SCHEMA = {
  type: "function",
  function: {
    name: "TEST_HIKING_TIME_FUNC_IMPL",
    description:
      "Calculates available hiking hours based on departure time and daylight duration",
    parameters: {
      type: "object",
      properties: {
        departureTime: {
          type: "string",
          description:
            "Time in HH:MM format when the user plans to start hiking",
        },
        daylightDuration: {
          type: "number",
          description: "Total daylight hours available for hiking",
        },
      },
      required: ["departureTime", "daylightDuration"],
    },
  },
};

let TestTemperature = 0.7;
let TestTopP = 0.3;
let FailureTestTopP = -1;
let TestMaxTokens = 150;

const createRequest = (prompt: string, functions: any[]) => {
  return {
    model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: TestTopP,

    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as CompletionCreateParamsNonStreaming;
};

const createRequestWithStreamTrue = (prompt: string, functions: any[]) => {
  return {
    model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: TestTopP,
    stream: true,

    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as CompletionCreateParamsStreaming;
};

const createFailureRequest = (prompt: string, functions: any[]) => {
  return {
    model: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: FailureTestTopP,
    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as CompletionCreateParamsNonStreaming;
};

const NO_OP_TRANSPORT = () => {};
