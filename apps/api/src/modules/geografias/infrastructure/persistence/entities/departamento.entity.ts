import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { ProvinciaEntity } from "./provincia.entity";

@Entity({ name: "departamentos" })
export class DepartamentoEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "codigo", type: "varchar", length: 2 })
  code!: string;

  @Column({ name: "nombre", type: "varchar", length: 100 })
  name!: string;

  @OneToMany(() => ProvinciaEntity, (provincia) => provincia.departamento)
  provincias!: ProvinciaEntity[];
}
