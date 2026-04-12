import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { VisitaProductoRecomendadoEntity } from "./visita-producto-recomendado.entity";

@Entity({ name: "frecuencias_aplicacion" })
export class FrecuenciaAplicacionEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 100
  })
  name!: string;

  @Column({
    name: "dias_intervalo",
    type: "integer",
    nullable: true
  })
  intervalDays!: number | null;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @OneToMany(
    () => VisitaProductoRecomendadoEntity,
    (visitaProductoRecomendado) =>
      visitaProductoRecomendado.frecuenciaAplicacion
  )
  visitaProductosRecomendados!: VisitaProductoRecomendadoEntity[];
}
