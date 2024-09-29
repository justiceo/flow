import { flow } from "../src/flow.js";

describe("Flow", () => {
  it("should write basic logs", async () => {
    flow.logPrompt("Hello, World!");
    flow.logRequest({
      model: "gpt-3.5-turbo",
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
    const logEntry = await flow.flushLogs();
    expect(logEntry.request.prompt).toBe("Hello, World!");
  });
});
