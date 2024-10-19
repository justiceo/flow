import { flow } from "../src/flow";

describe("Flow", () => {
  it("should write basic logs", async () => {
    flow.logPrompt("Hello, World!", "user-input");
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
    const logEntry = await flow.flushLogs();
    expect(logEntry.request.prompt).toBe("Hello, World!");
  });
});
