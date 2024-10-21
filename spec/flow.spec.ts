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
    expect(logEntry.request?.prompt).toBe("Hello, World!");
    expect(logEntry.request?.model).toBe("gpt-4o-mini");
    expect(logEntry.request?.functionCalls).toEqual(["search", "translate"]);

    // Assertions for Response
    expect(logEntry.response?.text).toBe("Welcome!");
    expect(logEntry.response?.status).toBe(200);
    expect(logEntry.response?.tokenCount).toBe(50);
    expect(logEntry.response?.outputMode).toBe("streaming");
    expect(logEntry.response?.startTime).toBeDefined(); // Ensure startTime is logged
    expect(logEntry.response?.endTime).toBeDefined(); // Ensure endTime is logged

    // Assertions for Function Call
    expect(logEntry.functionCalls?.[0]?.name).toBe("search");
    expect(logEntry.functionCalls?.[0]?.args).toBe(JSON.stringify({ query: "Lagos" }));

    // Assertions for Meta Data
    expect(logEntry.meta?.userId).toBe("hashed_user_id");
    expect(logEntry.meta?.country).toBe("Nigeria");
    expect(logEntry.meta?.operatingSystem).toBe("mac os");
    expect(logEntry.meta?.outputMode).toBe("streaming");
  });
});
