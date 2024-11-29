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
export class GeminiLog implements LogProcessor {
  async canHandleRequest(request: Readonly<BufferEntry>): Promise<boolean> {
    return request.data?.model?.includes("gemini");
  }

  async processPrompt(buffer: Readonly<BufferEntry[]>): Promise<string> {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);

    return prompt?.data?.prompt;
  }

  async processRequest(buffer: Readonly<BufferEntry[]>): Promise<Request> {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);
    const request = buffer.find((e) => e.type === LogEntryType.REQUEST);
    console.log(request);
    const tools = request?.data?.tools;
    return {
      prompt: prompt?.data?.prompt,
      model: request?.data?.model,
      temperature: request?.data?.generationConfig.temperature,
      maxTokens: request?.data?.generationConfig.maxOutputTokens,
      tokenCount: request?.data?.systemPrompt?.split("").length,
      topP: request?.data?.generationConfig.topP,
      topK: request?.data?.generationConfig.topK,
      systemPrompt: request?.data?.systemPrompt,
      outputMode: request?.data?.outputMode,
      errorReason: "",
      functionCalls:
        Array.isArray(tools) && tools[0]
          ? tools[0].functionDeclarations
          : undefined,
    };
  }

  async processResponse(buffer: Readonly<BufferEntry[]>): Promise<Response> {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);

    return {
      text: response?.data?.text() ? response?.data?.text() : "",
      finishReason: response?.data?.candidates[0]?.finishReason,
      tokenCount: response?.data?.usageMetadata.totalTokenCount,
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

  async processMeta(buffer: Readonly<BufferEntry[]>) {
    const model = buffer.find((entry) => entry.type === LogEntryType.REQUEST)
      ?.data?.model;
    const modelCost = await getModelCost(model);
    const tokenCount = buffer.find(
      (entry) => entry.type === LogEntryType.RESPONSE,
    )?.data?.usageMetadata.totalTokenCount;

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
