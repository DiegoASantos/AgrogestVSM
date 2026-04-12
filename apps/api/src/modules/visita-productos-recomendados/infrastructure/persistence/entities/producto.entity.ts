import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { ProductoIngredienteEntity } from "./producto-ingrediente.entity";
import { VisitaProductoRecomendadoEntity } from "./visita-producto-recomendado.entity";

@Entity({ name: "productos" })
export class ProductoEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 150
  })
  name!: string;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @OneToMany(
    () => VisitaProductoRecomendadoEntity,
    (visitaProductoRecomendado) => visitaProductoRecomendado.producto
  )
  visitaProductosRecomendados!: VisitaProductoRecomendadoEntity[];

  @OneToMany(
    () => ProductoIngredienteEntity,
    (productoIngrediente) => productoIngrediente.producto
  )
  productoIngredientes!: ProductoIngredienteEntity[];
}
