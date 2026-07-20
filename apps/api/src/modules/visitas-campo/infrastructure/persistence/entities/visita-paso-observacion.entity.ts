import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

import { VisitaCampoEntity } from "./visita-campo.entity";

@Entity({ name: "visita_paso_observaciones" })
export class VisitaPasoObservacionEntity {
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
    name: "paso",
    type: "smallint"
  })
  stepNumber!: number;

  @Column({
    name: "observacion",
    type: "text",
    nullable: true
  })
  observation!: string | null;

  @Column({
    name: "recomendacion",
    type: "text",
    nullable: true
  })
  recommendation!: string | null;

  @Column({ name: "finalizado_at", type: "timestamptz", nullable: true })
  finalizedAt!: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz"
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamptz"
  })
  updatedAt!: Date;

  @ManyToOne(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.stepNotes, {
    onDelete: "CASCADE",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "visita_id",
    referencedColumnName: "id"
  })
  visita!: VisitaCampoEntity;
}
