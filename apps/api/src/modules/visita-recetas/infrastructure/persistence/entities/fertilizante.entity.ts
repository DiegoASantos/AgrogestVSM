import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

@Entity({ name: "fertilizantes" })
export class FertilizanteEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", generated: "uuid" })
  publicId!: string;

  @Column({ name: "nombre", type: "varchar", length: 150 })
  name!: string;

  @Column({
    name: "tipo",
    type: "varchar",
    length: 20
  })
  type!: "solido" | "liquido";

  @Column({ name: "concentracion", type: "varchar", length: 300, nullable: true })
  concentracion!: string | null;

  @Column({ name: "unidad_medida", type: "varchar", length: 20, nullable: true })
  unidadMedida!: string | null;

  @Column({ name: "activo", type: "boolean", default: () => "true" })
  isActive!: boolean;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;
}
