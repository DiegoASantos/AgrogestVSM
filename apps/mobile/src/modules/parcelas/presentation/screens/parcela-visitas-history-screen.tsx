import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppDetailRow,
  AppEmptyState,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { toApiError } from "../../../../shared/services";
import { parcelasService } from "../../services";
import type { Parcela } from "../../types";
import { visitasCampoService } from "../../../visitas-campo/services";
import type { VisitaCampo } from "../../../visitas-campo/types";

export function ParcelaVisitasHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const parcelaId = toSingleParam(params.id);

  const [parcela, setParcela] = useState<Parcela | null>(null);
  const [visitas, setVisitas] = useState<VisitaCampo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!parcelaId) {
        setIsLoading(false);
        setError("No se recibio una parcela valida.");
        return;
      }

      void loadData(parcelaId);
    }, [parcelaId])
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppCard>
          <AppHeader
            title="Historial de visitas"
            subtitle={
              parcela
                ? `${parcela.code}${parcela.name ? ` - ${parcela.name}` : ""}`
                : "Cargando parcela..."
            }
          />
          {parcela ? (
            <AppDetailRow
              label="Total de visitas"
              value={`${visitas.length}`}
            />
          ) : null}
        </AppCard>

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando historial...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error" subtitle={error} />
            <AppButton label="Reintentar" onPress={() => parcelaId && void loadData(parcelaId)} />
          </AppCard>
        ) : null}

        {!isLoading && !error && visitas.length === 0 ? (
          <AppCard>
            <AppEmptyState
              title="Sin visitas registradas"
              message="Aun no has registrado visitas para esta parcela."
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && visitas.length > 0
          ? visitas.map((visita) => (
              <Pressable
                key={visita.id}
                onPress={() =>
                  router.push({
                    pathname: "/visitas-campo/[id]",
                    params: { id: visita.id }
                  })
                }
                style={({ pressed }) => [
                  styles.cardPressable,
                  pressed ? styles.cardPressed : null
                ]}
              >
                <AppCard>
                  <View style={styles.row}>
                    <AppHeader
                      title={formatVisitDate(visita.visitDate)}
                      subtitle={
                        visita.nroFicha
                          ? `Ficha ${visita.nroFicha}`
                          : `Publico ${visita.publicId}`
                      }
                      style={styles.headerText}
                    />
                    <AppStatusBadge
                      label={syncLabel(visita.syncStatus)}
                      variant={syncVariant(visita.syncStatus)}
                    />
                  </View>

                  <View style={styles.details}>
                    <AppDetailRow
                      label="Inicio"
                      value={visita.startVisitTime}
                    />
                    <AppDetailRow
                      label="Fin"
                      value={visita.endVisitTime ?? "Sin registrar"}
                    />
                    <AppDetailRow
                      label="Observacion"
                      value={visita.generalObservation || "Sin observacion"}
                    />
                  </View>
                </AppCard>
              </Pressable>
            ))
          : null}

        <View style={styles.actions}>
          <AppButton
            label="Volver"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  async function loadData(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const [nextParcela, nextVisitas] = await Promise.all([
        parcelasService.getById(id),
        visitasCampoService.getByParcelaId(id)
      ]);
      setParcela(nextParcela);
      setVisitas(nextVisitas);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el historial.");
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

function formatVisitDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function syncLabel(status: VisitaCampo["syncStatus"]) {
  if (status === "synced") {
    return "Sincronizada";
  }

  if (status === "error") {
    return "Con error";
  }

  return "Pendiente";
}

function syncVariant(status: VisitaCampo["syncStatus"]) {
  if (status === "synced") {
    return "success" as const;
  }

  if (status === "error") {
    return "error" as const;
  }

  return "warning" as const;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    gap: 16
  },
  cardPressable: {
    borderRadius: 12
  },
  cardPressed: {
    opacity: 0.85
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerText: {
    flex: 1
  },
  details: {
    gap: 2,
    marginTop: 8
  },
  actions: {
    gap: 10,
    paddingBottom: 12
  }
});
