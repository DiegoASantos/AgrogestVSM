import { useEffect, useState } from "react";

export type CatalogDownloadStatus = {
  isDownloading: boolean;
  error: string | null;
};

type StatusListener = (status: CatalogDownloadStatus) => void;

let currentStatus: CatalogDownloadStatus = { isDownloading: false, error: null };
const listeners = new Set<StatusListener>();

function emit() {
  for (const listener of listeners) {
    listener(currentStatus);
  }
}

export function getCatalogDownloadStatus(): CatalogDownloadStatus {
  return currentStatus;
}

export function notifyCatalogDownloadStarted() {
  currentStatus = { isDownloading: true, error: null };
  emit();
}

export function notifyCatalogDownloadCompleted(error?: string) {
  currentStatus = { isDownloading: false, error: error ?? null };
  emit();
}

export function subscribeCatalogDownloadStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCatalogDownloadStatus(): CatalogDownloadStatus {
  const [status, setStatus] = useState(getCatalogDownloadStatus);

  useEffect(() => {
    return subscribeCatalogDownloadStatus(setStatus);
  }, []);

  return status;
}
