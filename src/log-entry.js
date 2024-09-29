/**
 * Represents the request information in a log entry.
 */
class Request {
  /** @type {string} The prompt text */
  prompt;

  /** @type {string} [Optional] The system prompt */
  systemPrompt;

  /** @type {string} The ID of the model used */
  modelId;

  /** @type {string} The family of the model used */
  modelFamily;

  /** @type {number} The temperature setting for the request */
  temperature;

  /** @type {number} The topK setting for the request */
  topK;

  /** @type {string[]} [Optional] The function calls available for the model */
  functionCalls;

  /** @type {number} The maximum number of tokens for the response */
  maxTokens;

  /** @type {number} The timestamp when the request started */
  startTime;

  /** @type {number} The timestamp when the request was sent */
  sentTime;

  /** @type {number} The number of tokens in the request */
  tokenCount;

  /** @type {string} [Optional] The reason for any error in the request */
  errorReason;
}

/**
 * Represents the response information in a log entry.
 */
class Response {
  /** @type {string} The response text */
  text;

  /** @type {string} The status of the response */
  status;

  /** @type {string} [Optional] The reason for any error in the response */
  errorReason;

  /** @type {number} The number of tokens in the response */
  tokenCount;

  /** @type {number} The timestamp when the response started */
  startTime;

  /** @type {number} The timestamp when the response ended */
  endTime;
}

/**
 * Represents a function call in a log entry.
 */
class FunctionCall {
  /** @type {string} The name of the function called */
  name;

  /** @type {string} The arguments passed to the function */
  args;

  /** @type {string} The result of the function call */
  result;

  /** @type {number} The exit code of the function call */
  exitCode;

  /** @type {number} The timestamp when the function call started */
  startTime;

  /** @type {number} The timestamp when the function call ended */
  endTime;
}

/**
 * Represents metadata in a log entry.
 */
class Meta {
  /** @type {number} The total number of tokens in the request and response */
  totalTokenCount;

  /** @type {number} The cost per 1000 input tokens */
  inputTokenCost1k;

  /** @type {number} The cost per 1000 output tokens */
  outputTokenCost1k;

  /** @type {string} The source that triggered the request */
  triggerSource;

  /** @type {string} The output mode (e.g., "streaming", "schema") */
  outputMode;

  /** @type {string} [Optional] The ID of the user */
  userId;

  /** @type {string} The country of the user */
  country;

  /** @type {string} The operating system of the user */
  operatingSystem;

  /** @type {string} The shell of the user */
  shell;

  /** @type {string} The time zone of the user */
  userTimeZone;

  /** @type {number} The memory usage */
  memory;

  /** @type {string} The ID of the machine */
  machineId;

  /** @type {string} The environment (e.g., "development", "production") */
  env;
}

/**
 * Represents a complete log entry.
 */
export class LogEntry {
  /** @type {string} The ID of the request */
  requestId;

  /** @type {string} The ID of the session */
  sessionId;

  /** @type {Request} The request information */
  request;

  /** @type {Response} The response information */
  response;

  /** @type {FunctionCall[]} The function calls made during the request/response cycle */
  functionCalls;

  /** @type {Meta} The metadata for the log entry */
  meta;
}
