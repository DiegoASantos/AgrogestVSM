import { productoresRepository } from "../repositories/productores.repository";

export const productoresService = {
  async getAll() {
    return productoresRepository.getAll();
  },

  async searchByName(query: string, limit: number, offset: number) {
    return productoresRepository.searchByName(query, limit, offset);
  },

  async countByName(query: string) {
    return productoresRepository.countByName(query);
  },

  async getById(id: string) {
    const productor = productoresRepository.getById(id);

    if (!productor) {
      throw new Error("No se encontro el productor solicitado.");
    }

    return productor;
  },

  async getBySectorId(sectorId: string) {
    return productoresRepository.getBySectorId(sectorId);
  }
};
