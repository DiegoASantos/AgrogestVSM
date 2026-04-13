import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, View } from "react-native";

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
import { useIsOnline } from "../../../../shared/connectivity/use-is-online";
import { theme } from "../../../../shared/constants/theme";
import { downloadAllCatalogs } from "../../../../shared/database/seed-catalogs";
import { toApiError } from "../../../../shared/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { productoresService } from "../../services";
import type { Productor } from "../../types";

export function ProductoresListScreen() {
  const router = useRouter();
  const { isAuthenticated, signOut } = useAuthSession();
  const { isOnline } = useIsOnline();
  const [productores, setProductores] = useState<Productor[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

      <AppCard style={styles.syncCard} variant="outlined">
        <AppText variant="label">Base local</AppText>
        <AppText variant="caption">
          {getSyncMessage({
            isAuthenticated,
            isOnline,
            isSyncing,
            syncMessage
          })}
        </AppText>
        <AppButton
          disabled={!isAuthenticated || !isOnline || isLoading}
          label="Sincronizar"
          loading={isSyncing}
          onPress={() => {
            void handleManualSync();
          }}
          size="small"
          variant="outline"
        />
      </AppCard>

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

  async function loadProductores(options?: { background?: boolean }) {
    const background = options?.background ?? false;

    if (!background) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const nextProductores = await productoresService.getAll();
      setProductores(nextProductores);
      return nextProductores;
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el listado.");
      return [];
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }

  async function handleManualSync() {
    if (!isAuthenticated) {
      setSyncMessage("Inicia sesion para descargar productores desde el servidor.");
      return;
    }

    if (Platform.OS === "web") {
      setSyncMessage("La sincronizacion local no esta disponible en la vista web.");
      return;
    }

    if (!isOnline) {
      setSyncMessage("No hay conexion a internet para sincronizar.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      await downloadAllCatalogs();
      const nextProductores = await loadProductores({ background: true });

      if (nextProductores.length === 0) {
        setSyncMessage(
          "La sincronizacion termino, pero la base local sigue sin productores."
        );
        return;
      }

      setSyncMessage(
        `Sincronizacion completada. ${nextProductores.length} productores disponibles localmente.`
      );
    } catch (nextError) {
      const apiError = toApiError(nextError);

      if (apiError.statusCode === 401) {
        signOut();
        router.replace("/login");
        return;
      }

      setSyncMessage(apiError.message || "No se pudo sincronizar con el servidor.");
    } finally {
      setIsSyncing(false);
    }
  }
}

function getSyncMessage(input: {
  isAuthenticated: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  syncMessage: string | null;
}) {
  if (!input.isAuthenticated) {
    return "Inicia sesion para actualizar productores y catalogos desde el servidor.";
  }

  if (!input.isOnline) {
    return "Sin conexion. La sincronizacion manual requiere internet.";
  }

  if (input.isSyncing) {
    return "Descargando productores y catalogos recientes...";
  }

  if (input.syncMessage) {
    return input.syncMessage;
  }

  return "Fuerza una descarga manual cuando necesites ver cambios recientes.";
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
  syncCard: {
    gap: 10
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
