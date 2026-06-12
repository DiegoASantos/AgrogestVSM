import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

import { NutrienteEntity } from "./nutriente.entity";

@Entity({ name: "detalle_nutrientes" })
export class DetalleNutrienteEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "nutriente_id",
    type: "bigint"
  })
  nutrientId!: string;

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

  @CreateDateColumn({
    name: "creado_at",
    type: "timestamptz"
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "actualizado_at",
    type: "timestamptz"
  })
  updatedAt!: Date;

  @ManyToOne(() => NutrienteEntity, (nutriente) => nutriente.details, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "nutriente_id",
    referencedColumnName: "id"
  })
  nutriente!: NutrienteEntity;
}
