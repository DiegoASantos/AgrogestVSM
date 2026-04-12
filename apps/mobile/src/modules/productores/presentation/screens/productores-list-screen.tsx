import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppInput,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { productoresService } from "../../services";
import type { Productor } from "../../types";

export function ProductoresListScreen() {
  const router = useRouter();
  const [productores, setProductores] = useState<Productor[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadProductores();
  }, []);

  const filteredProductores = productores.filter((productor) =>
    matchesProductor(productor, search)
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />

      <AppInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
        onChangeText={setSearch}
        placeholder="Buscar por documento, correo o direccion..."
        value={search}
      />

      {isLoading ? (
        <AppCard>
          <AppText variant="muted">Cargando productores...</AppText>
        </AppCard>
      ) : null}

      {!isLoading && error ? (
        <AppCard>
          <AppHeader title="Error al cargar" subtitle={error} />
          <AppButton
            label="Reintentar"
            onPress={() => {
              void loadProductores();
            }}
          />
        </AppCard>
      ) : null}

      {!isLoading && !error && productores.length === 0 ? (
        <AppEmptyState
          title="Sin productores"
          message="No hay productores cargados en la base local."
        />
      ) : null}

      {!isLoading && !error && productores.length > 0 && filteredProductores.length === 0 ? (
        <AppEmptyState
          title="Sin resultados"
          message="No se encontraron productores para esta busqueda."
        />
      ) : null}

      {!isLoading && !error && filteredProductores.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filteredProductores}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/productores/${item.id}`)}
              style={({ pressed }) => [
                styles.itemCard,
                pressed && styles.itemCardPressed
              ]}
            >
              <View style={styles.itemHeader}>
                <AppText variant="heading">{item.documentNumber}</AppText>
                <AppStatusBadge
                  label={item.isActive ? "Activo" : "Inactivo"}
                  variant={item.isActive ? "success" : "neutral"}
                />
              </View>
              <AppText variant="muted">
                {item.email || "Sin correo"}
              </AppText>
              <AppText variant="caption">
                {item.address || "Sin direccion"}
              </AppText>
            </Pressable>
          )}
        />
      ) : null}
    </ScreenContainer>
  );

  async function loadProductores() {
    setIsLoading(true);
    setError(null);

    try {
      const nextProductores = await productoresService.getAll();
      setProductores(nextProductores);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el listado.");
    } finally {
      setIsLoading(false);
    }
  }
}

function matchesProductor(productor: Productor, search: string) {
  const query = search.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const source = [
    productor.id,
    productor.documentNumber,
    productor.email ?? "",
    productor.address ?? ""
  ]
    .join(" ")
    .toLowerCase();

  return source.includes(query);
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
