import { sectoresRepository } from "../repositories/sectores.repository";

export const sectoresService = {
  async getAll() {
    return sectoresRepository.getAll();
  },

  async getById(id: string) {
    const sector = sectoresRepository.getById(id);

    if (!sector) {
      throw new Error("No se encontro el sector solicitado.");
    }

    return sector;
  },

  async getByProductorId(productorId: string) {
    return sectoresRepository.getByProductorId(productorId);
  }
};
