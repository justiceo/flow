import fs from "fs/promises";
import path from "path";
import { LogEntry } from "./log-entry";
import { db } from "./firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

import dotenv from "dotenv";
dotenv.config();

export const consoleTransport = (logEntry: LogEntry) => {
  console.log(logEntry);
};

export const fileTransport = async (logEntry: LogEntry) => {
  const logFileName = `${new Date().toISOString().split("T")[0]}.jsonl`;
  const logFilePath = path.join("./data", logFileName);
  
  await fs.appendFile(logFilePath, JSON.stringify(logEntry) + "\n");
};



export const remoteLogsTransport = async (logEntry: LogEntry) => {
  if (!logEntry.requestId) {
    console.error("Error: requestId is undefined");
    return;
  }
  
  try {
    const docRef = doc(db, "log-entries", logEntry.requestId);
    await setDoc(docRef, logEntry);
    console.log("Log entry sent successfully");
  } catch (error) {
    console.error("Error sending log entry ", error);
  }
};


