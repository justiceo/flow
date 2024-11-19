import { LogEntry } from "../log-entry";
import { Transport } from "./transport";

export class ConsoleTransport implements Transport {
  send(payload: LogEntry): void {
    console.log("Console Transport:");
    console.log(payload);
  }
}
