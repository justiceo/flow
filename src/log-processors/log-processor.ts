import { BufferEntry, Request, Response, FunctionCall, Meta } from "../log-entry";

/** LogProcessor converts buffer entry from model-specific format to a standard format. */
export interface LogProcessor {
  canHandleRequest(request: Readonly<BufferEntry>): Promise<boolean>;

  processRequest(buffer: Readonly<BufferEntry[]>): Promise<Request>;
  processResponse(buffer: Readonly<BufferEntry[]>): Promise<Response>;
  processFunctionCalls(buffer: Readonly<BufferEntry[]>): Promise<FunctionCall[]>;
  processMeta(buffer: Readonly<BufferEntry[]>): Promise<Meta>;
}
