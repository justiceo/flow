import os from "os";
import { machineIdSync } from "node-machine-id";
import {
  BufferEntry,
  LogEntryType,
  Request,
  Response,
  FunctionCallResult,
  Meta,
  Error,
} from "../log-entry";
import { getModelCost } from "../costs/cost";
import { LogProcessor } from "./log-processor";

export class ChatGptLog implements LogProcessor {
  async canHandleRequest(request: Readonly<BufferEntry>): Promise<boolean> {
    return request.data?.model?.includes("gpt");
  }

  async processRequest(buffer: Readonly<BufferEntry[]>): Promise<Request> {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);
    const request = buffer.find((e) => e.type === LogEntryType.REQUEST);

    return {
      prompt: prompt?.data?.prompt,
      systemPrompt: request?.data?.systemPrompt,
      model: request?.data?.model,
      temperature: request?.data?.temperature,
      topK: request?.data?.top_k,
      topP: request?.data?.top_p,
      tools: request?.data?.tools,
      maxTokens: request?.data?.max_tokens,
      tokenCount: request?.data?.systemPrompt?.split("").length,
      errorReason: "",
      outputMode: request?.data?.outputMode,
    };
  }

  async processResponse(buffer: Readonly<BufferEntry[]>): Promise<Response> {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);
    // Check if the response is streamed or non-streamed
    const isStreamed =
      Array.isArray(response?.data?.choices) &&
      response?.data?.choices[0]?.delta;

    if (isStreamed) {
      // Handle streamed response
      return {
        text: response?.data?.choices[0].delta?.content,
        finishReason: response?.data?.choices[0].finish_reason,
        tokenCount: 0,
        status: 200,
        errorReason: "",
        toolUse: response?.data.choices[0]?.message?.tool_calls,
      };
    } else {
      // Handle non-streamed response
      return {
        text: response?.data?.choices[0].message.content,
        finishReason: response?.data?.choices[0].finish_reason,
        tokenCount: response?.data?.usage.total_tokens,
        status: 200,
        errorReason: "",
        toolUse: response?.data.choices[0]?.message.tool_calls,
      };
    }
  }

  async processFunctionCallResult(
    buffer: Readonly<BufferEntry[]>,
  ): Promise<FunctionCallResult> {
    const functionCallResult = buffer.find(
      (e) => e.type === LogEntryType.FUNCTION_CALL_RESULT,
    );

    return {
      name: functionCallResult?.data?.name,
      args: functionCallResult?.data?.args,
      result: functionCallResult?.data?.result,
      exitCode: 0,
    };
  }

  async processMeta(buffer: Readonly<BufferEntry[]>): Promise<Meta> {
    const model = buffer.find((entry) => entry.type === LogEntryType.REQUEST)
      ?.data?.model;
    const modelCost = await getModelCost(model);
    const tokenCount = buffer.find(
      (entry) => entry.type === LogEntryType.RESPONSE,
    )?.data?.usage?.total_tokens;

    const { latency_propmt_req, latency_req_res, latency_function_calls } =
      calcLatency(buffer);
    const { requestCost, inputCost, outputCost } =
      await calcRequestCost(buffer);

    return {
      totalTokenCount: tokenCount,
      inputTokenCost1k: modelCost?.tokensInCost,
      outputTokenCost1k: modelCost?.tokensOutCost,
      triggerSource: "",
      userId: "",
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      operatingSystem: `${os.platform()}/${os.release()}`,
      shell: os.userInfo().shell || "Unknown",
      memory: 0,
      machineId: machineIdSync(),
      env: process.env.NODE_ENV || "development",
      latency_propmt_req: latency_propmt_req,
      latency_req_res: latency_req_res,
      latency_function_calls: latency_function_calls,
      inputCost: inputCost,
      outputCost: outputCost,
      requestCost: requestCost,
    };
  }

  async processError(buffer: Readonly<BufferEntry[]>): Promise<Error> {
    const error = buffer.find((e) => e.type === LogEntryType.ERROR);

    return {
      error_message: error?.data.message,
    };
  }
}

// Function calculate latency between prompt, request and response, function calls, and streaming responses
const calcLatency = (buffer: Readonly<BufferEntry[]>) => {
  // Timestamp for prompt log entry
  const promptTimestamp = buffer.find(
    (entry) => entry.type === LogEntryType.PROMPT,
  )?.timestamp;
  // Timestamp for request log entry
  const requestTimestamp = buffer.find(
    (entry) => entry.type === LogEntryType.REQUEST,
  )?.timestamp;
  // Timestamp for response log entry
  const responseTimestamp = buffer.find(
    (entry) => entry.type === LogEntryType.RESPONSE,
  )?.timestamp;
  // Timestamp for function call result
  const functionCallResultTimestamp = buffer.find(
    (entry) => entry.type === LogEntryType.FUNCTION_CALL_RESULT,
  )?.timestamp;

  return {
    latency_propmt_req:
      promptTimestamp && requestTimestamp
        ? new Date(requestTimestamp).getTime() -
          new Date(promptTimestamp).getTime()
        : 0,
    latency_req_res:
      requestTimestamp && responseTimestamp
        ? new Date(responseTimestamp).getTime() -
          new Date(requestTimestamp).getTime()
        : 0,
    latency_function_calls:
      responseTimestamp && functionCallResultTimestamp
        ? new Date(functionCallResultTimestamp).getTime() -
          new Date(responseTimestamp).getTime()
        : 0,
  };
};

const calcRequestCost = async (buffer: Readonly<BufferEntry[]>) => {
  const model = buffer.find((entry) => entry.type === LogEntryType.REQUEST)
    ?.data?.model;
  const modelCost = await getModelCost(model);

  const inputToken = buffer.find((e) => e.type === LogEntryType.RESPONSE)?.data
    ?.usage?.prompt_tokens;
  const outputToken = buffer.find((e) => e.type === LogEntryType.RESPONSE)?.data
    ?.usage?.completion_tokens;
  const inputTokenCost10k = modelCost?.tokensInCost;
  const outputTokenCost10k = modelCost?.tokensOutCost;

  const inputCost = inputToken * inputTokenCost10k; // cost for input tokens
  const outputCost = outputToken * outputTokenCost10k; // cost for output tokens

  const requestCost =
    inputToken * inputTokenCost10k + outputToken * outputTokenCost10k; // total cost for the request

  return { requestCost, inputCost, outputCost };
};
