// System packages
import fs from "fs/promises";
import path from "path";

// Local dependencies
import { LogEntryType } from "./const";
import { ChatGptLog } from "./chatgpt-log";
import { GeminiLog } from "./gemini-log";
import { LogEntry, BufferEntry, Request, Response, FunctionCall, Meta } from "./log-entry";


class Flow {
  private buffer: BufferEntry[] = [];
  private sessionId: string | undefined = undefined;
  private currentRequestId: string | undefined = undefined;
  private static instance: Flow | null = null;
  private handlers: { [key: string]: ChatGptLog | GeminiLog } = {
    chatgpt: new ChatGptLog(),
    gemini: new GeminiLog(),
  };


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
    } );
  }

  logRequest(requestData: any): void {
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

  logFunctionCall(functionCallData: any): void {
    this.buffer.push({
      type: LogEntryType.FUNCTION_CALL,
      timestamp: new Date().toISOString(),
      data: functionCallData,
    });
  }

  log(key: string, data: any ): void {
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

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getRequestId(): string | undefined {
    return this.currentRequestId;
  }

  private async createLogEntry(readonlyBuffer: Readonly<BufferEntry[]>){
    const modelFamily = this.getModelFamily(readonlyBuffer);
    const logEntry = {
      requestId: this.currentRequestId,
      sessionId: this.sessionId,
      request: this.handlers[modelFamily].processRequest(readonlyBuffer),
      response: this.handlers[modelFamily].processResponse(readonlyBuffer),
      functionCalls: this.handlers[modelFamily].processFunctionCalls(readonlyBuffer),
      meta: await this.handlers[modelFamily].processMeta(readonlyBuffer),
    };
    return logEntry;
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

    const readonlyBuffer: Readonly<BufferEntry[]> = Object.freeze([...this.buffer]);
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