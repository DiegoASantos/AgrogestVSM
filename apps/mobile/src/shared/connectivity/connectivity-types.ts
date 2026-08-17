export type NetworkPreference = "automatic" | "offline";

export type NetworkQuality = "checking" | "stable" | "unstable" | "none";

export type EffectiveNetworkMode = "online" | "offline_auto" | "offline_manual";

export type NetworkRequestPolicy = "standard" | "essential" | "probe";

export type ConnectivityPolicySnapshot = {
  effectiveMode: EffectiveNetworkMode;
  isPhysicallyOnline: boolean;
  preference: NetworkPreference;
};

export type NetworkObservation = {
  durationMs: number;
  policy: NetworkRequestPolicy;
  success: boolean;
};
