import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

import { TipoRiegoEntity } from "../../../../operaciones-campo/infrastructure/persistence/entities/tipo-riego.entity";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

@Entity({ name: "visita_riegos" })
export class VisitaRiegoEntity {
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
    name: "tipo_riego_id",
    type: "bigint"
  })
  tipoRiegoId!: string;

  @CreateDateColumn({
    name: "creado_at",
    type: "timestamptz"
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "actualizado_at",
    type: "timestamptz"
  })
  updatedAt!: Date;

  @ManyToOne(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.riego, {
    onDelete: "CASCADE",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "visita_id",
    referencedColumnName: "id"
  })
  visita!: VisitaCampoEntity;

  @ManyToOne(() => TipoRiegoEntity, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "tipo_riego_id",
    referencedColumnName: "id"
  })
  tipoRiego!: TipoRiegoEntity;
}
