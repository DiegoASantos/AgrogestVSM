import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer
} from "../../shared/components";
import { theme } from "../../shared/constants/theme";
import {
  visitasComercialesService,
  type VisitaComercialLocal
} from "./visitas-comerciales.service";

export function VisitasComercialesHistoryScreen() {
  const router = useRouter();
  const [visitas, setVisitas] = useState<VisitaComercialLocal[]>([]);
  useFocusEffect(
    useCallback(() => {
      setVisitas(visitasComercialesService.list());
    }, [])
  );
  return (
    <ScreenContainer>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          eyebrow="Visitas"
          title="Visitas comerciales"
          subtitle="Registros guardados en este dispositivo."
        />
        <AppButton
          label="Nueva visita comercial"
          onPress={() => router.push("/visitas-campo/registrar-comercial")}
        />
        {visitas.length === 0 ? (
          <AppCard>
            <AppText variant="muted">Aún no hay visitas comerciales.</AppText>
          </AppCard>
        ) : null}
        {visitas.map((visita) => (
          <Pressable
            key={visita.id}
            onPress={() =>
              router.push({
                pathname: "/visitas-campo/comercial/[id]",
                params: { id: visita.id }
              })
            }
          >
            <AppCard>
              <AppText variant="label">
                {[visita.nombres, visita.apellidos].filter(Boolean).join(" ")}
              </AppText>
              <AppText variant="caption">
                {visita.tipoSujeto} · {visita.fechaVisita}
              </AppText>
              <AppText variant="caption">
                {visita.syncStatus === "synced"
                  ? "Sincronizada"
                  : visita.syncStatus === "error"
                    ? "Error de sincronización"
                    : "Pendiente de sincronización"}
              </AppText>
            </AppCard>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

export function VisitaComercialDetailScreen({ id }: { id: string }) {
  const [visita, setVisita] = useState(() => visitasComercialesService.getById(id));
  return (
    <ScreenContainer>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          eyebrow="Visita comercial"
          title={
            visita
              ? [visita.nombres, visita.apellidos].filter(Boolean).join(" ")
              : "Visita no encontrada"
          }
        />
        {visita ? (
          <AppCard>
            <AppText variant="label">Tipo: {visita.tipoSujeto}</AppText>
            <AppText variant="body">Fecha: {visita.fechaVisita}</AppText>
            <AppText variant="body">Descripción: {visita.descripcion}</AppText>
            <AppText variant="caption">
              Ubicación:{" "}
              {visita.ubicacionVisita
                ? visita.ubicacionVisita.coordinates.join(", ")
                : "No disponible"}
            </AppText>
            <AppText variant="caption">Estado: {visita.syncStatus}</AppText>
            {visita.syncErrorMessage ? (
              <AppText variant="caption">{visita.syncErrorMessage}</AppText>
            ) : null}
            {visita.syncStatus === "error" ? (
              <AppButton
                label="Reintentar sincronización"
                onPress={() => {
                  try {
                    if (visitasComercialesService.retry(id)) {
                      setVisita(visitasComercialesService.getById(id));
                      Alert.alert(
                        "Sincronización programada",
                        "La visita se reenviará cuando haya conexión."
                      );
                    }
                  } catch (reason) {
                    Alert.alert(
                      "No se pudo reintentar",
                      reason instanceof Error ? reason.message : "Inténtalo de nuevo."
                    );
                  }
                }}
              />
            ) : null}
          </AppCard>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 30, backgroundColor: theme.colors.background }
});
