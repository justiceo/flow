import fs from "fs/promises";
import path from "path";
import { LogEntry } from "../log-entry";
import { Transport } from "./transport";

export class FileTransport implements Transport {
  private logDirectory: string;

  constructor(logDirectory: string = "./data") {
    this.logDirectory = logDirectory;
  }

  async send(payload: LogEntry): Promise<void> {
    const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
    const logFilePath = path.join(this.logDirectory, logFileName);

    try {
      await fs.mkdir(this.logDirectory, { recursive: true });

      await fs.appendFile(logFilePath, JSON.stringify(payload) + "\n");
    } catch (err) {
      console.error("Error writing to log file:", err);
    }
  }
}
