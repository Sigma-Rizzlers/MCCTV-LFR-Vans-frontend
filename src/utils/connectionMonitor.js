import { checkHealth } from "../api/services";

let online = true;
const POLL_INTERVAL = 30000;

async function checkConnection() {
  try {
    await checkHealth();
    if (!online) {
      online = true;
      window.dispatchEvent(new CustomEvent("api:online"));
    }
  } catch {
    if (online) {
      online = false;
      window.dispatchEvent(new CustomEvent("api:offline"));
    }
  }
}

export function startConnectionMonitor() {
  checkConnection();
  return setInterval(checkConnection, POLL_INTERVAL);
}

export function stopConnectionMonitor(intervalId) {
  clearInterval(intervalId);
}

export function isApiOnline() {
  return online;
}
