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
import { NutrienteEntity } from "../../../../nutricion/infrastructure/persistence/entities/nutriente.entity";

@Entity({ name: "visita_receta_fertilizacion" })
export class VisitaRecetaFertilizacionEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({ name: "enfoque", type: "varchar", length: 12, default: "reactivo" })
  enfoque!: "reactivo" | "preventivo";

  @Column({ name: "nutriente_id", type: "bigint", nullable: true })
  nutrienteId!: string | null;

  @Column({ name: "nutriente_nombre", type: "varchar", length: 100, nullable: true })
  nutrienteNombre!: string | null;

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

  @Column({ name: "factor", type: "numeric", precision: 6, scale: 3, default: 1 })
  factor!: number;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaRecetaEntity, (receta) => receta.fertilizacion, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;

  @ManyToOne(() => NutrienteEntity, {
    nullable: true,
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({ name: "nutriente_id", referencedColumnName: "id" })
  nutriente!: NutrienteEntity | null;
}
