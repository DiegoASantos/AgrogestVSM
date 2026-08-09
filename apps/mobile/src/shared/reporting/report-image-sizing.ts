const REPORT_SIZE_MESSAGE = "agrogest-report-size";
const REPORT_PAGE_READY_MESSAGE = "agrogest-report-page-ready";

export type ReportPageSlice = {
  height: number;
  offsetY: number;
};

export type ReportPageReadyMessage = {
  hasContent: boolean;
  renderId: number;
};

export function parseReportHeightMessage(value: string): number | null {
  try {
    const payload = JSON.parse(value) as { height?: unknown; type?: unknown };
    if (payload.type !== REPORT_SIZE_MESSAGE || typeof payload.height !== "number") {
      return null;
    }

    if (!Number.isFinite(payload.height) || payload.height <= 0) return null;
    return Math.ceil(payload.height);
  } catch {
    return null;
  }
}

export function parseReportPageReadyMessage(
  value: string
): ReportPageReadyMessage | null {
  try {
    const payload = JSON.parse(value) as {
      hasContent?: unknown;
      renderId?: unknown;
      type?: unknown;
    };

    if (
      payload.type !== REPORT_PAGE_READY_MESSAGE ||
      typeof payload.renderId !== "number" ||
      !Number.isInteger(payload.renderId) ||
      payload.renderId <= 0 ||
      typeof payload.hasContent !== "boolean"
    ) {
      return null;
    }

    return {
      hasContent: payload.hasContent,
      renderId: payload.renderId
    };
  } catch {
    return null;
  }
}

export function getReportPageSlices(
  contentHeight: number,
  pageHeight: number
): ReportPageSlice[] {
  if (
    !Number.isFinite(contentHeight) ||
    !Number.isFinite(pageHeight) ||
    contentHeight <= 0 ||
    pageHeight <= 0
  ) {
    return [];
  }

  const safeContentHeight = Math.ceil(contentHeight);
  const safePageHeight = Math.max(1, Math.floor(pageHeight));
  const pages: ReportPageSlice[] = [];

  for (let offsetY = 0; offsetY < safeContentHeight; offsetY += safePageHeight) {
    pages.push({
      height: Math.min(safePageHeight, safeContentHeight - offsetY),
      offsetY
    });
  }

  return pages;
}

export function getMaxReportLogicalHeight(
  width: number,
  pixelRatio: number,
  maxPixelArea: number
) {
  const safeWidth = Math.max(1, width);
  const safeRatio = Math.max(1, pixelRatio);
  return Math.max(1, Math.floor(maxPixelArea / (safeWidth * safeRatio * safeRatio)));
}

export function getReportCaptureStartError(
  hasPendingRequest: boolean,
  nativeCapturesInFlight: number
) {
  if (hasPendingRequest) {
    return "Ya se esta generando una imagen. Espera a que termine.";
  }

  if (nativeCapturesInFlight > 0) {
    return "Una captura anterior sigue finalizando. Comparte el PDF o vuelve a abrir esta pantalla.";
  }

  return null;
}
