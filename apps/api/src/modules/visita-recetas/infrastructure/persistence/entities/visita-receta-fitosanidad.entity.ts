import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { VisitaRecetaEntity } from "./visita-receta.entity";

@Entity({ name: "visita_receta_fitosanidad" })
export class VisitaRecetaFitosanidadEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({ name: "numero", type: "integer", default: 1 })
  numero!: number;

  @Column({
    name: "objetivo",
    type: "varchar",
    length: 20
  })
  objetivo!: "plaga" | "enfermedad";

  @Column({ name: "objetivo_nombre", type: "varchar", length: 150 })
  objetivoNombre!: string;

  @Column({ name: "tipo_control_id", type: "bigint", nullable: true })
  tipoControlId!: string | null;

  @Column({ name: "tipo_producto_id", type: "bigint", nullable: true })
  tipoProductoId!: string | null;

  @Column({
    name: "disolvente",
    type: "varchar",
    length: 100,
    default: "Agua"
  })
  disolvente!: string;

  @Column({ name: "modo_accion_id", type: "bigint", nullable: true })
  modoAccionId!: string | null;

  @Column({
    name: "ingrediente_activo_nombre",
    type: "varchar",
    length: 150,
    nullable: true
  })
  ingredienteActivoNombre!: string | null;

  @Column({
    name: "dosis_ia",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  dosisIa!: number | null;

  @Column({
    name: "volumen_aplicacion",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  volumenAplicacion!: number | null;

  @Column({
    name: "cantidad_total_ia",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true
  })
  cantidadTotalIa!: number | null;

  @Column({
    name: "marca_producto_nombre",
    type: "varchar",
    length: 150,
    nullable: true
  })
  marcaProductoNombre!: string | null;

  @Column({
    name: "concentracion_producto",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  concentracionProducto!: number | null;

  @Column({
    name: "cantidad_total_producto",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true
  })
  cantidadTotalProducto!: number | null;

  @Column({ name: "coadyuvantes_ids", type: "text", nullable: true })
  coadyuvantesIds!: string | null;

  @Column({ name: "orden_mezcla", type: "text", nullable: true })
  ordenMezcla!: string | null;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaRecetaEntity, (receta) => receta.fitosanidad, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;
}
