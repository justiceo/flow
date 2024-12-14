/**
 * This file defines the `FirestoreTransport` class, which is responsible for
 * sending log entries to a Firestore database. It leverages Firebase for storing
 * log data in a structured and scalable way.
 *
 */

import { initializeApp } from "firebase/app"; // Firebase app initialization
import { getFirestore, doc, setDoc, Firestore } from "firebase/firestore"; // Firestore methods for database interaction
import dotenv from "dotenv";
import { Transport } from "./transport"; // Interface or base class for defining transport methods
import { LogEntry } from "../log-entry"; // Definition of the log entry payload

dotenv.config();

// Firebase configuration object containing credentials and project details
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Class representing a Firestore transport for sending log entries
export class FirestoreTransport implements Transport {
  /**
   * Sends a log entry to a Firestore collection.
   *
   * @param {LogEntry} payload - The log entry to send. It must contain a `requestId` field.
   */
  async send(payload: LogEntry) {
    // Initialize Firebase application
    const app = initializeApp(firebaseConfig);

    // Initialize Firestore database instance
    const db: Firestore = getFirestore(app);

    // Ensure the `requestId` field exists in the payload
    if (!payload.requestId) {
      console.error("Error: requestId is undefined");
      return;
    }

    // Sanitize the payload by replacing undefined values with `null`
    const sanitizedPayload = JSON.parse(
      JSON.stringify(
        payload,
        (key, value) => (value === undefined ? null : value), // Replace `undefined` values with `null`
      ),
    );

    try {
      // Create a Firestore document reference using the `requestId`
      const docRef = doc(db, "log-entries", payload.requestId);

      // Save the sanitized payload to the Firestore collection
      await setDoc(docRef, sanitizedPayload);

      // Log a success message
      console.log("Log entry sent successfully");
    } catch (error) {
      // Log errors to the console
      console.log("Error sending log entry ", error);
    }
  }
}
