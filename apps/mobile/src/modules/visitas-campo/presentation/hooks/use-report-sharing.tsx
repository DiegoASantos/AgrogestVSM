import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { releaseCapture } from "react-native-view-shot";

import {
  HtmlReportImageCapturer,
  getLosslessPngShareOptions,
  LOSSLESS_PNG_MIME_TYPE,
  REPORT_IMAGE_CAPTURE_CANCELLED_ERROR,
  type HtmlReportImageCapturerHandle
} from "../../../../shared/reporting";
import { toApiError } from "../../../../shared/services";
import { visitaRecetaPdfReportService } from "../../../visita-recetas/services";
import { visitaPdfReportService } from "../../services/visita-pdf-report.service";

export type ReportKind = "diagnostico" | "receta";
export type ReportOperation = "preview" | "share-image" | "share-pdf";

export type ActiveReportAction = {
  operation: ReportOperation;
  report: ReportKind;
  visitaId: string;
};

type UseReportSharingOptions = {
  onError: (message: string) => void;
};

const REPORT_LABELS: Record<ReportKind, string> = {
  diagnostico: "diagnostico",
  receta: "receta"
};

export function useReportSharing({ onError }: UseReportSharingOptions) {
  const capturerRef = useRef<HtmlReportImageCapturerHandle>(null);
  const activeActionRef = useRef<ActiveReportAction | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveReportAction | null>(null);

  const runReportOperation = useCallback(
    async (
      visitaId: string,
      report: ReportKind,
      operation: ReportOperation
    ) => {
      if (activeActionRef.current) return;

      const nextAction = { operation, report, visitaId } satisfies ActiveReportAction;
      activeActionRef.current = nextAction;
      setActiveAction(nextAction);

      try {
        const service =
          report === "diagnostico"
            ? visitaPdfReportService
            : visitaRecetaPdfReportService;

        if (operation === "preview") {
          await service.preview(visitaId);
          return;
        }

        if (operation === "share-pdf") {
          await service.share(visitaId);
          return;
        }

        const Sharing = await import("expo-sharing");
        if (!(await Sharing.isAvailableAsync())) {
          throw new Error("El dispositivo no permite compartir archivos en este momento.");
        }

        if (!capturerRef.current) {
          throw new Error("El generador de imagen aun no esta disponible.");
        }

        const html = await service.buildHtml(visitaId);
        const uris = await capturerRef.current.capture(html);

        try {
          if (uris.length > 1) {
            await compartirMultiplesImagenes(uris, REPORT_LABELS[report]);
          } else {
            await Sharing.shareAsync(
              uris[0],
              getLosslessPngShareOptions(REPORT_LABELS[report])
            );
          }
        } finally {
          for (const uri of uris) {
            try { releaseCapture(uri); } catch { /* temporal */ }
          }
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === REPORT_IMAGE_CAPTURE_CANCELLED_ERROR
        ) {
          return;
        }

        const apiError = toApiError(error);
        onError(
          apiError.message ||
            `No se pudo procesar el ${REPORT_LABELS[report]}. Intenta nuevamente.`
        );
      } finally {
        activeActionRef.current = null;
        setActiveAction(null);
      }
    },
    [onError]
  );

  const previewReport = useCallback(
    (visitaId: string, report: ReportKind) =>
      runReportOperation(visitaId, report, "preview"),
    [runReportOperation]
  );

  const promptShareReport = useCallback(
    (visitaId: string, report: ReportKind) => {
      if (activeActionRef.current) return;

      const label = REPORT_LABELS[report];
      Alert.alert(
        `Compartir ${label}`,
        "Selecciona el formato que deseas compartir.",
        [
          {
            text: "Imagen PNG",
            onPress: () => {
              void runReportOperation(visitaId, report, "share-image");
            }
          },
          {
            text: "Documento PDF",
            onPress: () => {
              void runReportOperation(visitaId, report, "share-pdf");
            }
          },
          { style: "cancel", text: "Cancelar" }
        ],
        { cancelable: true }
      );
    },
    [runReportOperation]
  );

  const captureHost = useMemo(
    () => <HtmlReportImageCapturer ref={capturerRef} />,
    []
  );

  return {
    activeAction,
    captureHost,
    previewReport,
    promptShareReport
  };
}

export function isReportActionActive(
  action: ActiveReportAction | null,
  visitaId: string,
  report: ReportKind,
  operation?: ReportOperation
) {
  return (
    action?.visitaId === visitaId &&
    action.report === report &&
    (operation === undefined || action.operation === operation)
  );
}

async function compartirMultiplesImagenes(uris: string[], label: string) {
  const { Platform } = await import("react-native");

  if (Platform.OS === "android") {
    await compartirMultiplesAndroid(uris, label);
  } else {
    const Sharing = await import("expo-sharing");
    for (const uri of uris) {
      await Sharing.shareAsync(uri, getLosslessPngShareOptions(label));
    }
  }
}

async function compartirMultiplesAndroid(uris: string[], label: string) {
  const { default: FileSystem } = await import("expo-file-system");

  const contentUris = await Promise.all(
    uris.map(async (uri) => {
      try {
        return await FileSystem.getContentUriAsync(uri);
      } catch {
        return normalizarUriAndroid(uri);
      }
    })
  );

  try {
    const { default: IntentLauncher } = await import("expo-intent-launcher");

    const extras: Array<{ key: string; value: unknown }> = [
      { key: "android.intent.extra.SUBJECT", value: `Compartir ${label} como imagen` },
      { key: "android.intent.extra.STREAM", value: contentUris }
    ];

    await IntentLauncher.startActivityAsync("android.intent.action.SEND_MULTIPLE", {
      type: LOSSLESS_PNG_MIME_TYPE,
      flags: 1,
      extra: extras
    });
  } catch {
    const Sharing = await import("expo-sharing");
    for (const uri of contentUris) {
      try {
        await Sharing.shareAsync(uri, getLosslessPngShareOptions(label));
      } catch { /* continue to next image */ }
    }
  }
}

function normalizarUriAndroid(uri: string): string {
  if (uri.startsWith("file://")) return uri;
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
}
