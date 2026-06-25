import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn
} from "typeorm";

@Entity({ name: "labores_culturales" })
@Unique("labores_culturales_nombre_key", ["name"])
export class LaborCulturalEntity {
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
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @Column({
    name: "categoria_codigo",
    type: "varchar",
    length: 80,
    nullable: true
  })
  categoryCode!: string | null;

  @Column({
    name: "categoria_nombre",
    type: "varchar",
    length: 120,
    nullable: true
  })
  categoryName!: string | null;

  @Column({
    name: "opcion_codigo",
    type: "varchar",
    length: 80,
    nullable: true
  })
  optionCode!: string | null;

  @Column({
    name: "opcion_etiqueta",
    type: "varchar",
    length: 120,
    nullable: true
  })
  optionLabel!: string | null;

  @Column({
    name: "leyenda",
    type: "text",
    nullable: true
  })
  legend!: string | null;

  @Column({
    name: "orden",
    type: "integer",
    nullable: true
  })
  sortOrder!: number | null;

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
}
