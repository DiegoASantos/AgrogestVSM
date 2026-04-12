import { StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";
import type { AppMapProps } from "./app-map.types";

export function AppMap({
  points = [],
  polygons = [],
  minHeight = 280,
  emptyMessage = "No hay geodatos disponibles."
}: AppMapProps) {
  const hasFeatures = points.length > 0 || polygons.length > 0;
  const firstFeature = points[0] ?? polygons[0] ?? null;

  return (
    <View style={[styles.surface, { minHeight }]}>
      <AppText variant="label">Vista de mapa</AppText>
      <AppText variant="caption">
        {hasFeatures
          ? `${points.length} punto(s) y ${polygons.length} poligono(s) listos para visualizar en dispositivo nativo.`
          : emptyMessage}
      </AppText>
      {firstFeature?.title ? (
        <View style={styles.infoCard}>
          <AppText variant="label">{firstFeature.title}</AppText>
          {firstFeature.description ? (
            <AppText variant="caption">{firstFeature.description}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    gap: 12,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surfaceElevated
  },
  infoCard: {
    gap: 4,
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface
  }
});
