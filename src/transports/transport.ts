import { LogEntry } from "../log-entry";

export interface Transport {
  send(payload: LogEntry): void;
}
