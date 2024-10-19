import { flow } from "../flow";

describe("Flow", () => {
  it("should log prompts, requests, responses, function calls, and custom metadata", async () => {
    // Log Prompt
    flow.logPrompt("Hello, World!", "user-input");

    // Log Request
    flow.logRequest({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Hello, World!",
        },
      ],
      functions: ["search", "translate"],
      function_call: "auto",
      temperature: 0.7,
      n: 1,
      max_tokens: 100,
      stream: true,
    });

    // Log Response
    flow.logResponse({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Welcome!",
          },
        },
      ],
    });

    // Log Function Call
    flow.logFunctionCall({
      name: "search",
      arguments: { query: "Lagos" },
    });

    // Log Custom Meta Data
    flow.log("meta", {
      output_mode: "streaming",
      user_id: "hashed_user_id",
      country: "Nigeria",
      operating_system: "mac os",
      shell: "/bin/bash",
      user_time_zone: "WAT",
    });

    // Flush logs
    const logEntry = await flow.flushLogs();

    // Assertions
    expect(logEntry.request.prompt).toBe("Hello, World!");
    expect(logEntry.response.responseText).toBe("Welcome!");
    expect(logEntry.functionCalls[0].name).toBe("search");
    expect(logEntry.functionCalls[0].arguments.query).toBe("Lagos");
    expect(logEntry.meta.user_id).toBe("hashed_user_id");
  });
});
