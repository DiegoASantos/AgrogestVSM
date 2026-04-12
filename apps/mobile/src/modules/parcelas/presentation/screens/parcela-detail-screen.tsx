import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppMap,
  AppButton,
  AppCard,
  AppDetailRow,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { toApiError } from "../../../../shared/services";
import { parcelasService } from "../../services";
import type { Parcela } from "../../types";

export function ParcelaDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const parcelaId = toSingleParam(params.id);

  const [parcela, setParcela] = useState<Parcela | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parcelaId) {
      setIsLoading(false);
      setError("No se recibio una parcela valida.");
      return;
    }

    void loadParcela(parcelaId);
  }, [parcelaId]);

  const mapPoints = useMemo(() => {
    if (!parcela?.referencePoint) {
      return [];
    }

    return [
      {
        id: `parcela-point-${parcela.id}`,
        geometry: parcela.referencePoint,
        title: buildParcelaMapTitle(parcela),
        description: "Punto de referencia de la parcela.",
        pinColor: "#2d6a4f"
      }
    ];
  }, [parcela]);

  const mapPolygons = useMemo(() => {
    if (!parcela?.geometry) {
      return [];
    }

    return [
      {
        id: `parcela-polygon-${parcela.id}`,
        geometry: parcela.geometry,
        title: buildParcelaMapTitle(parcela),
        description: buildParcelaMapDescription(parcela),
        strokeColor: "#2d6a4f",
        fillColor: "rgba(45, 106, 79, 0.18)"
      }
    ];
  }, [parcela]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />

      {isLoading ? (
        <AppCard>
          <AppText variant="muted">Cargando detalle de la parcela...</AppText>
        </AppCard>
      ) : null}

      {!isLoading && error ? (
        <AppCard>
          <AppHeader title="Error" subtitle={error} />
          <AppButton label="Volver" onPress={() => router.back()} />
        </AppCard>
      ) : null}

      {!isLoading && !error && parcela ? (
        <>
          <AppCard>
            <View style={styles.headerRow}>
              <AppHeader
                title={parcela.name}
                subtitle={`Codigo ${parcela.code}`}
                style={styles.headerText}
              />
              <AppStatusBadge
                label={parcela.isActive ? "Activa" : "Inactiva"}
                variant={parcela.isActive ? "success" : "neutral"}
              />
            </View>

            <View style={styles.details}>
              <AppDetailRow label="Codigo" value={parcela.code} />
              <AppDetailRow label="Nombre" value={parcela.name} />
              <AppDetailRow label="Area" value={formatArea(parcela.areaHectares)} />
              <AppDetailRow
                label="Geodatos"
                value={describeParcelaGeodata(parcela)}
              />
              <AppDetailRow
                label="Descripcion"
                value={parcela.description || "Sin descripcion"}
              />
              <AppDetailRow label="Public ID" value={parcela.publicId} />
            </View>
          </AppCard>

          <AppCard>
            <AppHeader
              title="Mapa de parcela"
              subtitle={
                parcela.geometry
                  ? "Visualizacion del poligono y punto de referencia."
                  : parcela.referencePoint
                    ? "Visualizacion del punto de referencia."
                    : "La parcela aun no tiene geodatos registrados."
              }
            />
            <AppMap
              emptyMessage="La parcela no tiene punto ni poligono registrado."
              points={mapPoints}
              polygons={mapPolygons}
            />
          </AppCard>

          <View style={styles.actions}>
            <AppButton
              label="Nueva visita de campo"
              onPress={() =>
                router.push({
                  pathname: "/parcelas/[id]/nueva-visita",
                  params: {
                    id: parcela.id,
                    parcelaCode: parcela.code,
                    parcelaName: parcela.name
                  }
                })
              }
            />
            <AppButton
              label="Volver"
              onPress={() => router.back()}
              variant="outline"
            />
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );

  async function loadParcela(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextParcela = await parcelasService.getById(id);
      setParcela(nextParcela);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el detalle.");
    } finally {
      setIsLoading(false);
    }
  }
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatArea(areaHectares: string | null) {
  if (!areaHectares) {
    return "Sin area registrada";
  }

  return `${areaHectares} ha`;
}

function describeParcelaGeodata(parcela: Parcela) {
  if (parcela.geometry && parcela.referencePoint) {
    return "Poligono y punto";
  }

  if (parcela.geometry) {
    return "Poligono";
  }

  if (parcela.referencePoint) {
    return "Punto";
  }

  return "Sin geodatos";
}

function buildParcelaMapTitle(parcela: Parcela) {
  return parcela.name ? `${parcela.code} - ${parcela.name}` : parcela.code;
}

function buildParcelaMapDescription(parcela: Parcela) {
  const details = [formatArea(parcela.areaHectares)];

  if (parcela.description) {
    details.push(parcela.description);
  }

  return details.join(" | ");
}

const styles = StyleSheet.create({
  container: {
    gap: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerText: {
    flex: 1
  },
  details: {
    gap: 2
  },
  actions: {
    gap: 10
  }
});
