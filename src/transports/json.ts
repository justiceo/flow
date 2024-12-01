import fs from "fs/promises";
import path from "path";
import { LogEntry } from "../log-entry";
import { Transport } from "./transport";

export class JsonArrayTransport implements Transport {
  private logDirectory: string;

  constructor(logDirectory: string = "./data") {
    this.logDirectory = logDirectory;
  }

  async send(payload: LogEntry): Promise<void> {
    const logFileName = `${new Date().toISOString().split("T")[0]}.json`;
    const logFilePath = path.join(this.logDirectory, logFileName);

    try {
      // Create the log directory if it doesn't exist
      await fs.mkdir(this.logDirectory, { recursive: true });

      let logArray: LogEntry[] = [];
      try {
        const fileContent = await fs.readFile(logFilePath, "utf8");
        logArray = JSON.parse(fileContent);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Error reading the JSON file:", err);
          throw err;
        }
      }

      logArray.push(payload);

      await fs.writeFile(logFilePath, JSON.stringify(logArray, null, 2));
    } catch (err) {
      console.error("Error writing to JSON file:", err);
    }
  }
}
