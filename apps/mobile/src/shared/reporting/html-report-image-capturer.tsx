import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from "react";
import { ActivityIndicator, Modal, PixelRatio, StyleSheet, View } from "react-native";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { AppText } from "../components/app-text";
import { AppButton } from "../components/app-button";
import { theme } from "../constants/theme";
import {
  getMaxReportLogicalHeight,
  getReportPageSlices,
  getReportCaptureStartError,
  parseReportPageReadyMessage,
  parseReportHeightMessage
} from "./report-image-sizing";
import { REPORT_IMAGE_WIDTH } from "./report-config";

const CAPTURE_TIMEOUT_MS = 20_000;
const CAPTURE_SETTLE_MS = 500;
const PAGE_READY_TIMEOUT_MS = 5_000;
const MAX_IMAGE_PIXEL_AREA = 28_000_000;
const pixelRatio = PixelRatio.get();
const SAFE_PAGE_HEIGHT = 1500;
const REPORT_SIZE_MESSAGE = "agrogest-report-size";
const REPORT_PAGE_READY_MESSAGE = "agrogest-report-page-ready";

export const REPORT_IMAGE_CAPTURE_CANCELLED_ERROR = "ReportImageCaptureCancelledError";

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

type PageRender = {
  height: number;
  index: number;
  offsetY: number;
  renderId: number;
  total: number;
};

type PageReadyWaiter = {
  reject: (error: Error) => void;
  renderId: number;
  requestId: number;
  resolve: (hasContent: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type HtmlReportImageCapturerHandle = {
  capture: (html: string) => Promise<string[]>;
};

export const HtmlReportImageCapturer = forwardRef<HtmlReportImageCapturerHandle, object>(
  function HtmlReportImageCapturer(_, ref) {
    const captureViewRef = useRef<View>(null);
    const pendingRef = useRef<PendingCapture | null>(null);
    const captureSequenceRef = useRef(0);
    const pageRenderSequenceRef = useRef(0);
    const pageReadyWaiterRef = useRef<PageReadyWaiter | null>(null);
    const startedCaptureIdsRef = useRef(new Set<number>());
    const [request, setRequest] = useState<PendingCapture | null>(null);
    const [contentHeight, setContentHeight] = useState<number | null>(null);
    const [pageRender, setPageRender] = useState<PageRender | null>(null);

    const maxPageHeight = getMaxReportLogicalHeight(
      REPORT_IMAGE_WIDTH,
      pixelRatio,
      MAX_IMAGE_PIXEL_AREA
    );

    const abortPageRender = useCallback((message: string) => {
      const waiter = pageReadyWaiterRef.current;
      if (!waiter) return;

      clearTimeout(waiter.timeout);
      pageReadyWaiterRef.current = null;
      waiter.reject(new Error(message));
      setPageRender(null);
    }, []);

    const rejectPending = useCallback(
      (requestId: number, message: string) => {
        const pending = pendingRef.current;
        if (pending?.id !== requestId) return;

        abortPageRender(message);
        pendingRef.current = null;
        setRequest(null);
        setContentHeight(null);
        pending.reject(new Error(message));
      },
      [abortPageRender]
    );

    const resolvePending = useCallback((requestId: number, uris: string[]) => {
      const pending = pendingRef.current;
      if (pending?.id !== requestId) return;

      pendingRef.current = null;
      setRequest(null);
      setContentHeight(null);
      setPageRender(null);
      pending.resolve(uris.map(normalizeCaptureUri));
    }, []);

    const cancelPending = useCallback(() => {
      const pending = pendingRef.current;
      if (!pending) return;

      const error = new Error("La generacion de imagen fue cancelada.");
      error.name = REPORT_IMAGE_CAPTURE_CANCELLED_ERROR;
      abortPageRender(error.message);
      pendingRef.current = null;
      setRequest(null);
      setContentHeight(null);
      pending.reject(error);
    }, [abortPageRender]);

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
            setPageRender(null);
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
        abortPageRender("La generacion de imagen fue cancelada.");
        pendingRef.current = null;
        if (pending) {
          const error = new Error("La generacion de imagen fue cancelada.");
          error.name = REPORT_IMAGE_CAPTURE_CANCELLED_ERROR;
          pending.reject(error);
        }
      },
      [abortPageRender]
    );

    useEffect(() => {
      if (!request || !contentHeight || startedCaptureIdsRef.current.has(request.id)) {
        return undefined;
      }
      const requestId = request.id;

      const timeout = setTimeout(() => {
        void capturarConReintentos(requestId, contentHeight);
      }, CAPTURE_SETTLE_MS);

      return () => clearTimeout(timeout);

      async function capturarConReintentos(id: number, alturaTotal: number) {
        if (
          !captureViewRef.current ||
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
                const detalle =
                  error instanceof Error ? error.message : "Error desconocido";
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
      const alturaPagina = Math.min(maxPageHeight, SAFE_PAGE_HEIGHT);
      const paginas = getReportPageSlices(alturaTotal, alturaPagina);
      const uris: string[] = [];

      if (paginas.length === 0) {
        throw new Error("El reporte no tiene contenido capturable.");
      }

      try {
        for (let i = 0; i < paginas.length; i++) {
          if (pendingRef.current?.id !== id) {
            throw new Error("Cancelado");
          }

          const pagina = paginas[i];
          const hasContent = await preparePageRender(
            id,
            pagina.offsetY,
            pagina.height,
            i,
            paginas.length
          );

          if (pendingRef.current?.id !== id) {
            throw new Error("Cancelado");
          }

          if (!hasContent) {
            continue;
          }

          await wait(100);

          const uri = await captureRef(captureViewRef, {
            format: "png",
            result: "tmpfile"
          });

          if (!uri) {
            throw new Error("La captura no devolvio un archivo.");
          }

          uris.push(uri);
        }

        if (uris.length === 0) {
          throw new Error("El reporte no genero paginas con contenido.");
        }

        return uris;
      } catch (error) {
        if (uris.length > 0) {
          uris.forEach(releaseCapture);
        }
        throw error;
      } finally {
        setPageRender(null);
      }
    }

    function preparePageRender(
      requestId: number,
      offsetY: number,
      height: number,
      index: number,
      total: number
    ) {
      const renderId = ++pageRenderSequenceRef.current;

      return new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (pageReadyWaiterRef.current?.renderId !== renderId) return;

          pageReadyWaiterRef.current = null;
          reject(new Error("La pagina no termino de renderizarse a tiempo."));
        }, PAGE_READY_TIMEOUT_MS);

        pageReadyWaiterRef.current = {
          reject,
          renderId,
          requestId,
          resolve,
          timeout
        };

        setPageRender({ height, index, offsetY, renderId, total });
      });
    }

    return request ? (
      <Modal animationType="none" onRequestClose={cancelPending} transparent visible>
        <View style={styles.modalRoot}>
          <View
            collapsable={false}
            pointerEvents="none"
            ref={captureViewRef}
            style={[
              styles.captureSurface,
              {
                height: pageRender?.height ?? SAFE_PAGE_HEIGHT,
                width: REPORT_IMAGE_WIDTH
              }
            ]}
          >
            <WebView
              androidLayerType="software"
              injectedJavaScript={
                pageRender ? buildPageRenderScript(pageRender) : REPORT_MEASUREMENT_SCRIPT
              }
              javaScriptEnabled
              key={`${request.id}-${pageRender?.renderId ?? "measure"}`}
              onError={() => {
                if (pageRender) {
                  abortPageRender("No se pudo renderizar una pagina del reporte.");
                  return;
                }
                rejectPending(
                  request.id,
                  "No se pudo renderizar el reporte. Intenta nuevamente o comparte el PDF."
                );
              }}
              onMessage={(event) => handleMessage(request.id, event)}
              originWhitelist={["about:blank"]}
              scrollEnabled={false}
              source={{ baseUrl: "about:blank", html: request.html }}
              style={{
                backgroundColor: "#ffffff",
                height: pageRender?.height ?? SAFE_PAGE_HEIGHT,
                width: REPORT_IMAGE_WIDTH
              }}
            />
          </View>

          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <AppText variant="label">
                Generando imagen...
                {pageRender && pageRender.total > 1
                  ? ` (${pageRender.index + 1}/${pageRender.total})`
                  : ""}
              </AppText>
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

      const pageReady = parseReportPageReadyMessage(event.nativeEvent.data);
      if (pageReady) {
        const waiter = pageReadyWaiterRef.current;
        if (
          !waiter ||
          waiter.requestId !== requestId ||
          waiter.renderId !== pageReady.renderId
        ) {
          return;
        }

        clearTimeout(waiter.timeout);
        pageReadyWaiterRef.current = null;
        waiter.resolve(pageReady.hasContent);
        return;
      }

      if (pageRender) return;

      const measuredHeight = parseReportHeightMessage(event.nativeEvent.data);
      if (!measuredHeight) return;

      setContentHeight(measuredHeight);
    }
  }
);

function buildPageRenderScript(page: PageRender) {
  return `
    (function () {
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
          var root = document.documentElement;
          var body = document.body;
          root.style.height = "${page.height}px";
          root.style.overflow = "hidden";
          if (body) {
            body.style.position = "relative";
            body.style.top = "-${page.offsetY}px";
          }

          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              var hasContent = false;
              if (body) {
                var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
                var node = walker.nextNode();
                while (node && !hasContent) {
                  if ((node.nodeValue || "").trim()) {
                    var range = document.createRange();
                    range.selectNodeContents(node);
                    var rects = Array.prototype.slice.call(range.getClientRects());
                    hasContent = rects.some(function (rect) {
                      return rect.bottom > 0 && rect.top < ${page.height} && rect.width > 0 && rect.height > 0;
                    });
                  }
                  node = walker.nextNode();
                }

                if (!hasContent) {
                  var visualElements = Array.prototype.slice.call(
                    body.querySelectorAll("img,svg,canvas,table,hr")
                  );
                  hasContent = visualElements.some(function (element) {
                    var rect = element.getBoundingClientRect();
                    return rect.bottom > 0 && rect.top < ${page.height} && rect.width > 0 && rect.height > 0;
                  });
                }
              }

              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "${REPORT_PAGE_READY_MESSAGE}",
                renderId: ${page.renderId},
                hasContent: hasContent
              }));
            });
          });
        });
      };

      if (document.readyState === "complete") {
        waitForAssets();
      } else {
        window.addEventListener("load", waitForAssets, { once: true });
      }
    })();
    true;
  `;
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
  captureSurface: {
    backgroundColor: "#ffffff",
    left: 0,
    position: "absolute",
    top: 0
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
