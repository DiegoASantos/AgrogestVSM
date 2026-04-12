import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn
} from "typeorm";

import { IngredienteActivoEntity } from "./ingrediente-activo.entity";
import { ProductoEntity } from "./producto.entity";

@Entity({ name: "producto_ingredientes" })
export class ProductoIngredienteEntity {
  @PrimaryColumn({
    name: "producto_id",
    type: "bigint"
  })
  productoId!: string;

  @PrimaryColumn({
    name: "ingrediente_activo_id",
    type: "bigint"
  })
  ingredientActiveId!: string;

  @ManyToOne(() => ProductoEntity, (producto) => producto.productoIngredientes, {
    nullable: false
  })
  @JoinColumn({
    name: "producto_id"
  })
  producto!: ProductoEntity;

  @ManyToOne(
    () => IngredienteActivoEntity,
    (ingredienteActivo) => ingredienteActivo.productoIngredientes,
    {
      nullable: false
    }
  )
  @JoinColumn({
    name: "ingrediente_activo_id"
  })
  ingredienteActivo!: IngredienteActivoEntity;
}
