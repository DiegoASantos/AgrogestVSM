import { productoresRepository } from "../repositories/productores.repository";

export const productoresService = {
  async getAll() {
    return productoresRepository.getAll();
  },

  async getById(id: string) {
    const productor = productoresRepository.getById(id);

    if (!productor) {
      throw new Error("No se encontro el productor solicitado.");
    }

    return productor;
  }
};
