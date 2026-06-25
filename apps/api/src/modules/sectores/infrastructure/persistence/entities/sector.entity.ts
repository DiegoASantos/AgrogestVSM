import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { ParcelaEntity } from "../../../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { DistritoEntity } from "../../../../geografias/infrastructure/persistence/entities/distrito.entity";

@Entity({ name: "sectores" })
@Index("uq_sectores_distrito_nombre", ["distritoId", "name"], {
  unique: true
})
export class SectorEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "distrito_id",
    type: "bigint"
  })
  distritoId!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 120
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

  @ManyToOne(() => DistritoEntity, (distrito) => distrito.sectores, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "distrito_id",
    referencedColumnName: "id"
  })
  distrito!: DistritoEntity;

  @OneToMany(() => ParcelaEntity, (parcela) => parcela.sector)
  parcelas!: ParcelaEntity[];
}
