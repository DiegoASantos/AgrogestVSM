import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { CultivoEntity } from "../../../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { PlagaEnfermedadEtapaNivelEntity } from "../../../../visita-observaciones-sanitarias/infrastructure/persistence/entities/plaga-enfermedad-etapa-nivel.entity";
import { SubEtapaEntity } from "./sub-etapa.entity";
import { VisitaCampoEntity } from "./visita-campo.entity";

export type EtapaFenologicaType = "Etapa" | "Labor";

@Entity({ name: "etapas_fenologicas" })
export class EtapaFenologicaEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "cultivo_id",
    type: "bigint"
  })
  cultivoId!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 100
  })
  name!: string;

  @Column({
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @Column({
    name: "orden",
    type: "integer",
    nullable: true
  })
  sortOrder!: number | null;

  @Column({
    name: "tipo",
    type: "varchar",
    length: 100,
    default: () => "'Etapa'"
  })
  type!: EtapaFenologicaType;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @ManyToOne(() => CultivoEntity, (cultivo) => cultivo.etapasFenologicas, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "cultivo_id",
    referencedColumnName: "id"
  })
  cultivo!: CultivoEntity;

  @OneToMany(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.etapaFenologica)
  visitasCampo!: VisitaCampoEntity[];

  @OneToMany(() => SubEtapaEntity, (subEtapa) => subEtapa.etapaFenologica)
  subEtapas!: SubEtapaEntity[];

  @OneToMany(
    () => PlagaEnfermedadEtapaNivelEntity,
    (etapaNivel) => etapaNivel.etapaFenologica
  )
  plagasEnfermedadesNiveles!: PlagaEnfermedadEtapaNivelEntity[];
}
