import type {
  ConnectivityPolicySnapshot,
  NetworkRequestPolicy
} from "./connectivity-types";

const DEFAULT_POLICY: ConnectivityPolicySnapshot = {
  effectiveMode: "online",
  isPhysicallyOnline: true,
  preference: "automatic"
};

let currentPolicy = DEFAULT_POLICY;

export function getConnectivityPolicySnapshot() {
  return currentPolicy;
}

export function setConnectivityPolicySnapshot(snapshot: ConnectivityPolicySnapshot) {
  currentPolicy = snapshot;
}

export function isNetworkRequestAllowed(policy: NetworkRequestPolicy) {
  if (!currentPolicy.isPhysicallyOnline) {
    return false;
  }

  if (policy === "essential") {
    return true;
  }

  if (policy === "probe") {
    return currentPolicy.preference === "automatic";
  }

  return currentPolicy.effectiveMode === "online";
}

export function resetConnectivityPolicyForTests() {
  currentPolicy = DEFAULT_POLICY;
}
