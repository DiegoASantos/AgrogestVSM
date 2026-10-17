import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import WebView from "react-native-webview";
import { visitaRecetaPdfReportService } from "../../../src/modules/visita-recetas/services/visita-receta-pdf-report.service";
import { AppText } from "../../../src/shared/components";

export default function RecetaPreviewPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void visitaRecetaPdfReportService
      .preview(id)
      .then(async (value) => {
        if (!active) return;
        if (Platform.OS === "android") {
          const FileSystem = await import("expo-file-system/legacy");
          const IntentLauncher = await import("expo-intent-launcher");
          const contentUri = await FileSystem.getContentUriAsync(value);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
            data: contentUri,
            type: "application/pdf",
            flags: 1
          });
        }
        if (active) setUri(value);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "No se pudo abrir la receta."
          );
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (error)
    return (
      <View style={{ padding: 24 }}>
        <AppText variant="body">{error}</AppText>
      </View>
    );
  if (!uri) return <ActivityIndicator style={{ flex: 1 }} />;
  if (Platform.OS === "android")
    return (
      <View style={{ padding: 24 }}>
        <AppText variant="body">PDF abierto en el visor del dispositivo.</AppText>
      </View>
    );
  return <WebView source={{ uri }} originWhitelist={["*"]} />;
}
