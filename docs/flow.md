# Documentation for `flow.ts`

## Overview

The `flow.ts` file defines a `Flow` class that provides a structured logging mechanism for managing log entries during a session. It supports logging various types of events, such as prompts, requests, responses, function calls, and errors. The class is implemented as a singleton to ensure only one instance exists throughout the application.

---

## Table of Contents

1. [Class: Flow](#class-flow)
   - [Static Methods](#static-methods)
   - [Instance Methods](#instance-methods)
2. [Key Features](#key-features)
3. [Handlers](#handlers)
4. [Transport](#transport)
5. [Usage](#usage)
6. [Dependencies](#dependencies)

---

## Class: Flow

### Description

The `Flow` class is responsible for:

- Managing log entries for a session.
- Buffering log data before persisting or transporting it.
- Dynamically selecting handlers to process logs based on request types.

### Properties

| Property           | Type             | Description                                |
| ------------------ | ---------------- | ------------------------------------------ |
| `buffer`           | `BufferEntry[]`  | Holds the current log entries.             |
| `sessionId`        | `string`         | Unique identifier for the current session  |
| `currentRequestId` | `string`         | Unique identifier for the current request. |
| `defaultHandler`   | `LogProcessor`   | The default log handler.                   |
| `handlers`         | `LogProcessor[]` | Array of all log handlers.                 |

---

### Static Methods

#### `getInstance()`

- **Description**: Ensures a single instance of the `Flow` class is used.
- **Returns**: `Flow` instance.

---

### Instance Methods

#### `logPrompt(prompt: string | any[], trigger: string): void`

- **Description**: Logs the beginning of a new request and clears the buffer.
- **Parameters**:
  - `prompt`: The prompt content (string or array).
  - `trigger`: A string describing what triggered the prompt.

#### `logRequest(requestData: any): void`

- **Description**: Logs request-related data.
- **Parameters**:
  - `requestData`: The request data object.

#### `logResponse(responseData: any): void`

- **Description**: Logs response-related data.
- **Parameters**:
  - `responseData`: The response data object.

#### `logFunctionCall(functionCallResult: any): void`

- **Description**: Logs the result of a function call.
- **Parameters**:
  - `functionCallResult`: Result data of the function call.

#### `logError(error: any): void`

- **Description**: Logs an error entry.
- **Parameters**:
  - `error`: Error details.

#### `log(key: string | LogEntryType, data: any): void`

- **Description**: Pushes a log entry to the buffer.
- **Parameters**:
  - `key`: The type of the log entry.
  - `data`: The data to log.

#### `getSessionId(): string | undefined`

- **Description**: Returns the current session ID.

#### `getRequestId(): string | undefined`

- **Description**: Returns the current request ID.

#### `flushLogs(transport?: Transport, multiple?: any): Promise<any>`

- **Description**: Processes and writes the buffered log entries to a transport or file.
- **Parameters**:
  - `transport`: Optional transport for sending logs.
  - `multiple`: Option to process multiple log entries.
- **Returns**: The processed log entry.

---

## Key Features

- **Singleton Pattern**: Ensures only one `Flow` instance is active at any time.
- **Logging**: Uses log methods to log entries.
- **Session and Request Tracking**: Tracks session and request IDs for logs.
- **Buffering**: Buffers logs before processing.
- **File and Transport Logging**: Supports logging to both files and external transports.

---

## Handlers

Handlers are implementations of the `LogProcessor` interface and define how logs are processed. The default handler is `ChatGptLog`.

---

## Transport

The `Transport` interface defines methods to send log entries to external systems. This allows flexibility in how logs are consumed (e.g., sent to a monitoring system or stored in a database).

---

## Usage

### Import and Initialize

```typescript
import { flow } from "./flow";

const TestPrompt = "In which continent is Nigeria?";
flow.logPrompt(TestPrompt, "user-input");

const request = createRequest(TestPrompt, []);
flow.logRequest(request);

const response = await openai.chat.completions.create(request);

flow.logResponse(response);

const logEntry = await flow.flushLogs();
```

---

## Dependencies

- **`fs/promises`**: For file system operations.
- **`path`**: For file path manipulation.
- **Custom Modules**:
  - `log-processors/chatgpt-log`: Default log processor.
  - `log-entry`: Defines log entry types and structures.
  - `transports/transport`: Defines the transport interface.
  - `log-processors/log-processor`: Base interface for log processors.

---
