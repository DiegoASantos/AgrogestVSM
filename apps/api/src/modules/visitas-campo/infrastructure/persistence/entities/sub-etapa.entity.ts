import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { EtapaFenologicaEntity } from "./etapa-fenologica.entity";

@Entity({ name: "sub_etapas" })
export class SubEtapaEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "etapa_fenologica_id",
    type: "bigint"
  })
  etapaFenologicaId!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 100
  })
  name!: string;

  @Column({
    name: "orden",
    type: "integer"
  })
  sortOrder!: number;

  @Column({
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @Column({
    name: "porcentaje",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true
  })
  percentage!: number | string | null;

  @Column({
    name: "estado",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @ManyToOne(
    () => EtapaFenologicaEntity,
    (etapaFenologica) => etapaFenologica.subEtapas,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "etapa_fenologica_id",
    referencedColumnName: "id"
  })
  etapaFenologica!: EtapaFenologicaEntity;
}
