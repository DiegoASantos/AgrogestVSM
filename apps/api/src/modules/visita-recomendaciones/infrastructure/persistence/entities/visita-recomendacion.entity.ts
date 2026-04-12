import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { TipoRecomendacionEntity } from "./tipo-recomendacion.entity";

@Entity({ name: "visita_recomendaciones" })
export class VisitaRecomendacionEntity {
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
    name: "tipo_recomendacion_id",
    type: "bigint"
  })
  tipoRecomendacionId!: string;

  @Column({
    name: "aplica",
    type: "boolean",
    default: () => "true"
  })
  applies!: boolean;

  @Column({
    name: "detalle",
    type: "text",
    nullable: true
  })
  detail!: string | null;

  @ManyToOne(
    () => VisitaCampoEntity,
    (visitaCampo) => visitaCampo.recomendaciones,
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
    () => TipoRecomendacionEntity,
    (tipoRecomendacion) => tipoRecomendacion.visitaRecomendaciones,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "tipo_recomendacion_id",
    referencedColumnName: "id"
  })
  tipoRecomendacion!: TipoRecomendacionEntity;
}
