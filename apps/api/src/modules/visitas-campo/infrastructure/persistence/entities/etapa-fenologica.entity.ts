import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { CultivoEntity } from "../../../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { VisitaCampoEntity } from "./visita-campo.entity";

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
}
