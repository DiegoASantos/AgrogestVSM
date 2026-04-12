import * as Location from "expo-location";

import type { GeoJsonPointGeometry } from "../maps/geo";

export type CapturedDeviceLocation = {
  point: GeoJsonPointGeometry;
  accuracyMeters: number | null;
};

export async function captureCurrentDeviceLocation(): Promise<CapturedDeviceLocation> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    throw new Error("Activa la ubicacion del dispositivo e intentalo de nuevo.");
  }

  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Debes permitir el acceso a la ubicacion para registrar la visita.");
  }

  const currentLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced
  });
  const { latitude, longitude, accuracy } = currentLocation.coords;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("No se pudo obtener una ubicacion valida.");
  }

  return {
    point: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    accuracyMeters:
      typeof accuracy === "number" && Number.isFinite(accuracy)
        ? Math.round(accuracy)
        : null
  };
}
