import { parcelasRepository } from "../repositories/parcelas.repository";
import { productoresRepository } from "../../productores/repositories/productores.repository";
import { getDatabase } from "../../../shared/database/connection";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";

export const parcelasService = {
  async getAll() {
    return parcelasRepository.getAll();
  },

  async getBySectorId(sectorId: string) {
    return parcelasRepository.getBySectorId(sectorId);
  },

  async getBySubsectorId(subsectorId: string) {
    return parcelasRepository.getBySubsectorId(subsectorId);
  },

  async getByProductorAndSubsector(productorId: string, subsectorId: string) {
    return parcelasRepository.getByProductorAndSubsector(productorId, subsectorId);
  },

  async getByProductorId(productorId: string) {
    return parcelasRepository.getByProductorId(productorId);
  },

  async getById(id: string) {
    const parcela = parcelasRepository.getById(id);

    if (!parcela) {
      throw new Error("No se encontro la parcela solicitada.");
    }

    return parcela;
  },

  async activateForVisit(id: string) {
    const parcela = parcelasRepository.getById(id);

    if (!parcela) {
      throw new Error("No se encontro la parcela solicitada.");
    }

    if (parcela.isActive) {
      return parcela;
    }

    const db = getDatabase();
    const activatedAt = getNowIsoString();

    db.withTransactionSync(() => {
      parcelasRepository.update(id, {
        isActive: true,
        syncStatus: "pending",
        syncErrorMessage: null
      });
      productoresRepository.update(parcela.productorId, { isActive: true });
      insertSyncOutboxEntry(db, {
        entityType: "parcelas",
        entityLocalId: id,
        operation: "update",
        createdAt: activatedAt
      });
    });

    return { ...parcela, isActive: true, syncStatus: "pending" as const };
  }
};
