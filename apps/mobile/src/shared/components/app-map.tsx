import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";

import { theme } from "../constants/theme";
import { buildMapRegion, toMapPolygonShapes, type MapRegion } from "../maps/geo";
import { AppText } from "./app-text";
import type { AppMapProps } from "./app-map.types";

const DEFAULT_REGION: MapRegion = {
  latitude: -9.189967,
  longitude: -75.015152,
  latitudeDelta: 6,
  longitudeDelta: 6
};

const DEFAULT_POINT_COLOR = theme.colors.primary;
const DEFAULT_POLYGON_STROKE = theme.colors.primary;
const DEFAULT_POLYGON_FILL = "rgba(45, 106, 79, 0.18)";

type SelectedFeature = {
  key: string;
  title?: string;
  description?: string;
} | null;

export function AppMap({
  points = [],
  polygons = [],
  minHeight = 280,
  emptyMessage = "No hay geodatos disponibles."
}: AppMapProps) {
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string | null>(null);
  const hasFeatures = points.length > 0 || polygons.length > 0;
  const region = useMemo(
    () =>
      buildMapRegion(
        points.map((item) => item.geometry),
        polygons.map((item) => item.geometry)
      ) ?? DEFAULT_REGION,
    [points, polygons]
  );
  const featureKey = useMemo(
    () =>
      JSON.stringify({
        points: points.map((item) => [item.id, item.geometry.coordinates]),
        polygons: polygons.map((item) => [item.id, item.geometry.coordinates])
      }),
    [points, polygons]
  );
  const selectedFeature = useMemo(
    () =>
      resolveSelectedFeature(selectedFeatureKey, points, polygons) ??
      getDefaultSelectedFeature(points, polygons),
    [points, polygons, selectedFeatureKey]
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.mapFrame, { height: minHeight }]}>
        <MapView initialRegion={region} key={featureKey || "empty"} style={styles.map}>
          {polygons.flatMap((polygon) =>
            toMapPolygonShapes(polygon.geometry).map((shape, index) => (
              <Polygon
                coordinates={shape.coordinates}
                fillColor={polygon.fillColor ?? DEFAULT_POLYGON_FILL}
                holes={shape.holes.length > 0 ? shape.holes : undefined}
                key={`${polygon.id}-${index}`}
                onPress={() => setSelectedFeatureKey(`polygon:${polygon.id}`)}
                strokeColor={polygon.strokeColor ?? DEFAULT_POLYGON_STROKE}
                tappable
              />
            ))
          )}

          {points.map((point) => (
            <Marker
              coordinate={{
                latitude: point.geometry.coordinates[1],
                longitude: point.geometry.coordinates[0]
              }}
              description={point.description}
              key={point.id}
              onPress={() => setSelectedFeatureKey(`point:${point.id}`)}
              pinColor={point.pinColor ?? DEFAULT_POINT_COLOR}
              title={point.title}
            />
          ))}
        </MapView>

        {!hasFeatures ? (
          <View style={styles.emptyState}>
            <AppText variant="muted">{emptyMessage}</AppText>
          </View>
        ) : null}
      </View>

      {hasFeatures && (selectedFeature?.title || selectedFeature?.description) ? (
        <View style={styles.infoCard}>
          <AppText variant="label">
            {selectedFeature.title || "Elemento georreferenciado"}
          </AppText>
          {selectedFeature.description ? (
            <AppText variant="caption">{selectedFeature.description}</AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12
  },
  mapFrame: {
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surfaceElevated
  },
  map: {
    flex: 1
  },
  emptyState: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  },
  infoCard: {
    gap: 4,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  }
});

function buildSelectedFeature(
  key: string,
  title?: string,
  description?: string
): SelectedFeature {
  if (!title && !description) {
    return null;
  }

  return {
    key,
    title,
    description
  };
}

function getDefaultSelectedFeature(
  points: AppMapProps["points"],
  polygons: AppMapProps["polygons"]
) {
  if (points?.[0]) {
    return buildSelectedFeature(
      `point:${points[0].id}`,
      points[0].title,
      points[0].description
    );
  }

  if (polygons?.[0]) {
    return buildSelectedFeature(
      `polygon:${polygons[0].id}`,
      polygons[0].title,
      polygons[0].description
    );
  }

  return null;
}

function resolveSelectedFeature(
  key: string | null,
  points: AppMapProps["points"],
  polygons: AppMapProps["polygons"]
) {
  if (!key) {
    return null;
  }

  if (key.startsWith("point:")) {
    const pointId = key.slice("point:".length);
    const point = points?.find((item) => item.id === pointId);

    return point ? buildSelectedFeature(key, point.title, point.description) : null;
  }

  if (key.startsWith("polygon:")) {
    const polygonId = key.slice("polygon:".length);
    const polygon = polygons?.find((item) => item.id === polygonId);

    return polygon ? buildSelectedFeature(key, polygon.title, polygon.description) : null;
  }

  return null;
}
