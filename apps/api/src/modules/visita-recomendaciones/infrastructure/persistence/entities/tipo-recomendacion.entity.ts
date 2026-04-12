import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { VisitaRecomendacionEntity } from "./visita-recomendacion.entity";

@Entity({ name: "tipos_recomendacion" })
export class TipoRecomendacionEntity {
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
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @OneToMany(
    () => VisitaRecomendacionEntity,
    (visitaRecomendacion) => visitaRecomendacion.tipoRecomendacion
  )
  visitaRecomendaciones!: VisitaRecomendacionEntity[];
}
