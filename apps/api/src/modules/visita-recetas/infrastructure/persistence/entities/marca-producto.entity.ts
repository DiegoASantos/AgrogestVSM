import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { IngredienteActivoEntity } from "./ingrediente-activo.entity";
import { TipoProductoFitosanitarioEntity } from "./tipo-producto-fitosanitario.entity";

@Entity({ name: "marcas_producto" })
export class MarcaProductoEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "nombre", type: "varchar", length: 150 })
  name!: string;

  @Column({ name: "ingrediente_activo_id", type: "bigint", nullable: true })
  ingredienteActivoId!: string | null;

  @Column({ name: "tipo_producto_id", type: "bigint", nullable: true })
  tipoProductoId!: string | null;

  @Column({
    name: "concentracion",
    type: "numeric",
    precision: 10,
    scale: 4,
    nullable: true
  })
  concentracion!: number | null;

  @Column({ name: "activo", type: "boolean", default: () => "true" })
  isActive!: boolean;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => IngredienteActivoEntity, { onDelete: "SET NULL" })
  @JoinColumn({ name: "ingrediente_activo_id", referencedColumnName: "id" })
  ingredienteActivo!: IngredienteActivoEntity | null;

  @ManyToOne(() => TipoProductoFitosanitarioEntity, { onDelete: "SET NULL" })
  @JoinColumn({ name: "tipo_producto_id", referencedColumnName: "id" })
  tipoProducto!: TipoProductoFitosanitarioEntity | null;
}
