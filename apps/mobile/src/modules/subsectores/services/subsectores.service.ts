import { subsectoresRepository } from "../repositories/subsectores.repository";

export const subsectoresService = {
  async getAll() {
    return subsectoresRepository.getAll();
  },

  async getBySectorId(sectorId: string) {
    return subsectoresRepository.getBySectorId(sectorId);
  },

  async getByProductorAndSector(productorId: string, sectorId: string) {
    return subsectoresRepository.getByProductorAndSector(productorId, sectorId);
  }
};
