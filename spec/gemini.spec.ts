import dotenv from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

import os from "os";

import { flow } from "../src/flow";

describe("Gemini Flow", () => {
  let genAI: GoogleGenerativeAI;
  let resolvedOptionsMock: jest.SpyInstance;
  let platformSpy: jest.SpyInstance;
  let releaseSpy: jest.SpyInstance;
  let userInfoSpy: jest.SpyInstance;

  beforeAll(() => {
    dotenv.config();
  });

  beforeEach(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);

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

    const generativeModel = genAI.getGenerativeModel(request);

    const result = await generativeModel.generateContent(TestPrompt);
    let EndTime = new Date().toISOString();

    flow.logResponse({
      ...result.response,
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
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
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
  }, 50000);

  it("should process prompt with function call", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    const generativeModel = genAI.getGenerativeModel(request);

    const result = await generativeModel.generateContent(TestPrompt);
    let EndTime = new Date().toISOString();

    flow.logResponse({
      ...result.response,
    });

    const functionCalls = result.response.functionCalls();
    const functionCall = functionCalls?.[0];
    if (functionCall) {
      const args = functionCall.args as { location: string };
      const result = TEST_WEATHER_FUNC_IMPL(args.location);
      flow.logFunctionCallResult({
        name: functionCall.name,
        args: args,
        result: result,
        exitCode: 0,
      });
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "models/gemini-1.5-pro",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: [
        {
          functionDeclarations: [TEST_WEATHER_FUNC_SCHEMA],
        },
      ],
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
      toolUse: expect.any(Array),
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: expect.any(String),
      args: expect.any(Object),
      result: expect.any(Object),
      exitCode: 0,
    });

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
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
      const generativeModel = genAI.getGenerativeModel(request);
      const result = await generativeModel.generateContent(TestPrompt);
      console.log("Result: ", result);
    } catch (error: any) {
      flow.logError(error);
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "models/gemini-1.5-pro",
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

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: undefined,
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
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
      error_message: expect.stringContaining(
        "top_p must be in the range [0.0, 1.0]",
      ),
    });
  });

  it("should process request without a response", async () => {
    const TestPrompt = "Request without a response";

    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

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

    const generativeModel = genAI.getGenerativeModel(request);

    const result = await generativeModel.generateContent(TestPrompt);

    flow.logResponse({
      ...result.response,
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
      tools: [
        {
          functionDeclarations: [TEST_WEATHER_FUNC_SCHEMA],
        },
      ],
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
      toolUse: expect.any(Array),
    });

    // Assertions for Meta
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
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
  });

  it("should process a response that results in multiple parallel function calls", async () => {
    const TestPrompt = `
    I'm planning a hike tomorrow. Can you:
    1. Get the weather forecast for Yosemite National Park?
    2. Tell me how many hours I'd have for the hike if I leave at 7:00 AM?
  `;

    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [
      TEST_WEATHER_FUNC_SCHEMA,
      TEST_HIKING_TIME_FUNC_SCHEMA,
    ]);
    flow.logRequest(request);

    const generativeModel = genAI.getGenerativeModel(request);

    const result = await generativeModel.generateContent(TestPrompt);

    flow.logResponse({
      ...result.response,
    });

    const function_calls = result.response.functionCalls();

    let firstFunctionCallResult, secondFunctionCallResult;

    // Handle function calls

    function_calls?.forEach((function_call) => {
      if (function_call.name === "TEST_WEATHER_FUNC_IMPL") {
        const args = function_call.args as { location: string };
        firstFunctionCallResult = TEST_WEATHER_FUNC_IMPL(args.location);
        // Log the first function call results
        flow.logFunctionCallResult({
          name: function_call.name,
          args: args,
          result: firstFunctionCallResult,
        });
      }

      if (function_call.name === "TEST_HIKING_TIME_FUNC_IMPL") {
        const args = function_call.args as {
          daylightDuration: number;
          departureTime: string;
        };
        secondFunctionCallResult = TEST_HIKING_TIME_FUNC_IMPL(
          args.departureTime,
          args.daylightDuration,
        );
        // Log second function call results
        flow.logFunctionCallResult({
          name: function_call.name,
          args: args,
          result: [secondFunctionCallResult],
        });
      }
    });

    // Flush all logs
    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "models/gemini-1.5-pro",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: [
        {
          functionDeclarations: [
            TEST_WEATHER_FUNC_SCHEMA,
            TEST_HIKING_TIME_FUNC_SCHEMA,
          ],
        },
      ],
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
      toolUse: expect.any(Array),
    });

    // Assertions for  First Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: expect.any(String),
      args: expect.any(Object),
      result: expect.any(Object),
      exitCode: 0,
    });

    // Assertions for Meta Information
    expect(logEntry?.meta).toEqual({
      totalTokenCount: expect.any(Number),
      inputTokenCost1k: expect.any(Number),
      outputTokenCost1k: expect.any(Number),
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
  });

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

const TEST_HIKING_TIME_FUNC_SCHEMA = {
  name: "TEST_HIKING_TIME_FUNC_IMPL",
  parameters: {
    type: SchemaType.OBJECT,
    description:
      "Calculates available hiking hours based on departure time and daylight duration",
    properties: {
      departureTime: {
        type: SchemaType.STRING,
        description: "Time in HH:MM format when the user plans to start hiking",
      },
      daylightDuration: {
        type: SchemaType.NUMBER,
        description: "Total daylight hours available for hiking",
      },
    },
    required: ["departureTime", "daylightDuration"],
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
          functionDeclarations: functions,
        },
      ],
    }),
  };

  return req;
};

const createRequestWithStreamTrue = (prompt: string, functions: any[]) => {
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
          functionDeclarations: functions,
        },
      ],
    }),
  };

  return req;
};

const createFailureRequest = (prompt: string, functions: any[]) => {
  const req = {
    model: "models/gemini-1.5-pro",
    generationConfig: {
      candidateCount: 1,
      stopSequences: ["x"],
      maxOutputTokens: TestMaxTokens,
      temperature: TestTemperature,
      topP: FailureTestTopP,
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

const NO_OP_TRANSPORT = () => {};
