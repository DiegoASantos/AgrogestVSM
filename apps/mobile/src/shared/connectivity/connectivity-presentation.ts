import type { EffectiveNetworkMode, NetworkQuality } from "./connectivity-types";

export type ConnectivityPresentation = {
  banner: string | null;
  description: string;
  icon: "cellular-outline" | "cloud-offline-outline" | "speedometer-outline" | "wifi";
  title: string;
  variant: "success" | "warning";
};

export function getConnectivityPresentation(input: {
  effectiveMode: EffectiveNetworkMode;
  isPhysicallyOnline: boolean;
  quality: NetworkQuality;
}): ConnectivityPresentation {
  if (!input.isPhysicallyOnline || input.quality === "none") {
    return {
      banner: "Sin conexion. Tus cambios se guardan en el dispositivo.",
      description: "Tus cambios se guardan localmente",
      icon: "cloud-offline-outline",
      title: "Sin internet",
      variant: "warning"
    };
  }

  if (input.effectiveMode === "offline_manual") {
    return {
      banner:
        "Modo offline seleccionado por ti. Recuerda volver a automatico cuando tengas buena conexion.",
      description: "Seleccionado por ti",
      icon: "cloud-offline-outline",
      title: "Offline manual",
      variant: "warning"
    };
  }

  if (input.effectiveMode === "offline_auto" || input.quality === "unstable") {
    return {
      banner: "Conexion lenta o inestable. AgroGest esta trabajando con datos locales.",
      description: "Trabajando con datos locales",
      icon: "speedometer-outline",
      title: "Conexion inestable",
      variant: "warning"
    };
  }

  if (input.quality === "checking") {
    return {
      banner: null,
      description: "Validando conectividad",
      icon: "cellular-outline",
      title: "Comprobando red",
      variant: "warning"
    };
  }

  return {
    banner: null,
    description: "Conexion estable",
    icon: "wifi",
    title: "Online",
    variant: "success"
  };
}
