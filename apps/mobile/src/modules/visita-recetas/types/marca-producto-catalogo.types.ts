export type MarcaProductoCatalogo = {
  id: string;
  publicId: string;
  name: string;
  tipoProductoId: string | null;
  ingredienteActivoId: string | null;
  ingredienteActivoNombre: string | null;
  concentracion: string | null;
  unidadMedida: string | null;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
};

export type CreateMarcaProductoDraft = {
  publicId: string;
  name: string;
  tipoProductoId: string;
  ingredienteActivoId: string | null;
  concentracion: string | null;
  unidadMedida: string | null;
};
