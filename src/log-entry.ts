export enum LogEntryType {
  PROMPT,
  REQUEST,
  RESPONSE,
  FUNCTION_CALL_RESULT,
  CUSTOM,
  ERROR,
}

/**
 * Represents the request information in a log entry.
 */
export interface Request {
  /** The prompt text */
  prompt?: string;

  /** The system prompt */
  systemPrompt?: string;

  /** The ID of the model used */
  model?: string;

  /** The family of the model used */
  modelFamily?: ModelFamily;

  /** The temperature value for the request */
  temperature?: number;

  /** The topK value for the request */
  topK?: number;

  /** The topP value for the request */
  topP?: number;

  /** The function calls available for the model */
  tools?: string[];

  /** The maximum number of tokens for the response */
  maxTokens?: number;

  /** The number of tokens in the request */
  tokenCount?: number;

  /** The reason for any error in the request */
  errorReason?: string;

  /** The output mode (e.g., "streaming", "json", "csv") */
  outputMode?: string;
}

/**
 * Represents the response information in a log entry.
 */
export interface Response {
  /** The response text */
  text?: string;

  /** The status of the response */
  status?: number;

  /** The reason for any error in the response */
  errorReason?: string;

  /** The reason content-generation stopped. */
  finishReason?: string;

  /** The number of tokens in the response */
  tokenCount?: number;

  /** The timestamp when the response started */
  startTime?: number;

  /** The timestamp when the response ended */
  endTime?: number;

  /** The output mode (e.g., "streaming", "schema") */
  outputMode?: string;

  /** The function call returned in the response*/
  toolUse: string[];
}

/**
 * Represents a function call in a log entry.
 */
export interface FunctionCallResult {
  /** The name of the function called */
  name?: string;

  /** The arguments passed to the function */
  args?: string;

  /** The result of the function call */
  result?: string;

  /** The timestamp when the function call started */
  startTime?: number;

  /** The timestamp when the function call ended */
  endTime?: number;

  /** The exit code of the function call */
  exitCode?: number;

  /** The latency for for function call */
  latency?: number;
}

/**
 * Represents metadata in a log entry.
 */
export interface Meta {
  /** The total number of tokens in the request and response */
  totalTokenCount?: number;

  /** The cost per 1000 input tokens */
  inputTokenCost1k?: number;

  /** The cost per 1000 output tokens */
  outputTokenCost1k?: number;

  /** The source that triggered the request */
  triggerSource?: string;

  /** The output mode (e.g., "streaming", "schema") */
  outputMode?: string;

  /** The ID of the user */
  userId?: string;

  /** The locale of the user */
  locale?: string;

  /** The operating system of the user */
  operatingSystem?: string;

  /** The shell of the user */
  shell?: string;

  /** The time zone of the user */
  userTimeZone?: string;

  /** The memory usage */
  memory?: number;

  /** The ID of the machine */
  machineId?: string;

  /** The environment (e.g., "development", "production") */
  env?: string;

  /** The latency between prompt and request */
  latency_propmt_req: number;

  /** The latency between request and response */
  latency_req_res?: number;

  /** The latency for function calls */
  latency_function_calls?: number;

  /** Total request cost */
  requestCost?: number;
}

/**
 * Represents error in a log entry.
 */

export interface Error {
  /** The error message */
  error_message?: string;
}

/**
 * Represents a complete log entry.
 */
export interface LogEntry {
  /** The ID of the request */
  requestId?: string;

  /** The ID of the session */
  sessionId?: string;

  /** The request information */
  request?: Request;

  /** The response information */
  response?: Response;

  /** The function call result */
  functionCallResult?: FunctionCallResult;

  /** The metadata for the log entry */
  meta?: Meta;

  /** The error information */
  error?: any;
}

/**
 * Represents an entry in the buffer containing different types of log data.
 */
export interface BufferEntry {
  /** The type of the entry (e.g., "request", "response", "functionCall") */
  type: LogEntryType;

  /** The timestamp of when the entry was created */
  timestamp: string;

  /** The actual data of the entry, which can be a request, response, function call, or any other type */
  data: any;
}

export enum ModelFamily {
  GEMINI = "gemini",
  CHATGPT = "chatgpt",
  CLAUDE = "claude",
  GROK = "grok",
  LLAMA = "llama",
  OTHER = "other",
}
