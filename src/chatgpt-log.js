import { LogEntryType } from "./const.js";
export class ChatGptLog {
  processRequest(buffer) {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);
    const request = buffer.find((e) => e.type === LogEntryType.REQUEST);
    
    return {
      prompt: prompt?.data?.prompt,
      systemPrompt: request?.data?.systemPrompt,
      model: request?.data?.model,
      temperature: request?.data?.temperature,
      topK: request?.data?.top_k,
      topP: request?.data?.top_p,
      functionCalls: request?.data?.functions,
      maxTokens: request?.data?.max_tokens,
      startTime: prompt?.timestamp,
      sentTime: request?.timestamp,
      tokenCount:
        request?.data?.systemPrompt?.split("").length,
      errorReason: "",
      outputMode: request?.data?.stream
        ? "stream"
        : "json-schema",
    };
  }
  processResponse(buffer) {
    return {};
  }
  processFunctionCalls(buffer) {
    return [];
  }
  processMeta(buffer) {
    return {};
  }
}
