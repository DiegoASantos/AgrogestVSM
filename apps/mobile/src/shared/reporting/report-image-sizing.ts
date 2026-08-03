const REPORT_SIZE_MESSAGE = "agrogest-report-size";

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
