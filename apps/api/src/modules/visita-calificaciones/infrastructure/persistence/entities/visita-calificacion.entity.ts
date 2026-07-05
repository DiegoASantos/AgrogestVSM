import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import type { CalificacionModulo } from "../../../domain/weight-matrix";

@Entity({ name: "visita_calificaciones" })
export class VisitaCalificacionEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "visita_id", type: "bigint" })
  visitaId!: string;

  @Column({ name: "modulo", type: "varchar", length: 50 })
  modulo!: CalificacionModulo;

  @Column({ name: "puntaje", type: "smallint" })
  puntaje!: number;

  @Column({ name: "observacion", type: "text", nullable: true })
  observacion!: string | null;

  @Column({ name: "justificado", type: "boolean", nullable: true })
  justificado!: boolean | null;

  @Column({
    name: "categoria_justificacion",
    type: "varchar",
    length: 100,
    nullable: true
  })
  categoriaJustificacion!: string | null;

  @Column({
    name: "motivo_justificacion",
    type: "varchar",
    length: 200,
    nullable: true
  })
  motivoJustificacion!: string | null;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaCampoEntity, {
    onDelete: "CASCADE",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({ name: "visita_id", referencedColumnName: "id" })
  visita!: VisitaCampoEntity;
}
