import os from 'os';
import { machineIdSync } from 'node-machine-id';
import { BufferEntry,LogEntryType, Request, Response, FunctionCall, Meta } from "../log-entry";
import { getModelCost } from "../costs/cost";
;

export class GeminiLog {
 processRequest(buffer: Readonly<BufferEntry[]>): Request | {} {
   const prompt = buffer.find((e) => e.type === LogEntryType.PROMPT);
   const request = buffer.find((e) => e.type === LogEntryType.REQUEST);


   return {
     prompt: prompt?.data?.prompt,
     model: request?.data?.model,
     temperature: request?.data?.generationConfig.temperature,
     // maxTokens: request?.data?.max_tokens,
     maxOutputTokens: request?.data?.generationConfig.maxOutputTokens,
     topP: request?.data?.generationConfig.topP,
     topK: request?.data?.generationConfig.topK,
     systemPrompt: request?.data?.systemPrompt,
     outputMode: request?.data?.outputMode,
   };
 }


 processResponse(buffer: Readonly<BufferEntry[]>): Response | {} {
   const response = buffer.find((e) => e.type === LogEntryType.RESPONSE);


   return {
     text: response?.data?.text() ? response?.data?.text() : "",
     finishReason: response?.data?.candidates[0]?.finishReason,
     completionTime: response?.timestamp,
     tokenCount: response?.data?.usageMetadata.totalTokenCount,
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


 async processMeta(buffer: Readonly<BufferEntry[]>){
  const model = buffer.find((entry) => entry.type === LogEntryType.REQUEST)?.data?.model;
  const modelCost = await getModelCost(model);
  const tokenCount = buffer.find((entry) => entry.type === LogEntryType.RESPONSE)?.data?.usageMetadata.totalTokenCount;

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
