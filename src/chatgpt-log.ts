import { LogEntryType } from "./const";

interface LogEntry {
  type: typeof LogEntryType[keyof typeof LogEntryType];
  timestamp: string;
  data: any;
}

interface RequestData {
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  functions?: any[];
  max_tokens?: number;
  stream?: boolean;
}

interface ResponseData {
  responseText: string;
  finishReason: string;
  completionTime: string;
  tokenCount: number;
}

interface FunctionCallData {
  name: string;
  arguments: any;
  callTime: string;
}

// ChatGptLog class in TypeScript
export class ChatGptLog {
  processRequest(buffer: Readonly<LogEntry[]>): RequestData | {} {
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
      tokenCount: request?.data?.systemPrompt?.split("").length,
      errorReason: "",
      outputMode: request?.data?.stream ? "stream" : "json-schema",
    };
  }

  processResponse(buffer: Readonly<LogEntry[]>): ResponseData | {} {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);

    if (!response) {
      return {};
    }

    return {
      responseText: response?.data?.choices?.[0]?.message?.content,
      finishReason: response?.data?.choices?.[0]?.finish_reason,
      completionTime: response?.timestamp,
      tokenCount: response?.data?.usage?.total_tokens,
    };
  }

  processFunctionCalls(buffer: Readonly<LogEntry[]>): FunctionCallData[] {
    const functionCalls = buffer
      .filter((e) => e.type === LogEntryType.FUNCTION_CALL)
      .map((entry) => ({
        name: entry?.data?.name,
        arguments: entry?.data?.arguments,
        callTime: entry?.timestamp,
      }));

    return functionCalls;
  }

  processMeta(buffer: Readonly<LogEntry[]>): {} {
    return {};
  }
}
