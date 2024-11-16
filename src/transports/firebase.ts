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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);

export class FirestoreTransport implements Transport {
  async send(payload: LogEntry) {
    if (!payload.requestId) {
      console.error("Error: requestId is undefined");
      return;
    }

    try {
      const docRef = doc(db, "log-entries", payload.requestId);
      await setDoc(docRef, payload);
      console.log("Log entry sent successfully");
    } catch (error) {
      console.error("Error sending log entry ", error);
    }
  }
}

const transport = new FirestoreTransport();
transport.send({
  requestId: "m3jph1ta3k15llzrxox",
  sessionId: "m3jph1ta3k15llzrxox",
  request: {
    prompt: "What's the weather in Ikorodu, Lagos?",
    model: "gpt-4o-mini",
    temperature: 0.7,
    topP: 0,
    maxTokens: 150,
    errorReason: "",
  },
  response: {
    finishReason: "function_call",
    tokenCount: 85,
    status: 200,
    errorReason: "",
  },
  functionCalls: [{ name: "getWeather" }],
  meta: {
    totalTokenCount: 85,
    inputTokenCost1k: 0.0015,
    outputTokenCost1k: 0.006,
    triggerSource: "",
    userId: "",
    locale: "en-US",
    userTimeZone: "America/Los_Angeles",
    operatingSystem: "darwin/23.1.0",
    shell: "/bin/zsh",
    memory: 0,
    machineId:
      "b54b5520aaabea2a154763eeff5ba3cf72c05c576d81d9bd37aa8714e717de20",
    env: "test",
  },
});
