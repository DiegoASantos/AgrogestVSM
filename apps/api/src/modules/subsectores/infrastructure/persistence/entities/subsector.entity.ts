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
import { SectorEntity } from "../../../../sectores/infrastructure/persistence/entities/sector.entity";

@Entity({ name: "subsectores" })
@Index("uq_subsectores_sector_nombre", ["sectorId", "name"], {
  unique: true
})
export class SubsectorEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "public_id",
    type: "uuid",
    default: () => "gen_random_uuid()"
  })
  publicId!: string;

  @Column({
    name: "sector_id",
    type: "bigint"
  })
  sectorId!: string;

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

  @ManyToOne(() => SectorEntity, (sector) => sector.subsectores, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "sector_id",
    referencedColumnName: "id"
  })
  sector!: SectorEntity;

  @OneToMany(() => ParcelaEntity, (parcela) => parcela.subsector)
  parcelas!: ParcelaEntity[];
}
