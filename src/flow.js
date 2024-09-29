// flow.js

import fs from "fs/promises";
import path from "path";
import os from "os";
import { LogEntryType } from "./const.js";
import { ChatGptLog } from "./chatgpt-log.js";


class Flow {
  constructor() {
    this.buffer = [];
    this.sessionId = null;
    this.currentRequestId = null;
    this.handlers = {
      chatgpt: new ChatGptLog(),
    };
  }

  static getInstance() {
    if (!Flow.instance) {
      Flow.instance = new Flow();
    }
    return Flow.instance;
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  logPrompt(prompt, trigger) {
    // This is the begining of a new request.
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

  logRequest(requestData) {
    this.buffer.push({
      type: LogEntryType.REQUEST,
      timestamp: new Date().toISOString(),
      data: requestData,
    });
  }

  logResponse(responseData) {
    this.buffer.push({
      type: LogEntryType.RESPONSE,
      timestamp: new Date().toISOString(),
      data: responseData,
    });
  }

  logFunctionCall(functionCallData) {
    this.buffer.push({
      type: LogEntryType.FUNCTION_CALL,
      timestamp: new Date().toISOString(),
      data: functionCallData,
    });
  }

  log(key, data) {
    this.buffer.push({
      type: LogEntryType.CUSTOM,
      timestamp: new Date().toISOString(),
      data: { key, data },
    });
  }

  logError(error) {
    this.buffer.push({
      type: LogEntryType.ERROR,
      timestamp: new Date().toISOString(),
      data: { error: error.message, stack: error.stack },
    });
  }

  getSessionId() {
    return this.sessionId;
  }

  getRequestId() {
    return this.currentRequestId;
  }

  createLogEntry(readonlyBuffer) {
    const modelFamily = this.getModelFamily(readonlyBuffer);
    const logEntry = {
      requestId: this.currentRequestId,
      sessionId: this.sessionId,
      request: this.handlers[modelFamily].processRequest(readonlyBuffer),
      response: this.handlers[modelFamily].processResponse(readonlyBuffer),
      functionCalls:
        this.handlers[modelFamily].processFunctionCalls(readonlyBuffer),
      meta: this.handlers[modelFamily].processMeta(readonlyBuffer),
    };
    return logEntry;
  }

  getModelFamily(buffer) {
    const entry = buffer.find((e) => e.type === LogEntryType.REQUEST);
    if(!entry) {
      // The request was not made. 
      // TODO: Determine the best way to handle this case.
      return "chatgpt";
    }
    if (entry.data?.model?.includes("gemini")) {
      return "gemini";
    } else if (entry.data?.model?.includes("claude")) {
      return "claude";
    } else if (entry.data?.model?.includes("gpt")) {
      return "chatgpt";
    }
  }

  async flushLogs() {
    if(this.buffer.length === 0) {
      return;
    }

    const readonlyBuffer = Object.freeze([...this.buffer]);

    const logEntry = this.createLogEntry(readonlyBuffer);

    const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
    const logFilePath = path.join( "./", logFileName);

    await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");

    this.buffer = [];

    return logEntry;
  }
}

export const flow = Flow.getInstance();
export { LogEntryType };
