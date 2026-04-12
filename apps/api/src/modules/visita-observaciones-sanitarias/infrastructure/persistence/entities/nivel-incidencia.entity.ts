import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { VisitaObservacionSanitariaEntity } from "./visita-observacion-sanitaria.entity";

@Entity({ name: "niveles_incidencia" })
export class NivelIncidenciaEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "smallint"
  })
  id!: number;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 30
  })
  name!: string;

  @Column({
    name: "valor_orden",
    type: "smallint"
  })
  sortOrder!: number;

  @OneToMany(
    () => VisitaObservacionSanitariaEntity,
    (visitaObservacionSanitaria) => visitaObservacionSanitaria.nivelIncidencia
  )
  visitaObservacionesSanitarias!: VisitaObservacionSanitariaEntity[];
}
