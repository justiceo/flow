import fs from "fs/promises";
import path from "path";
import { ChatGptLog } from "./log-processors/chatgpt-log";
import { Transport } from "./transports/transport";
import { LogEntry, BufferEntry, LogEntryType } from "./log-entry";
import { LogProcessor } from "./log-processors/log-processor";

// Flow class for managing logging across sessions and requests
class Flow {
  // Buffer to temporarily store log entries for the current request/session
  private buffer: BufferEntry[] = [];

  // Session ID to uniquely identify the current session
  private sessionId: string | undefined = undefined;

  // Request ID to uniquely identify the current request
  private currentRequestId: string | undefined = undefined;

  // Singleton instance of the Flow class
  private static instance: Flow | null = null;

  // Default log processor for handling log entries
  private defaultHandler: LogProcessor = new ChatGptLog();

  // Array of log processors
  private handlers: LogProcessor[] = [
    this.defaultHandler,
    // TODO: Add Gemini and Llama after updating their log processors.
  ];

  // Singleton pattern: Get or create the Flow instance
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

  /**
   * Logs a prompt input and initializes a new request.
   * @param prompt - The input data for the prompt (string or array).
   * @param trigger - The trigger event for the prompt.
   */
  logPrompt(prompt: string | any[], trigger: string): void {
    // Clear the buffer for a new request
    this.buffer = [];

    // Generate a unique ID for the current request
    this.currentRequestId = this.generateUniqueId();

    // If no session is active, initialize one with the current request ID
    if (!this.sessionId) {
      this.sessionId = this.currentRequestId;
    }

    // Log the prompt entry
    this.log(LogEntryType.PROMPT, { prompt, trigger });
  }

  /** Logs the request data. */
  logRequest(requestData: any): void {
    this.log(LogEntryType.REQUEST, requestData);
  }

  /** Logs the response data. */
  logResponse(responseData: any): void {
    this.log(LogEntryType.RESPONSE, responseData);
  }

  /** Logs the result of a function call. */
  logFunctionCallResult(functionCallResult: any): void {
    this.log(LogEntryType.FUNCTION_CALL_RESULT, functionCallResult);
  }

  /** Logs an error. */
  logError(error: any): void {
    this.log(LogEntryType.ERROR, error);
  }

  /**
   * Adds an entry to the log buffer.
   * @param key - The type of log entry (e.g., PROMPT, REQUEST).
   * @param data - The data associated with the log entry.
   */
  log(key: string | LogEntryType, data: any): void {
    this.buffer.push({
      type: key as unknown as LogEntryType,
      timestamp: new Date().toISOString(),
      data: data,
    });
  }

  /**
   * Gets the current session ID.
   * @returns The session ID.
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Gets the current request ID.
   * @returns The request ID.
   */
  getRequestId(): string | undefined {
    return this.currentRequestId;
  }

  /**
   * Creates a structured log entry by processing the buffer with an appropriate handler.
   * @param buffer - The read-only buffer containing log entries.
   * @returns A promise resolving to a LogEntry.
   */
  private async createLogEntry(
    buffer: Readonly<BufferEntry[]>,
  ): Promise<LogEntry> {
    // Default to the defaultHandler
    let handler = this.defaultHandler;

    // Check if the buffer contains a REQUEST log entry
    const request = buffer.find((e) => e.type === LogEntryType.REQUEST);

    // Try to find an appropriate handler that can process the request
    if (request) {
      const appropriateHandler = await Promise.all(
        this.handlers.map(async (h) =>
          (await h.canHandleRequest(request)) ? h : null,
        ),
      ).then((results) => results.find((h) => h !== null));

      if (appropriateHandler) {
        handler = appropriateHandler;
      }
    }

    // Process different parts of the log entry using the selected handler
    return {
      requestId: this.currentRequestId,
      sessionId: this.sessionId,
      request: await handler.processRequest(buffer),
      response: await handler.processResponse(buffer),
      functionCallResult: await handler.processFunctionCallResult(buffer),
      meta: await handler.processMeta(buffer),
      error: await handler.processError(buffer),
    };
  }

  /**
   * Flushes the buffered logs to a transport or a file.
   * @param transport - Optional transport to send the logs.
   * @param multiple - Flag to indicate handling multiple log entries.
   * @returns A promise resolving to the flushed log entry.
   */
  async flushLogs(transport?: Transport, multiple?: any): Promise<any> {
    // If the buffer is empty, do nothing
    if (this.buffer.length === 0) {
      return;
    }

    // Freeze the buffer to prevent modifications
    const readonlyBuffer: Readonly<BufferEntry[]> = Object.freeze([
      ...this.buffer,
    ]);

    // Create a structured log entry from the buffer
    const logEntry = await this.createLogEntry(readonlyBuffer);

    // Send the log entry to a transport if provided
    if (transport) {
      transport.send(logEntry);
    } else {
      // Handle file logging if no transport is provided
      const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
      const logFilePath = path.join("./data", logFileName);

      if (multiple) {
        // In progress - this will be for cases of multiple log entries
        await fs.writeFile(logFilePath, JSON.stringify(logEntry) + "\n");
      }

      // Append the log entry to the log file
      await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");
    }

    // Clear the buffer after flushing
    this.buffer = [];

    return logEntry;
  }
}

// Export the singleton Flow instance and types
export const flow = Flow.getInstance();
