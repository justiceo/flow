import os from "os";
import OpenAI from "openai";
import dotenv from "dotenv";
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { flow } from "../src/flow";
import { JsonArrayTransport } from "../src/transports/json";

describe("ChatGPT Flow", () => {
  let openai: OpenAI;
  let resolvedOptionsMock: jest.SpyInstance;
  let platformSpy: jest.SpyInstance;
  let releaseSpy: jest.SpyInstance;
  let userInfoSpy: jest.SpyInstance;

  beforeAll(() => {
    dotenv.config();
  });

  beforeEach(() => {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string,
    });

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

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
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
      finishReason: "stop",
      text: expect.stringContaining("Africa"),
      tokenCount: expect.any(Number),
      errorReason: "",
      startTime: StartTime,
      endTime: EndTime,
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: undefined,
      args: undefined,
      startTime: undefined,
      endTime: undefined,
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
      latency_req_res: expect.any(Number),
      latency_propmt_req: expect.any(Number),
      latency_function_calls: expect.any(Number),
      requestCost: expect.any(Number),
    });
  }, 20000);

  it("should process prompt with function call", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    let functionCallStartTime;
    let functionCallEndTime;

    const functionCall =
      response?.choices?.[0]?.message?.tool_calls?.[0]?.function ?? null;

    if (response.choices[0]?.message?.tool_calls) {
      const args = JSON.parse(functionCall?.arguments ?? "");
      functionCallStartTime = new Date().toISOString();
      const weatherData = TEST_WEATHER_FUNC_IMPL(args.location);
      functionCallEndTime = new Date().toISOString();
      flow.logFunctionCall({
        name: functionCall?.name,
        args: functionCall?.arguments,
        start_time: functionCallStartTime,
        end_time: functionCallEndTime,
        result: weatherData,
      });
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
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
      startTime: StartTime,
      endTime: EndTime,
      toolUse: expect.arrayContaining([
        expect.objectContaining({
          function: expect.objectContaining({
            name: "TEST_WEATHER_FUNC_IMPL",
          }),
        }),
      ]),
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: functionCall?.name,
      args: functionCall?.arguments,
      startTime: functionCallStartTime,
      endTime: functionCallEndTime,
      result: expect.anything(),
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
      latency_req_res: expect.any(Number),
      latency_propmt_req: expect.any(Number),
      latency_function_calls: expect.any(Number),
      requestCost: expect.any(Number),
    });
  }, 20000);

  it("should process request with failure", async () => {
    const TestPrompt = "Deliberate failure test";

    flow.logPrompt(TestPrompt, "user-input");

    const request = createFailureRequest(TestPrompt, []);
    flow.logRequest(request);

    try {
      await openai.chat.completions.create(request);
    } catch (error: any) {
      flow.logError(error);
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
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
      startTime: undefined,
      endTime: undefined,
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: undefined,
      args: undefined,
      startTime: undefined,
      endTime: undefined,
      result: undefined,
      exitCode: 0,
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
      latency_req_res: expect.any(Number),
      latency_propmt_req: expect.any(Number),
      latency_function_calls: expect.any(Number),
      requestCost: expect.any(Number),
    });

    // Assertions for Error
    expect(logEntry?.error).toEqual({
      error_message:
        "400 Invalid 'top_p': decimal below minimum value. Expected a value >= 0, but got -1 instead.",
    });
  });

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

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
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
      startTime: StartTime,
      endTime: EndTime,
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
      latency_req_res: expect.any(Number),
      latency_propmt_req: expect.any(Number),
      latency_function_calls: expect.any(Number),
      requestCost: expect.any(Number),
    });
  }, 20000);

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

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    // Capture the end time of the response
    let EndTime = new Date().toISOString();

    // Log the response
    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    const tool_calls = response.choices[0]?.message.tool_calls;

    let firstFunctionCall = { name: "", arguments: "" };
    let secondFunctionCall = { name: "", arguments: "" };
    let firstFunctionCallStartTime, firstFunctionCallEndTime;
    let secondFunctionCallStartTime, secondFunctionCallEndTime;
    let firstFunctionCallResult, secondFunctionCallResult;

    // Handle function calls

    tool_calls?.forEach((tool_call) => {
      if (
        tool_call.type === "function" &&
        tool_call.function.name === "TEST_WEATHER_FUNC_IMPL"
      ) {
        firstFunctionCall = tool_call.function;
        const args = JSON.parse(firstFunctionCall.arguments);
        firstFunctionCallStartTime = new Date().toISOString();
        firstFunctionCallResult = TEST_WEATHER_FUNC_IMPL(args.location);
        firstFunctionCallEndTime = new Date().toISOString();
        // Log the first function call results
        flow.logFunctionCall({
          name: firstFunctionCall.name,
          args: firstFunctionCall.arguments,
          start_time: firstFunctionCallStartTime,
          end_time: firstFunctionCallEndTime,
          result: [firstFunctionCallResult],
        });
      }

      if (
        tool_call.type === "function" &&
        tool_call.function.name === "TEST_HIKING_TIME_FUNC_IMPL"
      ) {
        secondFunctionCall = tool_call.function;
        const args = JSON.parse(secondFunctionCall.arguments);
        secondFunctionCallStartTime = new Date().toISOString();
        secondFunctionCallResult = TEST_HIKING_TIME_FUNC_IMPL(
          args.departureTime,
          args.daylightDuration,
        );
        secondFunctionCallEndTime = new Date().toISOString();
        // Log second function call results
        flow.logFunctionCall({
          name: secondFunctionCall.name,
          args: secondFunctionCall.arguments,
          start_time: secondFunctionCallStartTime,
          end_time: secondFunctionCallEndTime,
          result: [secondFunctionCallResult],
        });
      }
    });

    // Flush all logs
    const logEntry = await flow.flushLogs();

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
      temperature: TestTemperature,
      topP: TestTopP,
      maxTokens: TestMaxTokens,
      errorReason: "",
      tools: [TEST_WEATHER_FUNC_SCHEMA, TEST_HIKING_TIME_FUNC_SCHEMA],
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
      startTime: StartTime,
      endTime: EndTime,
      toolUse: expect.arrayContaining([
        expect.objectContaining({
          function: expect.objectContaining({
            name: "TEST_WEATHER_FUNC_IMPL",
          }),
        }),
        expect.objectContaining({
          function: expect.objectContaining({
            name: "TEST_HIKING_TIME_FUNC_IMPL",
          }),
        }),
      ]),
    });

    // Assertions for  First Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: firstFunctionCall?.name,
      args: firstFunctionCall?.arguments,
      startTime: expect.any(String),
      endTime: expect.any(String),
      result: [
        {
          location: JSON.parse(firstFunctionCall.arguments).location,
          temperature: "22°C",
          condition: "Sunny",
        },
      ],
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
      latency_req_res: expect.any(Number),
      latency_propmt_req: expect.any(Number),
      latency_function_calls: expect.any(Number),
      requestCost: expect.any(Number),
    });
  }, 20000);

  it("should process a response that has both text and function call", async () => {});

  it("should return multiple log entries in a multi-turn conversation", async () => {});

  it("should support streaming responses", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequestWithStreamTrue(TestPrompt, []);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

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

    const response = await openai.chat.completions.create(request);

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

    let EndTime = new Date().toISOString();

    flow.logResponse({
      ...aggregatedResponse,
      start_time: StartTime,
      end_time: EndTime,
    });

    const logEntry = await flow.flushLogs();

    // // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
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
      finishReason: "stop",
      text: expect.stringContaining("Africa"),
      tokenCount: expect.any(Number),
      errorReason: "",
      startTime: StartTime,
      endTime: EndTime,
    });
  });

  it("should support custom logs transport", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    const jsonArrayTransport = new JsonArrayTransport();

    const logEntry = await flow.flushLogs(jsonArrayTransport); // Using custom transport here

    // Assertions for Request
    expect(logEntry?.request).toEqual({
      prompt: TestPrompt,
      model: "gpt-4o-mini",
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
      finishReason: "stop",
      text: expect.stringContaining("Africa"),
      tokenCount: expect.any(Number),
      errorReason: "",
      startTime: StartTime,
      endTime: EndTime,
    });

    // Assertions for Function Call Result
    expect(logEntry?.functionCallResult).toEqual({
      name: undefined,
      args: undefined,
      startTime: undefined,
      endTime: undefined,
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
      latency_req_res: expect.any(Number),
      latency_propmt_req: expect.any(Number),
      latency_function_calls: expect.any(Number),
      requestCost: expect.any(Number),
    });
  });

  it.only("should work with OpenAI's vision models", async () => {
    // Work in progress
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "a white siamese cat",
      n: 1,
      size: "1024x1024",
    });
    const image_url = response.data[0].url;
    console.log("image_url", image_url);
  }, 20000);

  it.skip("should work with OpenAI's embedding models", async () => {
    // Work in progress
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "Your text string goes here",
      encoding_format: "float",
    });

    console.log(embedding);
  });

  it("should work with OpenAI's assistant API", async () => {});

  it("should compute latency between prompt, request and response", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    const logEntry = await flow.flushLogs();

    // Assertion for latency between request and response
    expect(logEntry?.meta.latency_req_res).toBeGreaterThan(0);

    // Assertion for latency between prompt and request
    expect(logEntry?.meta.latency_propmt_req).toBeGreaterThan(0);
  });

  it("should compute additional latency metrics for function calls", async () => {
    const TestPrompt = "What's the weather in Ikorodu, Lagos?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, [TEST_WEATHER_FUNC_SCHEMA]);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    let functionCallStartTime;
    let functionCallEndTime;

    const functionCall =
      response?.choices?.[0]?.message?.tool_calls?.[0]?.function ?? null;

    if (response.choices[0]?.message?.tool_calls) {
      const args = JSON.parse(functionCall?.arguments ?? "");
      functionCallStartTime = new Date().toISOString();
      const weatherData = TEST_WEATHER_FUNC_IMPL(args.location);
      functionCallEndTime = new Date().toISOString();
      flow.logFunctionCall({
        name: functionCall?.name,
        args: functionCall?.arguments,
        start_time: functionCallStartTime,
        end_time: functionCallEndTime,
        result: weatherData,
      });
    }

    const logEntry = await flow.flushLogs();

    // Assertions for Function Call latency
    expect(logEntry?.meta.latency_function_calls).toBeGreaterThan(0);
  }, 20000);

  it("should compute additional latency metrics for streaming responses", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequestWithStreamTrue(TestPrompt, []);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

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

    const response = await openai.chat.completions.create(request);

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

    let EndTime = new Date().toISOString();

    flow.logResponse({
      ...aggregatedResponse,
      start_time: StartTime,
      end_time: EndTime,
    });

    const logEntry = await flow.flushLogs();

    // Assertion for latency between request and response - streaming responses
    expect(logEntry?.meta.latency_req_res).toBeGreaterThan(0);
  });

  it("should compute cost of each request", async () => {
    const TestPrompt = "In which continent is Nigeria?";
    flow.logPrompt(TestPrompt, "user-input");

    const request = createRequest(TestPrompt, []);
    flow.logRequest(request);

    let StartTime = new Date().toISOString();

    const response = await openai.chat.completions.create(request);

    let EndTime = new Date().toISOString();

    flow.logResponse({ ...response, start_time: StartTime, end_time: EndTime });

    const logEntry = await flow.flushLogs();

    // Assertion for cost of request
    expect(typeof logEntry?.meta.requestCost).toBe("number");
  });
});

///// Test Helpers /////

const TEST_WEATHER_FUNC_IMPL = (location: string) => {
  const delay = (milliseconds: number) => {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
      // Busy-wait loop to mimic latency
    }
  };

  delay(1000);

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
  const delay = (milliseconds: number) => {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
      // Busy-wait loop to mimick latency
    }
  };

  delay(1000);

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

const createRequestWithStreamTrue = (prompt: string, functions: any[]) => {
  return {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: TestTopP,
    stream: true,

    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as ChatCompletionCreateParamsStreaming;
};

const createRequest = (prompt: string, functions: any[]) => {
  const delay = (milliseconds: number) => {
    const start = Date.now();
    while (Date.now() - start < milliseconds) {
      // Busy-wait loop to mimic latency
    }
  };

  delay(500);

  return {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: TestTopP,

    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as ChatCompletionCreateParamsNonStreaming;
};

const createVisionRequest = (prompt: any[], functions: any[]) => {
  return {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 300,
    temperature: TestTemperature,
    top_p: TestTopP,

    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as ChatCompletionCreateParamsNonStreaming;
};

const createFailureRequest = (prompt: string, functions: any[]) => {
  return {
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: TestMaxTokens,
    temperature: TestTemperature,
    top_p: FailureTestTopP,
    ...(functions.length > 0 && {
      tools: functions,
    }),
  } as ChatCompletionCreateParamsNonStreaming;
};

const NO_OP_TRANSPORT = () => {};
