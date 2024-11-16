// System packages
import fs from "fs/promises";
import path from "path";

// Local dependencies
import { LogEntry } from "../log-entry";

// Third party packages
import dotenv from "dotenv";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

dotenv.config();

// TODO: Update these to implement the Transport interface.
export const consoleTransport = (logEntry: LogEntry) => {
  console.log(logEntry);
};

export const fileTransport = async (logEntry: LogEntry) => {
  const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
  const logFilePath = path.join("./data", logFileName);

  await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");
};

// TODO: Add a transport for json array - like jsonl but as an array to valid .json file.
