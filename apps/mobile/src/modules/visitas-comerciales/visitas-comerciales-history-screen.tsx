import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { File, Paths } from "expo-file-system";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer
} from "../../shared/components";
import { theme } from "../../shared/constants/theme";
import { apiRequestBinary } from "../../shared/services/api/client";
import { subscribeToSyncStatus } from "../../shared/sync/sync-events";
import {
  getFotosDeVisitaComercialLocales,
  leerFotoComercialParaSync,
  reintentarFotoComercial,
  type FotoComercialLocal
} from "../comercial/services/fotos-comerciales.service";
import { getCatalogSessionUserId } from "../../shared/database/catalog-session";
import { getDatabase } from "../../shared/database/connection";
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
  const [fotos, setFotos] = useState(() => getFotosDeVisitaComercialLocales(id));
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const temporaryRef = useRef<File | null>(null);
  useEffect(() => {
    const refresh = () => {
      setVisita(visitasComercialesService.getById(id));
      setFotos(getFotosDeVisitaComercialLocales(id));
    };
    const unsubscribe = subscribeToSyncStatus(refresh);
    return () => {
      unsubscribe();
      if (temporaryRef.current?.exists) temporaryRef.current.delete();
    };
  }, [id]);

  const openPhoto = async (photo: FotoComercialLocal) => {
    const owner = getCatalogSessionUserId(getDatabase());
    if (!owner) return;
    try {
      if (temporaryRef.current?.exists) temporaryRef.current.delete();
      let temporary: File;
      if (photo.fileName) {
        temporary = await leerFotoComercialParaSync(photo, owner);
      } else if (visita?.serverId) {
        const bytes = await apiRequestBinary(`/comercial/visitas/${visita.serverId}/fotos/${photo.publicId}/contenido`);
        temporary = new File(Paths.cache, `${photo.publicId}.jpg`);
        temporary.create({ overwrite: true });
        temporary.write(bytes);
      } else {
        throw new Error("La foto aún no está disponible.");
      }
      if (getCatalogSessionUserId(getDatabase()) !== owner) {
        if (temporary.exists) temporary.delete();
        return;
      }
      temporaryRef.current = temporary;
      setPreviewUri(temporary.uri);
    } catch (reason) {
      Alert.alert("No se pudo abrir la foto", reason instanceof Error ? reason.message : "Inténtalo de nuevo.");
    }
  };
  const closePhoto = () => {
    setPreviewUri(null);
    if (temporaryRef.current?.exists) temporaryRef.current.delete();
    temporaryRef.current = null;
  };
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
        {visita ? <AppCard>
          <AppText variant="label">Evidencia fotográfica</AppText>
          {fotos.length === 0 ? <AppText variant="caption">Esta visita no tiene fotos.</AppText> : null}
          {fotos.map((foto, index) => <View key={foto.localId} style={styles.photoRow}>
            <AppButton label={`Ver foto ${index + 1}`} variant="outline" onPress={() => void openPhoto(foto)} />
            <AppText variant="caption">{foto.syncStatus === "synced" ? "Sincronizada" : foto.syncStatus === "error" ? "Error" : "Pendiente"}</AppText>
            {foto.syncStatus === "error" ? <AppButton label="Reintentar" variant="outline" onPress={() => {
              reintentarFotoComercial(foto.localId);
              setFotos(getFotosDeVisitaComercialLocales(id));
            }} /> : null}
          </View>)}
        </AppCard> : null}
      </ScrollView>
      <Modal visible={!!previewUri} transparent onRequestClose={closePhoto}>
        <Pressable style={styles.photoModal} onPress={closePhoto}>
          {previewUri ? <Image source={{ uri: previewUri }} style={styles.photoFull} resizeMode="contain" /> : null}
          <AppText variant="label">Cerrar</AppText>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 30, backgroundColor: theme.colors.background },
  photoRow: { gap: 8, marginTop: 8 },
  photoModal: { flex: 1, backgroundColor: "#000000dd", alignItems: "center", justifyContent: "center" },
  photoFull: { width: "100%", height: "80%" }
});
