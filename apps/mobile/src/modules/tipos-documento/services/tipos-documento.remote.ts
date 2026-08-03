import { apiRequest } from "../../../shared/services";
import type { TipoDocumento } from "../types/tipos-documento.types";

export const tiposDocumentoRemote = {
  obtenerTodos() {
    return apiRequest<TipoDocumento[]>("/tipos-documento");
  }
};
