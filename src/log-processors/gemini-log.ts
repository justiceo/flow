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
export class GeminiLog implements LogProcessor {
  async canHandleRequest(request: Readonly<BufferEntry>): Promise<boolean> {
    return request.data?.model?.includes("gemini");
  }

  async processRequest(buffer: Readonly<BufferEntry[]>): Promise<Request> {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);
    const request = buffer.find((e) => e.type === LogEntryType.REQUEST);
    // console.log(request);
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
      tools: request?.data?.tools,
    };
  }

  async processResponse(buffer: Readonly<BufferEntry[]>): Promise<Response> {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);

    return {
      text: response?.data?.text() ? response?.data?.text() : "",
      finishReason: response?.data?.candidates[0]?.finishReason,
      tokenCount: response?.data?.usageMetadata.totalTokenCount,
      status: 200,
      errorReason: "",
      toolUse: response?.data?.functionCalls(),
    };
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

  async processError(buffer: Readonly<BufferEntry[]>): Promise<Error> {
    const error = buffer.find((e) => e.type === LogEntryType.ERROR);

    return {
      error_message: error?.data?.message,
    };
  }
}
