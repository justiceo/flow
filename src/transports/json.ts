/**
 * This file defines the `JsonArrayTransport` class, which is responsible for
 * persisting log entries as an array of JSON objects in a file system.
 *
 */

import fs from "fs/promises";
import path from "path";
import { LogEntry } from "../log-entry"; // Log entry type definition
import { Transport } from "./transport"; // Transport interface for logging implementations

// Class representing a transport method that stores log entries in a JSON array file
export class JsonArrayTransport implements Transport {
  private logDirectory: string;

  /**
   * Constructor for the `JsonArrayTransport` class.
   *
   * @param {string} logDirectory - Directory path where log files will be stored. Defaults to `./data`.
   */
  constructor(logDirectory: string = "./data") {
    this.logDirectory = logDirectory;
  }

  /**
   * Sends a log entry by appending it to a JSON file.
   *
   * @param {LogEntry} payload - The log entry to save.
   * @returns {Promise<void>} A promise that resolves once the log entry has been written.
   */
  async send(payload: LogEntry): Promise<void> {
    // Generate a file name based on the current date
    const logFileName = `${new Date().toISOString().split("T")[0]}.json`;
    const logFilePath = path.join(this.logDirectory, logFileName);

    try {
      // Create the log directory if it doesn't exist
      await fs.mkdir(this.logDirectory, { recursive: true });

      let logArray: LogEntry[] = [];
      try {
        // Read the existing log file if it exists
        const fileContent = await fs.readFile(logFilePath, "utf8");
        logArray = JSON.parse(fileContent); // Parse existing log entries
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("Error reading the JSON file:", err);
          throw err;
        }
      }

      // Add the new log entry to the array
      logArray.push(payload);

      // Write the updated log array back to the file
      await fs.writeFile(logFilePath, JSON.stringify(logArray, null, 2));
    } catch (err) {
      // Log any errors encountered during the write process
      console.error("Error writing to JSON file:", err);
    }
  }
}
