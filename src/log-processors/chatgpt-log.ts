import os from "os";
import { machineIdSync } from "node-machine-id";
import {
  BufferEntry,
  LogEntryType,
  Request,
  Response,
  FunctionCall,
  Meta,
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
      functionCalls: request?.data?.functions,
      maxTokens: request?.data?.max_tokens,
      tokenCount: request?.data?.systemPrompt?.split("").length,
      errorReason: "",
      outputMode: request?.data?.outputMode,
    };
  }

  async processResponse(buffer: Readonly<BufferEntry[]>): Promise<Response> {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);

    return {
      text: response?.data?.choices[0].message.content,
      finishReason: response?.data?.choices[0].finish_reason,
      tokenCount: response?.data?.usage.total_tokens,
      status: 200,
      startTime: response?.data?.start_time,
      endTime: response?.data?.end_time,
      errorReason: "",
    };
  }

  async processFunctionCalls(
    buffer: Readonly<BufferEntry[]>,
  ): Promise<FunctionCall[]> {
    const functionCalls = buffer
      .filter((e) => e.type === LogEntryType.FUNCTION_CALL)
      .map((entry) => ({
        name: entry?.data?.name,
        args: entry?.data?.args,
        exitCode: entry?.data?.exitCode,
        startTime: entry?.data?.start_time,
        endTime: entry?.data?.end_time,
        result: entry?.data?.result,
      }));

    return functionCalls;
  }

  async processMeta(buffer: Readonly<BufferEntry[]>): Promise<Meta> {
    const model = buffer.find((entry) => entry.type === LogEntryType.REQUEST)
      ?.data?.model;
    const modelCost = await getModelCost(model);
    const tokenCount = buffer.find(
      (entry) => entry.type === LogEntryType.RESPONSE,
    )?.data?.usage.total_tokens;

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
}
