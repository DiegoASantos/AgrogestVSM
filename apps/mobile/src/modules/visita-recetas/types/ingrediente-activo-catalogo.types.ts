export type IngredienteActivoCatalogo = {
  id: string;
  publicId: string;
  name: string;
  description: string | null;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
};

export type CreateIngredienteActivoDraft = {
  publicId: string;
  name: string;
  description: string | null;
};
