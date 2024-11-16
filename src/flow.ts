import fs from "fs/promises";
import path from "path";
import { ChatGptLog } from "./log-processors/chatgpt-log";
import { GeminiLog } from "./log-processors/gemini-log";
import {
  LogEntry,
  BufferEntry,
  LogEntryType,
  Request,
  Response,
  FunctionCall,
  Meta,
} from "./log-entry";
import { LogProcessor } from "./log-processors/log-processor";

class Flow {
  private buffer: BufferEntry[] = [];
  private sessionId: string | undefined = undefined;
  private currentRequestId: string | undefined = undefined;
  private static instance: Flow | null = null;
  private handlers: { [key: string]: LogProcessor } = {
    chatgpt: new ChatGptLog(),
    // TODO: Add Gemini and Llama after updating their log processors.
  };

  static getInstance(): Flow {
    if (!Flow.instance) {
      Flow.instance = new Flow();
    }
    return Flow.instance;
  }

  // Generates unique ID for session/request
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  logPrompt(prompt: string, trigger: string): void {
    // This is the beginning of a new request, clear buffer.
    this.buffer = [];
    this.currentRequestId = this.generateUniqueId();
    if (!this.sessionId) {
      this.sessionId = this.currentRequestId;
    }

    this.log(LogEntryType.PROMPT, { prompt, trigger });
  }

  logRequest(requestData: any): void {
    this.log(LogEntryType.REQUEST, requestData);
  }

  logResponse(responseData: any): void {
    this.log(LogEntryType.RESPONSE, responseData);
  }

  logFunctionCall(functionCallData: any): void {
    this.log(LogEntryType.FUNCTION_CALL, functionCallData);
  }

  logError(error: Error): void {
    this.log(LogEntryType.ERROR, { error: error.message, stack: error.stack });
  }

  log(key: string | LogEntryType, data: any): void {
    this.buffer.push({
      type: key as unknown as LogEntryType,
      timestamp: new Date().toISOString(),
      data: data,
    });
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getRequestId(): string | undefined {
    return this.currentRequestId;
  }

  private async createLogEntry(
    readonlyBuffer: Readonly<BufferEntry[]>,
  ): Promise<LogEntry> {
    const modelFamily = this.getModelFamily(readonlyBuffer);
    return {
      requestId: this.currentRequestId,
      sessionId: this.sessionId,
      request: await this.handlers[modelFamily].processRequest(readonlyBuffer),
      response:
        await this.handlers[modelFamily].processResponse(readonlyBuffer),
      functionCalls:
        await this.handlers[modelFamily].processFunctionCalls(readonlyBuffer),
      meta: await this.handlers[modelFamily].processMeta(readonlyBuffer),
    };
  }

  private getModelFamily(buffer: Readonly<BufferEntry[]>): string {
    const entry = buffer.find((e) => e.type === LogEntryType.REQUEST);
    if (!entry) {
      // The request was not made.
      return "chatgpt"; // Default to chatgpt
    }
    if (entry.data?.model?.includes("gemini")) {
      return "gemini";
    } else if (entry.data?.model?.includes("claude")) {
      return "claude";
    } else if (entry.data?.model?.includes("gpt")) {
      return "chatgpt";
    }
    return "chatgpt"; // Default fallback
  }

  async flushLogs(transport?: (logEntry: LogEntry) => void): Promise<any> {
    if (this.buffer.length === 0) {
      return;
    }

    const readonlyBuffer: Readonly<BufferEntry[]> = Object.freeze([
      ...this.buffer,
    ]);
    const logEntry = await this.createLogEntry(readonlyBuffer);

    if (transport) {
      transport(logEntry);
    } else {
      const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
      const logFilePath = path.join("./data", logFileName);

      await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");
    }
    this.buffer = [];

    return logEntry;
  }
}

// Export instance and types
export const flow = Flow.getInstance();
