import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { NutrienteEntity } from "../../../../nutricion/infrastructure/persistence/entities/nutriente.entity";

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
    name: "nutriente_id",
    type: "bigint",
    nullable: true
  })
  nutrientId!: string | null;

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
    name: "incidencia_porcentaje",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true
  })
  incidencePercentage!: string | null;

  @Column({
    name: "descripcion",
    type: "varchar",
    length: 200
  })
  description!: string;

  @Column({
    name: "organos_afectados",
    type: "text",
    array: true,
    default: () => "'{}'"
  })
  organosAfectados!: string[];

  @ManyToOne(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.evaluaciones, {
    onDelete: "CASCADE",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "visita_id",
    referencedColumnName: "id"
  })
  visita!: VisitaCampoEntity;

  @ManyToOne(() => NutrienteEntity, {
    nullable: true,
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "nutriente_id",
    referencedColumnName: "id"
  })
  nutrient!: NutrienteEntity | null;
}
