import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { DepartamentoEntity } from "./departamento.entity";
import { DistritoEntity } from "./distrito.entity";

@Entity({ name: "provincias" })
export class ProvinciaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "departamento_id", type: "bigint" })
  departamentoId!: string;

  @Column({ name: "codigo", type: "varchar", length: 4 })
  code!: string;

  @Column({ name: "nombre", type: "varchar", length: 100 })
  name!: string;

  @ManyToOne(() => DepartamentoEntity, (departamento) => departamento.provincias, {
    onDelete: "RESTRICT"
  })
  @JoinColumn({ name: "departamento_id", referencedColumnName: "id" })
  departamento!: DepartamentoEntity;

  @OneToMany(() => DistritoEntity, (distrito) => distrito.provincia)
  distritos!: DistritoEntity[];
}
