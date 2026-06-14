import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import type { OrganoAfectado } from "../../../domain/organo-afectado";
import { VisitaObservacionSanitariaEntity } from "./visita-observacion-sanitaria.entity";

@Entity({ name: "visita_observacion_sanitaria_organos" })
export class VisitaObservacionSanitariaOrganoEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "visita_observacion_sanitaria_id",
    type: "bigint"
  })
  visitaObservacionSanitariaId!: string;

  @Column({
    name: "organo",
    type: "varchar",
    length: 20
  })
  organo!: OrganoAfectado;

  @Column({
    name: "creado_at",
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP"
  })
  creadoAt!: Date;

  @ManyToOne(
    () => VisitaObservacionSanitariaEntity,
    (observacion) => observacion.organosAfectados,
    {
      onDelete: "CASCADE",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "visita_observacion_sanitaria_id",
    referencedColumnName: "id"
  })
  observacionSanitaria!: VisitaObservacionSanitariaEntity;
}
