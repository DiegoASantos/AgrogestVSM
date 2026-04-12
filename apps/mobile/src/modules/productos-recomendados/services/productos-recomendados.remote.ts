import { apiRequest } from "../../../shared/services";
import type {
  ApplicationFrequencyCatalogItem,
  ProductCatalogItem,
  VisitaProductoRecomendado
} from "../types";

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

export const productosRecomendadosRemote = {
  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaProductoRecomendado[]>(
      `/visitas-campo/${visitaId}/productos-recomendados`
    );
  },

  create(visitaId: string, input: CreateProductoRecomendadoInput) {
    return apiRequest<VisitaProductoRecomendado>(
      `/visitas-campo/${visitaId}/productos-recomendados`,
      {
        method: "POST",
        body: input
      }
    );
  },

  update(id: string, input: UpdateProductoRecomendadoInput) {
    return apiRequest<VisitaProductoRecomendado>(
      `/productos-recomendados-visita/${id}`,
      {
        method: "PATCH",
        body: input
      }
    );
  },

  remove(id: string) {
    return apiRequest<VisitaProductoRecomendado>(
      `/productos-recomendados-visita/${id}`,
      {
        method: "DELETE"
      }
    );
  },

  getProducts() {
    return apiRequest<ProductCatalogItem[]>("/productos");
  },

  getApplicationFrequencies() {
    return apiRequest<ApplicationFrequencyCatalogItem[]>(
      "/frecuencias-aplicacion"
    );
  }
};
