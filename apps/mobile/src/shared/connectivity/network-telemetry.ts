import type { NetworkObservation } from "./connectivity-types";

type NetworkObservationListener = (observation: NetworkObservation) => void;

const listeners = new Set<NetworkObservationListener>();

export function publishNetworkObservation(observation: NetworkObservation) {
  for (const listener of listeners) {
    try {
      listener(observation);
    } catch {
      // El diagnostico de red nunca debe romper la request observada.
    }
  }
}

export function subscribeToNetworkObservations(listener: NetworkObservationListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
