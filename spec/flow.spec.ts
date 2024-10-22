import { start } from "repl";
import { flow } from "../src/flow";
import { LogEntry } from "../src/log-entry";

describe("Flow", () => {
  it("should log prompts, requests, responses, function calls, and custom metadata", async () => {
    // Log Prompt
    flow.logPrompt("Hello, World!", "user-input");

    // Log Request
    flow.logRequest({
      model: "gpt-4o-mini",
      functionCalls: ["search", "translate"],
      temperature: 0.7,
      maxTokens: 100,
      prompt: "Hello, World!",
      tokenCount:30,
      errorReason: "No error",
      topK: 50,
      topP: 0.9,  
      startTime: Date.now() - 1000,
      sentTime: Date.now(),
      systemPrompt: "Hello, World!",
      outputMode: "streaming",
    });

    // Log Response
    flow.logResponse({
      text: "Welcome!",
      status: 200,
      tokenCount: 50,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      outputMode: "streaming",
      errorReason: "Error",
    });

    // Log Function Call
    flow.logFunctionCall({
      name: "search",
      args: JSON.stringify({ query: "Lagos" }),
      result: "Lagos is a city in Nigeria",
      exitCode: 0,
      startTime: Date.now() - 1000,
      endTime: Date.now(),
    });

    // Log Custom Meta Data
    flow.log("meta", {
      totalTokenCount: 100,
      inputTokenCost1k: 0.5,
      outputTokenCost1k: 0.7,
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
    const logEntry: LogEntry = await flow.flushLogs();

      // Assertions for Request
      expect(logEntry?.request?.prompt).toEqual("Hello, World!");
      expect(logEntry?.request?.model).toEqual("gpt-4o-mini");
      expect(logEntry?.request?.temperature).toEqual(0.7);
      expect(logEntry?.request?.maxTokens).toEqual(100);
      expect(logEntry?.request?.topK).toEqual(50);
      expect(logEntry?.request?.topP).toEqual(0.9);
  
      // Assertions for Response
      expect(logEntry?.response?.text).toEqual("Welcome!");
      expect(logEntry?.response?.status).toEqual(200);
      expect(logEntry?.response?.tokenCount).toEqual(50);
      expect(logEntry?.response?.errorReason).toEqual("Error");
  
      // Assertions for Function Call
      expect(logEntry?.functionCalls?.[0]?.name).toEqual("search");
      expect(logEntry?.functionCalls?.[0]?.args).toEqual(JSON.stringify({ query: "Lagos" }));
      expect(logEntry?.functionCalls?.[0]?.result).toEqual("Lagos is a city in Nigeria");
      expect(logEntry?.functionCalls?.[0]?.exitCode).toEqual(0);
  
      // Assertions for Meta Data
      expect(logEntry?.meta?.totalTokenCount).toEqual(100);
      expect(logEntry?.meta?.inputTokenCost1k).toEqual(0.5);
      expect(logEntry?.meta?.outputTokenCost1k).toEqual(0.7);
      expect(logEntry?.meta?.triggerSource).toEqual("API");
      expect(logEntry?.meta?.outputMode).toEqual("streaming");
      expect(logEntry?.meta?.userId).toEqual("hashed_user_id");
      expect(logEntry?.meta?.country).toEqual("Nigeria");
      expect(logEntry?.meta?.operatingSystem).toEqual("mac os");
      expect(logEntry?.meta?.shell).toEqual("/bin/bash");
      expect(logEntry?.meta?.userTimeZone).toEqual("WAT");
      expect(logEntry?.meta?.machineId).toEqual("machine_id");
      expect(logEntry?.meta?.memory).toEqual(16);
      expect(logEntry?.meta?.env).toEqual("production");
  
  });
});
