import {
  BufferEntry,
  Request,
  Response,
  FunctionCallResult,
  Meta,
  Error,
} from "../log-entry";

/** LogProcessor converts buffer entry from model-specific format to a standard format. */
export interface LogProcessor {
  canHandleRequest(request: Readonly<BufferEntry>): Promise<boolean>;
  processRequest(buffer: Readonly<BufferEntry[]>): Promise<Request>;
  processResponse(buffer: Readonly<BufferEntry[]>): Promise<Response>;
  processFunctionCallResult(
    buffer: Readonly<BufferEntry[]>,
  ): Promise<FunctionCallResult>;
  processMeta(buffer: Readonly<BufferEntry[]>): Promise<Meta>;
  processError(buffer: Readonly<BufferEntry[]>): Promise<Error>;
}
