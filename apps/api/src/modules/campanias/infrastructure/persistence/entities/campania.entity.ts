import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { CultivoEntity } from "../../../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

@Entity({ name: "campanias" })
export class CampaniaEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 100
  })
  name!: string;

  @Column({
    name: "cultivo_id",
    type: "bigint"
  })
  cultivoId!: string;

  @Column({
    name: "fecha_inicio",
    type: "date"
  })
  startDate!: string;

  @Column({
    name: "fecha_fin",
    type: "date",
    nullable: true
  })
  endDate!: string | null;

  @Column({
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @Column({
    name: "activa",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @Column({
    name: "creado_at",
    type: "timestamptz",
    default: () => "now()"
  })
  createdAt!: Date;

  @Column({
    name: "actualizado_at",
    type: "timestamptz",
    default: () => "now()"
  })
  updatedAt!: Date;

  @ManyToOne(() => CultivoEntity, (cultivo) => cultivo.campaigns, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "cultivo_id",
    referencedColumnName: "id"
  })
  cultivo!: CultivoEntity;

  @OneToMany(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.campania)
  visitasCampo!: VisitaCampoEntity[];
}
