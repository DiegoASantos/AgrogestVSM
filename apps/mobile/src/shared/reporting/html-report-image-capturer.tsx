import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { AppText } from "../components/app-text";
import { AppButton } from "../components/app-button";
import { theme } from "../constants/theme";
import {
  getMaxReportLogicalHeight,
  getReportCaptureStartError,
  parseReportHeightMessage
} from "./report-image-sizing";

const CAPTURE_TIMEOUT_MS = 20_000;
const CAPTURE_SETTLE_MS = 350;
const MAX_IMAGE_PIXEL_AREA = 14_000_000;
const ANCHO_RENDER = 720;
const REPORT_SIZE_MESSAGE = "agrogest-report-size";

export const REPORT_IMAGE_CAPTURE_CANCELLED_ERROR =
  "ReportImageCaptureCancelledError";

const REPORT_MEASUREMENT_SCRIPT = `
  (function () {
    var sendHeight = function () {
      var body = document.body;
      var root = document.documentElement;
      var height = Math.ceil(Math.max(
        body ? body.scrollHeight : 0,
        body ? body.offsetHeight : 0,
        root ? root.scrollHeight : 0,
        root ? root.offsetHeight : 0
      ));

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "${REPORT_SIZE_MESSAGE}",
        height: height
      }));
    };

    var waitForAssets = function () {
      var fontReady = document.fonts && document.fonts.ready
        ? document.fonts.ready.catch(function () {})
        : Promise.resolve();
      var images = Array.prototype.slice.call(document.images || []);
      var imagesReady = Promise.all(images.map(function (image) {
        if (image.complete) return Promise.resolve();
        return new Promise(function (resolve) {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }));

      Promise.all([fontReady, imagesReady]).then(function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(sendHeight);
        });
      });
    };

    window.addEventListener("load", waitForAssets, { once: true });
    waitForAssets();

    if (window.ResizeObserver && document.documentElement) {
      var observer = new ResizeObserver(function () {
        requestAnimationFrame(sendHeight);
      });
      observer.observe(document.documentElement);
      window.addEventListener("beforeunload", function () {
        observer.disconnect();
      }, { once: true });
    }
  })();
  true;
`;

type PendingCapture = {
  html: string;
  id: number;
  reject: (error: Error) => void;
  resolve: (uris: string[]) => void;
};

export type HtmlReportImageCapturerHandle = {
  capture: (html: string) => Promise<string[]>;
};

export const HtmlReportImageCapturer = forwardRef<
  HtmlReportImageCapturerHandle,
  object
>(function HtmlReportImageCapturer(_, ref) {
  const scrollRef = useRef<ScrollView>(null);
  const pendingRef = useRef<PendingCapture | null>(null);
  const captureSequenceRef = useRef(0);
  const startedCaptureIdsRef = useRef(new Set<number>());
  const [request, setRequest] = useState<PendingCapture | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const screen = Dimensions.get("window");
  const maxPageHeight = getMaxReportLogicalHeight(
    ANCHO_RENDER,
    1,
    MAX_IMAGE_PIXEL_AREA
  );

  const rejectPending = useCallback((requestId: number, message: string) => {
    const pending = pendingRef.current;
    if (pending?.id !== requestId) return;

    pendingRef.current = null;
    setRequest(null);
    pending.reject(new Error(message));
  }, []);

  const resolvePending = useCallback((requestId: number, uris: string[]) => {
    const pending = pendingRef.current;
    if (pending?.id !== requestId) return;

    pendingRef.current = null;
    setRequest(null);
    pending.resolve(uris.map(normalizeCaptureUri));
  }, []);

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    const error = new Error("La generacion de imagen fue cancelada.");
    error.name = REPORT_IMAGE_CAPTURE_CANCELLED_ERROR;
    pendingRef.current = null;
    setRequest(null);
    pending.reject(error);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      capture(html: string) {
        const startError = getReportCaptureStartError(
          pendingRef.current !== null,
          startedCaptureIdsRef.current.size
        );
        if (startError) {
          return Promise.reject(new Error(startError));
        }

        return new Promise<string[]>((resolve, reject) => {
          const nextRequest = {
            html,
            id: ++captureSequenceRef.current,
            reject,
            resolve
          };
          pendingRef.current = nextRequest;
          setContentHeight(null);
          setRequest(nextRequest);
        });
      }
    }),
    []
  );

  useEffect(() => {
    if (!request) return undefined;

    const timeout = setTimeout(() => {
      rejectPending(
        request.id,
        "La imagen tardo demasiado en generarse. Intenta de nuevo o comparte el PDF."
      );
    }, CAPTURE_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [rejectPending, request]);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) {
        const error = new Error("La generacion de imagen fue cancelada.");
        error.name = REPORT_IMAGE_CAPTURE_CANCELLED_ERROR;
        pending.reject(error);
      }
    },
    []
  );

  useEffect(() => {
    if (
      !request ||
      !contentHeight ||
      startedCaptureIdsRef.current.has(request.id)
    ) {
      return undefined;
    }
    const requestId = request.id;

    const timeout = setTimeout(() => {
      void capturarConReintentos(requestId, contentHeight);
    }, CAPTURE_SETTLE_MS);

    return () => clearTimeout(timeout);

    async function capturarConReintentos(id: number, alturaTotal: number) {
      if (
        !scrollRef.current ||
        pendingRef.current?.id !== id ||
        startedCaptureIdsRef.current.has(id)
      ) {
        return;
      }
      startedCaptureIdsRef.current.add(id);

      try {
        for (let intento = 0; intento < 2; intento++) {
          try {
            if (pendingRef.current?.id !== id) return;
            if (intento > 0) {
              await wait(CAPTURE_SETTLE_MS);
              if (pendingRef.current?.id !== id) return;
            }

            const uris = await capturarPaginas(alturaTotal, id);

            if (pendingRef.current?.id !== id) {
              uris.forEach(releaseCapture);
              return;
            }

            resolvePending(id, uris);
            return;
          } catch (error) {
            if (intento === 1) {
              const detalle = error instanceof Error ? error.message : "Error desconocido";
              rejectPending(
                id,
                `No se pudo generar la imagen (${detalle}). Intenta nuevamente o comparte el PDF.`
              );
            }
          }
        }
      } finally {
        startedCaptureIdsRef.current.delete(id);
      }
    }
  }, [contentHeight, maxPageHeight, rejectPending, request, resolvePending]);

  async function capturarPaginas(alturaTotal: number, id: number): Promise<string[]> {
    const alturaPagina = Math.min(maxPageHeight, alturaTotal);
    const paginas = Math.ceil(alturaTotal / alturaPagina);
    const uris: string[] = [];

    for (let i = 0; i < paginas; i++) {
      if (pendingRef.current?.id !== id) {
        uris.forEach(releaseCapture);
        throw new Error("Cancelado");
      }

      const offsetY = i * alturaPagina;
      const alturaRestante = alturaTotal - offsetY;
      const altoPagina = Math.min(alturaPagina, alturaRestante);

      const htmlPagina = inyectarOffsetCss(request!.html, offsetY);

      setContentHeight(null);

      setRequest((prev) => (prev?.id === id ? { ...prev, html: htmlPagina } : prev));

      await wait(CAPTURE_SETTLE_MS * 2);

      if (pendingRef.current?.id !== id) {
        uris.forEach(releaseCapture);
        throw new Error("Cancelado");
      }

      const uri = await captureRef(scrollRef, {
        format: "png",
        result: "tmpfile",
        width: ANCHO_RENDER,
        height: altoPagina
      });

      if (!uri) {
        uris.forEach(releaseCapture);
        throw new Error("La captura no devolvio un archivo.");
      }

      uris.push(uri);
    }

    setRequest(request);

    return uris;
  }

  const paginaActual = request
    ? Math.floor(
        (contentHeight ? Math.min(contentHeight, maxPageHeight) * (captureSequenceRef.current % 100) : 0) /
          Math.min(contentHeight || 1, maxPageHeight)
      ) + 1
    : 0;
  const totalPaginas = contentHeight
    ? Math.ceil(contentHeight / Math.min(maxPageHeight, contentHeight))
    : 0;

  return request ? (
    <Modal animationType="none" onRequestClose={cancelPending} transparent visible>
      <View style={styles.modalRoot}>
        <ScrollView
          contentContainerStyle={styles.captureContent}
          pointerEvents="none"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={{ width: ANCHO_RENDER }}
        >
          <View
            collapsable={false}
            style={{
              backgroundColor: "#ffffff",
              height: Math.min(contentHeight ?? 5000, screen.height),
              width: ANCHO_RENDER
            }}
          >
            <WebView
              androidLayerType="software"
              injectedJavaScript={REPORT_MEASUREMENT_SCRIPT}
              javaScriptEnabled
              key={`${request.id}`}
              onError={() =>
                rejectPending(
                  request.id,
                  "No se pudo renderizar el reporte. Intenta nuevamente o comparte el PDF."
                )
              }
              onMessage={(event) => handleMessage(request.id, event)}
              originWhitelist={["about:blank"]}
              scrollEnabled={false}
              source={{ baseUrl: "about:blank", html: request.html }}
              style={{
                backgroundColor: "#ffffff",
                height: Math.min(contentHeight ?? 5000, screen.height),
                width: ANCHO_RENDER
              }}
            />
          </View>
        </ScrollView>

        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <AppText variant="label">Generando imagen...{totalPaginas > 1 ? ` (${paginaActual}/${totalPaginas})` : ""}</AppText>
            <AppText style={styles.loadingHint} variant="caption">
              Los reportes extensos pueden tardar unos segundos.
            </AppText>
            <AppButton
              label="Cancelar"
              onPress={cancelPending}
              size="small"
              variant="outline"
            />
          </View>
        </View>
      </View>
    </Modal>
  ) : null;

  function handleMessage(requestId: number, event: WebViewMessageEvent) {
    if (pendingRef.current?.id !== requestId) return;

    const measuredHeight = parseReportHeightMessage(event.nativeEvent.data);
    if (!measuredHeight) return;

    setContentHeight(measuredHeight);
  }
});

function inyectarOffsetCss(html: string, offsetY: number): string {
  if (offsetY <= 0) return html;

  const estilo = `<style>body { transform: translateY(-${offsetY}px); }</style>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${estilo}</head>`);
  }

  return `${estilo}${html}`;
}

function normalizeCaptureUri(uri: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(uri) ? uri : `file://${uri}`;
}

function wait(durationMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, durationMs));
}

const styles = StyleSheet.create({
  modalRoot: {
    backgroundColor: "#ffffff",
    flex: 1
  },
  captureContent: {
    alignItems: "flex-start",
    backgroundColor: "#ffffff"
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    padding: 24
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    maxWidth: 320,
    padding: 24,
    ...theme.shadow.sm
  },
  loadingHint: {
    color: theme.colors.textMuted,
    textAlign: "center"
  }
});
