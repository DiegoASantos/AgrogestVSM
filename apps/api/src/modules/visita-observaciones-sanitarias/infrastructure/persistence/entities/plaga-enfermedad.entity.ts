import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { VisitaObservacionSanitariaEntity } from "./visita-observacion-sanitaria.entity";

@Entity({ name: "plagas_enfermedades" })
export class PlagaEnfermedadEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "nombre_cientifico",
    type: "varchar",
    length: 160,
    nullable: true
  })
  scientificName!: string | null;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 120
  })
  name!: string;

  @Column({
    name: "tipo",
    type: "varchar",
    length: 20
  })
  type!: string;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @OneToMany(
    () => VisitaObservacionSanitariaEntity,
    (visitaObservacionSanitaria) => visitaObservacionSanitaria.plagaEnfermedad
  )
  visitaObservacionesSanitarias!: VisitaObservacionSanitariaEntity[];
}
