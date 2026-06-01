import { parcelasRepository } from "../repositories/parcelas.repository";

export const parcelasService = {
  async getAll() {
    return parcelasRepository.getAll();
  },

  async getBySectorId(sectorId: string) {
    return parcelasRepository.getBySectorId(sectorId);
  },

  async getByProductorAndSector(productorId: string, sectorId: string) {
    return parcelasRepository.getByProductorAndSector(productorId, sectorId);
  },

  async getById(id: string) {
    const parcela = parcelasRepository.getById(id);

    if (!parcela) {
      throw new Error("No se encontro la parcela solicitada.");
    }

    return parcela;
  }
};
