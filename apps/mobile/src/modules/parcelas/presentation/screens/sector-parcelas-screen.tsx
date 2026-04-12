import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { parcelasService } from "../../services";
import type { Parcela } from "../../types";

export function SectorParcelasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    sectorName?: string | string[];
  }>();
  const sectorId = toSingleParam(params.id);
  const sectorName = toSingleParam(params.sectorName);

  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectorId) {
      setIsLoading(false);
      setError("No se recibio un sector valido para listar parcelas.");
      return;
    }

    void loadParcelas(sectorId);
  }, [sectorId]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />

      {sectorName ? (
        <AppText variant="muted">Sector {sectorName}</AppText>
      ) : null}

      {isLoading ? (
        <AppCard>
          <AppText variant="muted">Cargando parcelas...</AppText>
        </AppCard>
      ) : null}

      {!isLoading && error ? (
        <AppCard>
          <AppHeader title="Error al cargar" subtitle={error} />
          <AppButton
            label="Reintentar"
            onPress={() => {
              if (sectorId) {
                void loadParcelas(sectorId);
              }
            }}
          />
        </AppCard>
      ) : null}

      {!isLoading && !error && parcelas.length === 0 ? (
        <AppEmptyState
          title="Sin parcelas"
          message="Este sector aun no tiene parcelas registradas."
        />
      ) : null}

      {!isLoading && !error && parcelas.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={parcelas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/parcelas/[id]",
                  params: { id: item.id }
                })
              }
              style={({ pressed }) => [
                styles.itemCard,
                pressed && styles.itemCardPressed
              ]}
            >
              <View style={styles.itemHeader}>
                <AppText variant="heading">{item.name}</AppText>
                <AppText variant="caption" style={styles.codeTag}>
                  {item.code}
                </AppText>
              </View>
              <AppText variant="muted">
                {formatArea(item.areaHectares)}
              </AppText>
              <AppText variant="caption">
                {item.description || "Sin descripcion"}
              </AppText>
            </Pressable>
          )}
        />
      ) : null}
    </ScreenContainer>
  );

  async function loadParcelas(nextSectorId: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextParcelas = await parcelasService.getBySectorId(nextSectorId);
      setParcelas(nextParcelas);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el listado de parcelas.");
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

const styles = StyleSheet.create({
  container: {
    gap: 12
  },
  listContent: {
    gap: 10,
    paddingBottom: 24
  },
  itemCard: {
    gap: 6,
    padding: 16,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.sm
  },
  itemCardPressed: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primaryLight
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  codeTag: {
    backgroundColor: theme.colors.primaryMuted,
    color: theme.colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    fontWeight: "600",
    overflow: "hidden"
  }
});
