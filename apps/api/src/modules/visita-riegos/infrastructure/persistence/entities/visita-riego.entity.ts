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

  @Column({
    name: "fuente_agua",
    type: "varchar",
    length: 20,
    nullable: true
  })
  fuenteAgua!: string | null;

  @Column({
    name: "tipo_suelo",
    type: "varchar",
    length: 20,
    nullable: true
  })
  tipoSuelo!: string | null;

  @Column({
    name: "humedad_suelo",
    type: "varchar",
    length: 25,
    nullable: true
  })
  humedadSuelo!: string | null;

  @Column({
    name: "estres_hidrico",
    type: "boolean",
    nullable: true
  })
  estresHidrico!: boolean | null;

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
