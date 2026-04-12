export type ProductItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ProductPayload = {
  name: string;
  isActive?: boolean;
};

export type ActiveIngredientItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ActiveIngredientPayload = {
  name: string;
  isActive?: boolean;
};

export type ProductIngredientItem = {
  productId: string;
  ingredientActiveId: string;
  product: ProductItem;
  ingredientActive: ActiveIngredientItem;
};

export type ProductIngredientPayload = {
  productId: string;
  ingredientActiveId: string;
};
