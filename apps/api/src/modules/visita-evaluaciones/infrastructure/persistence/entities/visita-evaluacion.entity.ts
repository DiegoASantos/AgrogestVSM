import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

@Entity({ name: "visita_evaluaciones" })
export class VisitaEvaluacionEntity {
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
    name: "orden",
    type: "smallint"
  })
  order!: number;

  @Column({
    name: "porcentaje",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true
  })
  percentage!: string | null;

  @Column({
    name: "descripcion",
    type: "varchar",
    length: 200
  })
  description!: string;

  @ManyToOne(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.evaluaciones, {
    onDelete: "CASCADE",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "visita_id",
    referencedColumnName: "id"
  })
  visita!: VisitaCampoEntity;
}
