import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { NivelIncidenciaEntity } from "./nivel-incidencia.entity";
import { PlagaEnfermedadEntity } from "./plaga-enfermedad.entity";

@Entity({ name: "visita_observaciones_sanitarias" })
export class VisitaObservacionSanitariaEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "visita_id",
    type: "bigint"
  })
  visitaId!: string;

  @Column({
    name: "plaga_enfermedad_id",
    type: "bigint"
  })
  plagaEnfermedadId!: string;

  @Column({
    name: "nivel_incidencia_id",
    type: "smallint",
    nullable: true
  })
  nivelIncidenciaId!: number | null;

  @Column({
    name: "observacion",
    type: "text",
    nullable: true
  })
  observation!: string | null;

  @ManyToOne(
    () => VisitaCampoEntity,
    (visitaCampo) => visitaCampo.observacionesSanitarias,
    {
      onDelete: "CASCADE",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "visita_id",
    referencedColumnName: "id"
  })
  visita!: VisitaCampoEntity;

  @ManyToOne(
    () => PlagaEnfermedadEntity,
    (plagaEnfermedad) => plagaEnfermedad.visitaObservacionesSanitarias,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "plaga_enfermedad_id",
    referencedColumnName: "id"
  })
  plagaEnfermedad!: PlagaEnfermedadEntity;

  @ManyToOne(
    () => NivelIncidenciaEntity,
    (nivelIncidencia) => nivelIncidencia.visitaObservacionesSanitarias,
    {
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "nivel_incidencia_id",
    referencedColumnName: "id"
  })
  nivelIncidencia!: NivelIncidenciaEntity | null;
}
