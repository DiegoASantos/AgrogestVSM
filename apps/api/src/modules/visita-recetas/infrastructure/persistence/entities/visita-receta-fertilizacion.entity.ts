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

@Entity({ name: "visita_receta_fertilizacion" })
export class VisitaRecetaFertilizacionEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({
    name: "via_aplicacion",
    type: "varchar",
    length: 20
  })
  viaAplicacion!: "edafica" | "foliar";

  @Column({
    name: "fertilizante_nombre",
    type: "varchar",
    length: 150,
    nullable: true
  })
  fertilizanteNombre!: string | null;

  @Column({
    name: "tipo_producto",
    type: "varchar",
    length: 20,
    nullable: true
  })
  tipoProducto!: "solido" | "liquido" | null;

  @Column({
    name: "dosis",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  dosis!: number | null;

  @Column({
    name: "unidad_dosis",
    type: "varchar",
    length: 30,
    nullable: true
  })
  unidadDosis!: string | null;

  @Column({
    name: "cantidad_total_plantas",
    type: "integer",
    nullable: true
  })
  cantidadTotalPlantas!: number | null;

  @Column({
    name: "volumen_aplicacion",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  volumenAplicacion!: number | null;

  @Column({
    name: "cantidad_total_fertilizante",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true
  })
  cantidadTotalFertilizante!: number | null;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaRecetaEntity, (receta) => receta.fertilizacion, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;
}
