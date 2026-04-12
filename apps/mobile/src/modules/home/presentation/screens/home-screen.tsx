import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppDetailRow,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { getLastSyncTime, getSyncCounts } from "../../../../shared/sync";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";

export function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, session, signOut } = useAuthSession();
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSyncCounts(getSyncCounts());
      setLastSyncTime(getLastSyncTime());
      return undefined;
    }, [])
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />

      <AppHeader
        eyebrow={isAuthenticated ? "Sesion activa" : "Sin sesion"}
        title="Inicio"
        subtitle={
          isAuthenticated
            ? `Hola, ${session.user?.displayName || session.user?.email}`
            : "Inicia sesion para acceder a todas las funciones."
        }
      />

      {isAuthenticated ? (
        <>
          <AppCard>
            <View style={styles.cardHeader}>
              <AppText variant="heading">Cuenta</AppText>
              <AppStatusBadge label="Activa" variant="success" />
            </View>
            <AppDetailRow label="Correo" value={session.user?.email || "-"} />
            <AppDetailRow
              label="Roles"
              value={session.user?.roles.join(", ") || "Sin roles"}
            />
          </AppCard>

          <AppCard>
            <View style={styles.cardHeader}>
              <AppText variant="heading">Sincronizacion</AppText>
              {syncCounts.errorCount > 0 ? (
                <AppStatusBadge label={`${syncCounts.errorCount} errores`} variant="error" />
              ) : syncCounts.pendingCount > 0 ? (
                <AppStatusBadge label={`${syncCounts.pendingCount} pendientes`} variant="warning" />
              ) : (
                <AppStatusBadge label="Al dia" variant="success" />
              )}
            </View>
            <AppDetailRow label="Pendientes" value={String(syncCounts.pendingCount)} />
            <AppDetailRow label="Con error" value={String(syncCounts.errorCount)} />
            <AppDetailRow label="Ultima sync" value={lastSyncTime || "No registrada"} />
          </AppCard>
        </>
      ) : (
        <AppCard>
          <AppText variant="muted">
            Inicia sesion para sincronizar datos y acceder a tus productores.
          </AppText>
        </AppCard>
      )}

      <View style={styles.actions}>
        <AppButton
          label={isAuthenticated ? "Ver productores" : "Iniciar sesion para continuar"}
          onPress={() => {
            if (!isAuthenticated) {
              router.push("/login");
              return;
            }

            router.push("/productores");
          }}
        />
        <AppButton
          label={isAuthenticated ? "Cerrar sesion" : "Iniciar sesion"}
          onPress={() => {
            if (isAuthenticated) {
              signOut();
              router.replace("/login");
              return;
            }
            router.push("/login");
          }}
          variant={isAuthenticated ? "outline" : "primary"}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  actions: {
    gap: 10,
    marginTop: 8
  }
});
