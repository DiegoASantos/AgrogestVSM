import { productosRecomendadosRepository } from "../repositories/productos-recomendados.repository";

type CreateProductoRecomendadoInput = {
  productId: string;
  dose: string;
  applicationFrequencyId?: string;
  instructions?: string;
};

type UpdateProductoRecomendadoInput = {
  productId?: string;
  dose?: string;
  applicationFrequencyId?: string | null;
  instructions?: string | null;
};

export const productosRecomendadosService = {
  getByVisitaId(visitaId: string) {
    return Promise.resolve(
      productosRecomendadosRepository.getByVisitaLocalId(visitaId)
    );
  },

  create(visitaId: string, input: CreateProductoRecomendadoInput) {
    return Promise.resolve(
      productosRecomendadosRepository.insert(input, visitaId)
    );
  },

  update(id: string, input: UpdateProductoRecomendadoInput) {
    return Promise.resolve(productosRecomendadosRepository.update(id, input));
  },

  remove(id: string) {
    productosRecomendadosRepository.deleteById(id);
    return Promise.resolve();
  },

  getProducts() {
    return Promise.resolve(productosRecomendadosRepository.getProducts());
  },

  getApplicationFrequencies() {
    return Promise.resolve(
      productosRecomendadosRepository.getApplicationFrequencies()
    );
  }
};
