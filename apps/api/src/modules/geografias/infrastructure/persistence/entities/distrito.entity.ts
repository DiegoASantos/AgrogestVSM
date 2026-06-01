import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { SectorEntity } from "../../../../sectores/infrastructure/persistence/entities/sector.entity";
import { ProvinciaEntity } from "./provincia.entity";

@Entity({ name: "distritos" })
export class DistritoEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "provincia_id", type: "bigint" })
  provinciaId!: string;

  @Column({ name: "ubigeo", type: "varchar", length: 6 })
  ubigeo!: string;

  @Column({ name: "nombre", type: "varchar", length: 120 })
  name!: string;

  @ManyToOne(() => ProvinciaEntity, (provincia) => provincia.distritos, {
    onDelete: "RESTRICT"
  })
  @JoinColumn({ name: "provincia_id", referencedColumnName: "id" })
  provincia!: ProvinciaEntity;

  @OneToMany(() => SectorEntity, (sector) => sector.distrito)
  sectores!: SectorEntity[];
}
