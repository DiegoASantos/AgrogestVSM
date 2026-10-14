import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { appConfig } from "../../../../config/app.config";

const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_RECORDS = 20_000;
const TIMEOUT_MS = 8_000;

export type SystraceReception = Record<string, unknown>;

@Injectable()
export class RecepcionSystraceClient {
  constructor(@Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>) {}

  async list(): Promise<SystraceReception[]> {
    const { receptionUrl, apiKey } = this.config.systrace;
    if (!receptionUrl || !apiKey) {
      throw new ServiceUnavailableException("La consulta de Systrace no está configurada.");
    }
    let url: URL;
    try {
      url = new URL(receptionUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("invalid URL");
      }
    } catch {
      throw new ServiceUnavailableException("La consulta de Systrace no está configurada.");
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!response.ok || !response.body) throw new Error("upstream response");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel();
          throw new Error("upstream size");
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!isRecord(payload) || payload.success !== true || !Array.isArray(payload.data) ||
          payload.data.length > MAX_RECORDS || !payload.data.every(isRecord)) {
        throw new Error("upstream schema");
      }
      return payload.data;
    } catch {
      throw new ServiceUnavailableException("Systrace no está disponible o devolvió datos inválidos.");
    }
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
