import os from 'os';
import { machineIdSync } from 'node-machine-id';
import { BufferEntry, Request, LogEntryType, Response, FunctionCall, Meta } from "../log-entry";
import { getModelCost } from "../costs/cost";

export class Llamalog {
  processRequest(buffer: Readonly<BufferEntry[]>): Request | {} {
    const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);
    const request = buffer.find((e) => e.type === LogEntryType.REQUEST);

    return {
      prompt: prompt?.data?.prompt,
      systemPrompt: request?.data?.systemPrompt,
      model: request?.data?.model,
      temperature: request?.data?.temperature,
      topK: request?.data?.top_k,
      topP: request?.data?.top_p,
      functionCalls: request?.data?.tools,
      maxTokens: request?.data?.max_tokens,
      tokenCount: request?.data?.systemPrompt?.split("").length,
      errorReason: "",
      outputMode: request?.data?.outputMode,
    };
  }

  processResponse(buffer: Readonly<BufferEntry[]>): Response | {} {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);

    return {
      text: response?.data?.choices[0].message.content,
      finishReason: response?.data?.choices[0].finish_reason,
      completionTime: response?.timestamp,
      tokenCount: response?.data?.usage?.total_tokens,
      status: 200,
      startTime: response?.data?.start_time,
      endTime: response?.data?.end_time,
      errorReason: "",
    };
  }

  processFunctionCalls(buffer: Readonly<BufferEntry[]>): FunctionCall[] {
    const functionCalls = buffer
      .filter((e) => e.type === LogEntryType.FUNCTION_CALL)
      .map((entry) => ({
        name: entry?.data?.name,
        args: entry?.data?.arguments,
        exitCode: entry?.data?.exitCode,
        startTime: entry?.data?.start_time,
        endTime: entry?.data?.end_time,
        result: entry?.data?.result,
      }));

    return functionCalls;
  }


  async processMeta(buffer: Readonly<BufferEntry[]>){
    const model = buffer.find((entry) => entry.type === LogEntryType.REQUEST)?.data?.model;
    const modelCost = await getModelCost(model);
    const tokenCount = buffer.find((entry) => entry.type === LogEntryType.RESPONSE)?.data?.usage.total_tokens;

    return {
      totalTokenCount:  tokenCount,
      inputTokenCost1k: modelCost?.tokensInCost,
      outputTokenCost1k: modelCost?.tokensOutCost,
      triggerSource: "",
      // outputMode: metaDetails?.data?.data?.outputMode,
      userId: "",
      country: "",
      operatingSystem: `${os.platform()}/${os.release()}`,
      shell: os.userInfo().shell || 'Unknown',
      userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      memory: 0,
      machineId: machineIdSync(),
      env: process.env.NODE_ENV || 'development',
    };
  }
}