import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { ProvinciaEntity } from "./provincia.entity";

@Entity({ name: "departamentos" })
@Index("uq_departamentos_codigo", ["code"], { unique: true })
@Index("uq_departamentos_nombre", ["name"], { unique: true })
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
