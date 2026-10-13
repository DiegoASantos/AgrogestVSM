import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { AppButton, AppCard, AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { subscribeToSyncStatus } from "../../../../shared/sync/sync-events";
import {
  getFotosComercialesLocales,
  guardarFotoComercial,
  limpiarFotosComercialesSincronizadas,
  reintentarFotoComercial,
  type FotoComercialLocal
} from "../../services/fotos-comerciales.service";

type Props = { productorId: string };

export function FotosComercialesCard({ productorId }: Props) {
  const [selected, setSelected] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [photos, setPhotos] = useState<FotoComercialLocal[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    setSelected([]);
    setPreviewUri(null);
    if (!productorId) {
      setPhotos([]);
      return;
    }
    const refresh = () => {
      limpiarFotosComercialesSincronizadas();
      setPhotos(getFotosComercialesLocales(productorId));
    };
    refresh();
    return subscribeToSyncStatus(refresh);
  }, [productorId]);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permiso de cámara", "Permite el uso de la cámara para tomar la foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
      exif: false
    });
    if (!result.canceled) setSelected((current) => [...current, ...result.assets]);
  }

  async function choosePhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
      exif: false
    });
    if (!result.canceled) setSelected((current) => [...current, ...result.assets]);
  }

  async function save() {
    if (!productorId || selected.length === 0) return;
    setBusy(true);
    const failed: ImagePicker.ImagePickerAsset[] = [];
    let saved = 0;
    for (const asset of selected) {
      try {
        await guardarFotoComercial(productorId, asset);
        saved += 1;
      } catch {
        failed.push(asset);
      }
    }
    setSelected(failed);
    setPhotos(getFotosComercialesLocales(productorId));
    setBusy(false);
    if (failed.length) {
      Alert.alert("Fotos pendientes", `${saved} foto(s) guardada(s). Revisa las ${failed.length} que no se pudieron guardar.`);
    } else {
      Alert.alert("Fotos guardadas", "Se subirán al recuperar la conexión. Puedes continuar sin registrar un acreedor.");
    }
  }

  return (
    <AppCard style={styles.card}>
      <View style={styles.heading}>
        <Ionicons name="images-outline" size={22} color={theme.colors.primaryDark} />
        <View style={styles.headingText}>
          <AppText variant="label">Adjuntar fotos del productor</AppText>
          <AppText variant="caption">
            Opción independiente del registro de acreedores. Las fotos pendientes solo están en este dispositivo.
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <AppButton label="Tomar foto" icon="camera-outline" onPress={() => { void takePhoto(); }} disabled={!productorId || busy} />
        <AppButton label="Elegir de galería" icon="images-outline" onPress={() => { void choosePhotos(); }} disabled={!productorId || busy} />
      </View>
      {selected.map((asset, index) => (
        <View key={asset.uri + index} style={styles.previewRow}>
          <Pressable accessibilityLabel={`Ampliar foto ${index + 1}`} onPress={() => setPreviewUri(asset.uri)}>
            <Image source={{ uri: asset.uri }} style={styles.preview} />
          </Pressable>
          <AppText variant="caption">Foto {index + 1} · Toca para ampliar</AppText>
          <Pressable
            accessibilityLabel={`Quitar foto ${index + 1}`}
            onPress={() => setSelected((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Ionicons name="close-circle-outline" size={26} color={theme.colors.primaryDark} />
          </Pressable>
        </View>
      ))}
      {selected.length > 0 && (
        <AppButton
          label={busy ? "Guardando fotos..." : `Guardar ${selected.length} foto(s)`}
          icon="save-outline"
          onPress={() => { void save(); }}
          disabled={busy}
        />
      )}
      {photos.map((photo) => (
        <View key={photo.localId} style={styles.statusRow}>
          <Ionicons name="image-outline" size={20} color={theme.colors.primaryDark} />
          <View style={styles.headingText}>
            <AppText variant="caption">
              {photo.syncStatus === "synced" ? "Subida" : photo.syncStatus === "error" ? "Error al subir" : "Pendiente de subir"}
            </AppText>
            {photo.syncStatus === "error" && photo.syncErrorMessage && (
              <AppText variant="caption">{photo.syncErrorMessage}</AppText>
            )}
          </View>
          {photo.syncStatus === "error" && (
            <Pressable onPress={() => { reintentarFotoComercial(photo.localId); setPhotos(getFotosComercialesLocales(productorId)); }}>
              <AppText variant="caption">Reintentar</AppText>
            </Pressable>
          )}
        </View>
      ))}
      <Modal visible={Boolean(previewUri)} transparent onRequestClose={() => setPreviewUri(null)}>
        <View style={styles.modal}>
          <AppButton label="Cerrar vista previa" icon="close-outline" onPress={() => setPreviewUri(null)} />
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              resizeMode="contain"
              style={{ width: width - 24, height: height - 120 }}
            />
          )}
        </View>
      </Modal>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  heading: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  headingText: { flex: 1, gap: 3 },
  actions: { gap: 8 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  preview: { width: 64, height: 64, borderRadius: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modal: { flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center", gap: 12 }
});
