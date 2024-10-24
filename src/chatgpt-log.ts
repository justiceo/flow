import { start } from "repl";
import { LogEntryType } from "./const";
import { LogEntry, BufferEntry, Request, Response, FunctionCall, Meta } from "./log-entry";



// ChatGptLog class in TypeScript
export class ChatGptLog {
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
      functionCalls: request?.data?.functions,
      maxTokens: request?.data?.max_tokens,
      startTime: request?.data.startTime,
      sentTime: request?.data?.sentTime,
      tokenCount: request?.data?.systemPrompt?.split("").length,
      errorReason: "",
      outputMode: request?.data?.outputMode,
    };
  }

  processResponse(buffer: Readonly<BufferEntry[]>): Response | {} {
    const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);

    return {
      text: response?.data?.choices[0].content,
      finishReason: response?.data?.choices[0].finish_reason,
      completionTime: response?.timestamp,
      tokenCount: response?.data?.usage.total_tokens,
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
        args: entry?.data?.args,
        exitCode: entry?.data?.exitCode,
        startTime: entry?.data?.start_time,
        endTime: entry?.data?.end_time,
        result: entry?.data?.result,
      }));

    return functionCalls;
  }


  processMeta(buffer: Readonly<BufferEntry[]>): Meta {
    const metaDetails = buffer.find((entry) => entry.type === LogEntryType.CUSTOM);    
    return {
      totalTokenCount: metaDetails?.data?.data?.totalTokenCount,
      inputTokenCost1k: metaDetails?.data?.data?.inputTokenCost1k,
      outputTokenCost1k: metaDetails?.data?.data?.outputTokenCost1k,
      triggerSource: metaDetails?.data?.data?.triggerSource,
      outputMode: metaDetails?.data?.data?.outputMode,
      userId: metaDetails?.data?.data?.userId,
      country: metaDetails?.data?.data?.country,
      operatingSystem: metaDetails?.data?.data?.operatingSystem,
      shell: metaDetails?.data?.data?.shell,
      userTimeZone: metaDetails?.data?.data?.userTimeZone,
      memory: metaDetails?.data?.data?.memory,
      machineId: metaDetails?.data?.data?.machineId,
      env: metaDetails?.data?.data?.env,
    };
  }
}
