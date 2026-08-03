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
  PixelRatio,
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
  resolve: (uri: string) => void;
};

export type HtmlReportImageCapturerHandle = {
  capture: (html: string) => Promise<string>;
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
  const [laidOutHeight, setLaidOutHeight] = useState(0);

  const screen = Dimensions.get("window");
  const captureWidth = Math.max(1, Math.floor(screen.width));
  const maxContentHeight = getMaxReportLogicalHeight(
    captureWidth,
    PixelRatio.get(),
    MAX_IMAGE_PIXEL_AREA
  );

  const rejectPending = useCallback((requestId: number, message: string) => {
    const pending = pendingRef.current;
    if (pending?.id !== requestId) return;

    pendingRef.current = null;
    setRequest(null);
    pending.reject(new Error(message));
  }, []);

  const resolvePending = useCallback((requestId: number, uri: string) => {
    const pending = pendingRef.current;
    if (pending?.id !== requestId) return;

    pendingRef.current = null;
    setRequest(null);
    pending.resolve(normalizeCaptureUri(uri));
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

        return new Promise<string>((resolve, reject) => {
          const nextRequest = {
            html,
            id: ++captureSequenceRef.current,
            reject,
            resolve
          };
          pendingRef.current = nextRequest;
          setContentHeight(null);
          setLaidOutHeight(0);
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
      Math.abs(laidOutHeight - contentHeight) > 1 ||
      startedCaptureIdsRef.current.has(request.id)
    ) {
      return undefined;
    }
    const requestId = request.id;

    const timeout = setTimeout(() => {
      void captureWithRetry();
    }, CAPTURE_SETTLE_MS);

    return () => clearTimeout(timeout);

    async function captureWithRetry() {
      if (
        !scrollRef.current ||
        pendingRef.current?.id !== requestId ||
        startedCaptureIdsRef.current.has(requestId)
      ) {
        return;
      }
      startedCaptureIdsRef.current.add(requestId);

      try {
        let lastError: unknown;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            if (pendingRef.current?.id !== requestId) return;

            if (attempt > 0) {
              await wait(CAPTURE_SETTLE_MS);
              if (pendingRef.current?.id !== requestId) return;
            }

            const pixelRatio = PixelRatio.get();
            const uri = await captureRef(scrollRef, {
              format: "png",
              result: "tmpfile",
              width: captureWidth * pixelRatio,
              snapshotContentContainer: true
            });

            if (!uri) {
              throw new Error("La captura no devolvio un archivo.");
            }

            if (pendingRef.current?.id !== requestId) {
              releaseCapture(uri);
              return;
            }

            resolvePending(requestId, uri);
            return;
          } catch (error) {
            lastError = error;
          }
        }

        const detail = lastError instanceof Error ? lastError.message : "Error desconocido";
        rejectPending(
          requestId,
          `No se pudo generar la imagen (${detail}). Intenta nuevamente o comparte el PDF.`
        );
      } finally {
        startedCaptureIdsRef.current.delete(requestId);
      }
    }
  }, [contentHeight, laidOutHeight, rejectPending, request, resolvePending]);

  if (!request) return null;

  const renderedHeight = contentHeight ?? 5000;

  return (
    <Modal animationType="none" onRequestClose={cancelPending} transparent visible>
      <View style={styles.modalRoot}>
        <ScrollView
          contentContainerStyle={styles.captureContent}
          pointerEvents="none"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={{
            width: captureWidth
          }}
        >
          <View
            collapsable={false}
            onLayout={(event) => {
              if (pendingRef.current?.id === request.id) {
                setLaidOutHeight(event.nativeEvent.layout.height);
              }
            }}
            style={{
              backgroundColor: "#ffffff",
              height: renderedHeight,
              width: captureWidth
            }}
          >
            <WebView
              androidLayerType="software"
              injectedJavaScript={REPORT_MEASUREMENT_SCRIPT}
              javaScriptEnabled
              key={request.id}
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
                height: renderedHeight,
                width: captureWidth
              }}
            />
          </View>
        </ScrollView>

        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <AppText variant="label">Generando imagen...</AppText>
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
  );

  function handleMessage(requestId: number, event: WebViewMessageEvent) {
    if (pendingRef.current?.id !== requestId) return;

    const measuredHeight = parseReportHeightMessage(event.nativeEvent.data);
    if (!measuredHeight) return;

    if (measuredHeight > maxContentHeight) {
      rejectPending(
        requestId,
        "El reporte es demasiado extenso para convertirlo en una sola imagen sin arriesgar la memoria del dispositivo. Comparte el PDF."
      );
      return;
    }

    setContentHeight(measuredHeight);
  }
});

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
