import { climaCacheRepository } from "../repositories/clima-cache.repository";
import type { ClimateLoadResult } from "../types/clima.types";
import { climaRemote } from "./clima.remote";

export const climaService = {
  async getForParcela(parcelaId: string, isOnline: boolean): Promise<ClimateLoadResult> {
    if (isOnline) {
      try {
        const climate = await climaRemote.getByParcelaId(parcelaId);
        climaCacheRepository.save(climate);
        return { climate, isCached: false, isStale: false };
      } catch {
        // A cached value is safer and more useful than hiding the last estimate.
      }
    }

    const cached = climaCacheRepository.get(parcelaId);
    if (!cached) {
      throw new Error("No hay una estimación climática guardada para esta parcela.");
    }

    return {
      climate: cached.climate,
      isCached: true,
      isStale: new Date(cached.expiresAt).getTime() <= Date.now()
    };
  }
};
