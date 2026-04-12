import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { ProductoIngredienteEntity } from "./producto-ingrediente.entity";

@Entity({ name: "ingredientes_activos" })
export class IngredienteActivoEntity {
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
    () => ProductoIngredienteEntity,
    (productoIngrediente) => productoIngrediente.ingredienteActivo
  )
  productoIngredientes!: ProductoIngredienteEntity[];
}
