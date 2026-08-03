export type FertilizanteCatalogo = {
  id: string;
  publicId: string;
  name: string;
  type: string;
  concentracion: string | null;
  unidadMedida: string | null;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
};

export type CreateFertilizanteDraft = {
  publicId: string;
  name: string;
  tipo: string;
  concentracion: string | null;
  unidadMedida: string | null;
};
