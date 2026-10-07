import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { EtapaFenologicaEntity } from "./etapa-fenologica.entity";
import { SubEtapaEntity } from "./sub-etapa.entity";
import { VisitaCampoEntity } from "./visita-campo.entity";

@Entity({ name: "visita_etapas_fenologicas" })
@Index("uq_visita_etapas_visita_etapa", ["visitaId", "etapaFenologicaId"], { unique: true })
@Index("uq_visita_etapas_visita_orden", ["visitaId", "order"], { unique: true })
export class VisitaEtapaFenologicaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "visita_id", type: "bigint" })
  visitaId!: string;

  @Column({ name: "etapa_fenologica_id", type: "bigint" })
  etapaFenologicaId!: string;

  @Column({ name: "sub_etapa_id", type: "bigint", nullable: true })
  subEtapaId!: string | null;

  @Column({ name: "porcentaje_parcela", type: "smallint", nullable: true })
  coveragePercentage!: number | null;

  @Column({ name: "porcentaje_avance_labor", type: "numeric", precision: 5, scale: 2, nullable: true })
  laborProgressPercentage!: string | null;

  @Column({ name: "orden", type: "integer" })
  order!: number;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaCampoEntity, (visit) => visit.phenologicalStages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "visita_id", referencedColumnName: "id" })
  visit!: VisitaCampoEntity;

  @ManyToOne(() => EtapaFenologicaEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "etapa_fenologica_id", referencedColumnName: "id" })
  stage!: EtapaFenologicaEntity;

  @ManyToOne(() => SubEtapaEntity, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "sub_etapa_id", referencedColumnName: "id" })
  subStage!: SubEtapaEntity | null;
}
