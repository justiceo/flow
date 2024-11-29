import os from "os";
import { machineIdSync } from "node-machine-id";
import {
  BufferEntry,
  LogEntryType,
  Request,
  Response,
  FunctionCallResult,
  Meta,
} from "../log-entry";
import { getModelCost } from "../costs/cost";
import { LogProcessor } from "./log-processor";

export class ChatGptLog implements LogProcessor {
  async canHandleRequest(request: Readonly<BufferEntry>): Promise<boolean> {
    return request.data?.model?.includes("gpt");
  }

  async processPrompt(buffer: Readonly<BufferEntry[]>): Promise<string> {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);

    return prompt?.data?.prompt;
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
        startTime: response?.data?.start_time,
        endTime: response?.data?.end_time,
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
        startTime: response?.data?.start_time,
        endTime: response?.data?.end_time,
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
      startTime: functionCallResult?.data?.start_time,
      endTime: functionCallResult?.data?.end_time,
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
    };
  }

  async processError(buffer: Readonly<BufferEntry[]>): Promise<string> {
    const error = buffer.find((e) => e.type === LogEntryType.ERROR);

    return error?.data;
  }
}
