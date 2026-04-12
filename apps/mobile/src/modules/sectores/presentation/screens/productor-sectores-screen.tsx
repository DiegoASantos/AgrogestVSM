import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { sectoresService } from "../../services";
import type { Sector } from "../../types";

export function ProductorSectoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productorId?: string | string[];
    documentNumber?: string | string[];
  }>();
  const productorId = toSingleParam(params.productorId);
  const documentNumber = toSingleParam(params.documentNumber);

  const [sectores, setSectores] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productorId) {
      setIsLoading(false);
      setError("No se recibio un productor valido para listar sectores.");
      return;
    }

    void loadSectores(productorId);
  }, [productorId]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />

      {documentNumber ? (
        <AppText variant="muted">Productor {documentNumber}</AppText>
      ) : null}

      {isLoading ? (
        <AppCard>
          <AppText variant="muted">Cargando sectores...</AppText>
        </AppCard>
      ) : null}

      {!isLoading && error ? (
        <AppCard>
          <AppHeader title="Error al cargar" subtitle={error} />
          <AppButton
            label="Reintentar"
            onPress={() => {
              if (productorId) {
                void loadSectores(productorId);
              }
            }}
          />
        </AppCard>
      ) : null}

      {!isLoading && !error && sectores.length === 0 ? (
        <AppEmptyState
          title="Sin sectores"
          message="Este productor aun no tiene sectores registrados."
        />
      ) : null}

      {!isLoading && !error && sectores.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={sectores}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/sectores/[id]/parcelas",
                  params: {
                    id: item.id,
                    sectorName: item.name
                  }
                })
              }
              style={({ pressed }) => [
                styles.itemCard,
                pressed && styles.itemCardPressed
              ]}
            >
              <View style={styles.itemHeader}>
                <AppText variant="heading">{item.name}</AppText>
                <AppStatusBadge
                  label={item.isActive ? "Activo" : "Inactivo"}
                  variant={item.isActive ? "success" : "neutral"}
                />
              </View>
              <AppText variant="muted">
                {item.description || "Sin descripcion"}
              </AppText>
            </Pressable>
          )}
        />
      ) : null}
    </ScreenContainer>
  );

  async function loadSectores(nextProductorId: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextSectores = await sectoresService.getByProductorId(nextProductorId);
      setSectores(nextSectores);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el listado de sectores.");
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
  }
});
