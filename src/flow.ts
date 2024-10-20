import fs from "fs/promises";
import path from "path";
import os from "os";
import { LogEntryType } from "./const";
import { ChatGptLog } from "./chatgpt-log";



// Interfaces for Log Entries
interface LogEntry {
  type: typeof LogEntryType[keyof typeof LogEntryType];
  timestamp: string;
  data: any; 
}

interface RequestData {
  model?: string;
  [key: string]: any;
}

interface FunctionCallData {
  name: string;
  arguments: any;
}

// Class definition
class Flow {
  private buffer: LogEntry[] = [];
  private sessionId: string | null = null;
  private currentRequestId: string | null = null;
  private static instance: Flow | null = null;
  private handlers: { [key: string]: ChatGptLog } = {
    chatgpt: new ChatGptLog(),
  };

  constructor() {
    // Initialize handlers in the constructor
    this.buffer = [];
    this.sessionId = null;
    this.currentRequestId = null;
    this.handlers = {
      chatgpt: new ChatGptLog(),
    };
  }

  // Singleton pattern to get instance
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
    // This is the beginning of a new request.
    this.buffer = [];
    this.currentRequestId = this.generateUniqueId();
    if (!this.sessionId) {
      this.sessionId = this.currentRequestId;
    }

    this.buffer.push({
      type: LogEntryType.PROMPT,
      timestamp: new Date().toISOString(),
      data: { prompt, trigger },
    });
  }

  logRequest(requestData: RequestData): void {
    this.buffer.push({
      type: LogEntryType.REQUEST,
      timestamp: new Date().toISOString(),
      data: requestData,
    });
  }

  logResponse(responseData: any): void {
    this.buffer.push({
      type: LogEntryType.RESPONSE,
      timestamp: new Date().toISOString(),
      data: responseData,
    });
  }

  logFunctionCall(functionCallData: FunctionCallData): void {
    this.buffer.push({
      type: LogEntryType.FUNCTION_CALL,
      timestamp: new Date().toISOString(),
      data: functionCallData,
    });
  }

  log(key: string, data: any): void {
    this.buffer.push({
      type: LogEntryType.CUSTOM,
      timestamp: new Date().toISOString(),
      data: { key, data },
    });
  }

  logError(error: Error): void {
    this.buffer.push({
      type: LogEntryType.ERROR,
      timestamp: new Date().toISOString(),
      data: { error: error.message, stack: error.stack },
    });
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getRequestId(): string | null {
    return this.currentRequestId;
  }

  private createLogEntry(readonlyBuffer: Readonly<LogEntry[]>): any {
    const modelFamily = this.getModelFamily(readonlyBuffer);
    const logEntry = {
      requestId: this.currentRequestId,
      sessionId: this.sessionId,
      request: this.handlers[modelFamily].processRequest(readonlyBuffer),
      response: this.handlers[modelFamily].processResponse(readonlyBuffer),
      functionCalls: this.handlers[modelFamily].processFunctionCalls(readonlyBuffer),
      meta: this.handlers[modelFamily].processMeta(readonlyBuffer),
    };
    return logEntry;
  }

  private getModelFamily(buffer: Readonly<LogEntry[]>): string {
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

  async flushLogs(): Promise<any> {
    if (this.buffer.length === 0) {
      return;
    }

    const readonlyBuffer: Readonly<LogEntry[]> = Object.freeze([...this.buffer]);
    const logEntry = this.createLogEntry(readonlyBuffer);

    const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
    const logFilePath = path.join("./", logFileName);

    await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");

    this.buffer = [];

    return logEntry;
  }
}

// Export instance and types
export const flow = Flow.getInstance();
