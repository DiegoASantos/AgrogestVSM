import { useContext } from "react";

import { ConnectivityContext } from "./connectivity-context";

export function useConnectivity() {
  const context = useContext(ConnectivityContext);

  if (!context) {
    throw new Error("useConnectivity must be used within a ConnectivityProvider.");
  }

  return context;
}
