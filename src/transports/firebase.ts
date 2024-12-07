// Third party dependencies
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, Firestore } from "firebase/firestore";
import dotenv from "dotenv";
import { Transport } from "./transport";

// Local dependencies
import { LogEntry } from "../log-entry";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

export class FirestoreTransport implements Transport {
  async send(payload: LogEntry) {
    console.log("payload", payload);
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db: Firestore = getFirestore(app);
    if (!payload.requestId) {
      console.error("Error: requestId is undefined");
      return;
    }

    // Sanitize the payload: Replace all undefined values with `null`
    const sanitizedPayload = JSON.parse(
      JSON.stringify(payload, (key, value) =>
        value === undefined ? null : value,
      ),
    );

    try {
      const docRef = doc(db, "log-entries", payload.requestId);

      await setDoc(docRef, sanitizedPayload);
      console.log("Log entry sent successfully");
    } catch (error) {
      console.log("Error sending log entry ", error);
      console.error("Error sending log entry ", error);
    }
  }
}
