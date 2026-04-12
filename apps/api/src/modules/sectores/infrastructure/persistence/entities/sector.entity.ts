import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { ParcelaEntity } from "../../../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../../../../productores/infrastructure/persistence/entities/productor.entity";

@Entity({ name: "sectores" })
export class SectorEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "productor_id",
    type: "bigint"
  })
  productorId!: string;

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

  @ManyToOne(() => ProductorEntity, (productor) => productor.sectors, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "productor_id",
    referencedColumnName: "id"
  })
  productor!: ProductorEntity;

  @OneToMany(() => ParcelaEntity, (parcela) => parcela.sector)
  parcelas!: ParcelaEntity[];
}
