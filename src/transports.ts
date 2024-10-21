import fs from "fs/promises";
import path from "path";
import { LogEntry } from "./log-entry";

export const consoleTransport = (logEntry: LogEntry) => {
  console.log(logEntry);
};

export const fileTransport = async (logEntry: LogEntry) => {
  const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
  const logFilePath = path.join("./data", logFileName);
  
  await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");
};

export const remoteLogsTransport = (logEntry: LogEntry) => {
  // upload to remote logs storage service like sentry
};
