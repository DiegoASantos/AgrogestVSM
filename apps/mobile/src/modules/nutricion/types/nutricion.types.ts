export type NutrientDetailCatalogItem = {
  id: string;
  nutrientId: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type NutrientCatalogItem = {
  id: string;
  cultivoId: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  details: NutrientDetailCatalogItem[];
};
