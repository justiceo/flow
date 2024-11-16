import { LogEntry } from "../log-entry";
import { Transport } from "./transport";

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const GA_DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect";

// Get via https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#recommended_parameters_for_reports
const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
const API_SECRET = process.env.GA_API_SECRET;
const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;
// Duration of inactivity after which a new session is created (for analytics purposes).
const SESSION_EXPIRATION_IN_MIN = 30;

// Make-shift in-memory storage.
// TODO: Replace with a proper storage solution.
class Storage {
  data: any = {};

  set(key: string, value: any) {
    this.data[key] = value;
  }

  get(key: string) {
    return this.data[key];
  }
}
const storage = new Storage();

export async function getOrCreateSessionId() {
  // Use storage.session because it is only in memory (recreated per browser session)
  let { sessionData } = storage.get("sessionData");
  const currentTimeInMs = Date.now();
  // Check if session exists and is still valid
  if (sessionData && sessionData.timestamp) {
    // Calculate how long ago the session was last updated
    const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
    // Check if last update lays past the session expiration threshold
    if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
      // Clear old session id to start a new session
      sessionData = null;
    } else {
      // Update timestamp to keep session alive
      sessionData.timestamp = currentTimeInMs;
      storage.set(sessionData, sessionData);
    }
  }
  if (!sessionData) {
    // Create and store a new session
    sessionData = {
      session_id: currentTimeInMs.toString(),
      timestamp: currentTimeInMs.toString(),
    };
    storage.set(sessionData, sessionData);
  }
  return sessionData.session_id;
}

declare var IS_DEV_BUILD: boolean;
export class GoogleAnalytics implements Transport {
  debug = IS_DEV_BUILD;

  send(payload: LogEntry) {
    this.fireEvent("log", payload);
  }

  // Returns the client id, or creates a new one if one doesn't exist.
  // Stores client id in local storage to keep the same client id as long as
  // the extension is installed.
  async getOrCreateClientId() {
    let { clientId } = storage.get("clientId");
    if (!clientId) {
      // Generate a unique client ID, the actual value is not relevant
      clientId = self.crypto.randomUUID();
      storage.set(clientId, clientId);
    }
    return clientId;
  }

  // Fires an event with optional params. Event names must only include letters and underscores.
  async fireEvent(name: string, params: any = {}) {
    // Configure session id and engagement time if not present, for more details see:
    // https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=gtag#recommended_parameters_for_reports
    if (!params.session_id) {
      params.session_id = getOrCreateSessionId();
    }
    if (!params.engagement_time_msec) {
      params.engagement_time_msec = DEFAULT_ENGAGEMENT_TIME_MSEC;
    }

    try {
      const response = await fetch(
        `${
          this.debug ? GA_DEBUG_ENDPOINT : GA_ENDPOINT
        }?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
        {
          method: "POST",
          body: JSON.stringify({
            client_id: await this.getOrCreateClientId(),
            events: [
              {
                name,
                params,
              },
            ],
          }),
        },
      );
      if (!this.debug) {
        return;
      }
      console.log(await response.text());
    } catch (e) {
      console.error("Google Analytics request failed with an exception", e);
    }
  }
}
