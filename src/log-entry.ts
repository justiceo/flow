/**
 * Represents the request information in a log entry.
 */
export class Request {
  /** The prompt text */
  prompt?: string;

  /** [Optional] The system prompt */
  systemPrompt?: string;

  /** The ID of the model used */
  model?: string;

  /** The family of the model used */
  modelFamily?: string;

  /** The temperature setting for the request */
  temperature?: number;

  /** The topK setting for the request */
  topK?: number;

  /** [Optional] The function calls available for the model */
  functionCalls?: string[];

  /** The maximum number of tokens for the response */
  maxTokens?: number;

  /** The timestamp when the request started */
  startTime?: number;

  /** The timestamp when the request was sent */
  sentTime?: number;

  /** The number of tokens in the request */
  tokenCount?: number;

  /** [Optional] The reason for any error in the request */
  errorReason?: string;
}

/**
 * Represents the response information in a log entry.
 */
export class Response {
  /** The response text */
  text?: string;

  /** The status of the response */
  status?: string;

  /** [Optional] The reason for any error in the response */
  errorReason?: string;

  /** The number of tokens in the response */
  tokenCount?: number;

  /** The timestamp when the response started */
  startTime?: number;

  /** The timestamp when the response ended */
  endTime?: number;

  outputMode?: string;
}

/**
 * Represents a function call in a log entry.
 */
export class FunctionCall {
  /** The name of the function called */
  name?: string;

  /** The arguments passed to the function */
  args?: string;

  /** The result of the function call */
  result?: string;

  /** The exit code of the function call */
  exitCode?: number;

  /** The timestamp when the function call started */
  startTime?: number;

  /** The timestamp when the function call ended */
  endTime?: number;
}

/**
 * Represents metadata in a log entry.
 */
export class Meta {
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

  /** [Optional] The ID of the user */
  userId?: string;

  /** The country of the user */
  country?: string;

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
}

/**
 * Represents a complete log entry.
 */
export class LogEntry {
  /** The ID of the request */
  requestId?: string;

  /** The ID of the session */
  sessionId?: string;

  /** The request information */
  request?: Request;

  /** The response information */
  response?: Response;

  /** The function calls made during the request/response cycle */
  functionCalls?: FunctionCall[];

  /** The metadata for the log entry */
  meta?: Meta;
}
