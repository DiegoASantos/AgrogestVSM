import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";

import { VisitaRecetaEntity } from "./visita-receta.entity";
import { VisitaRecetaFitosanidadEntity } from "./visita-receta-fitosanidad.entity";

@Entity({ name: "visita_receta_mezclas" })
export class VisitaRecetaMezclaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({ name: "numero", type: "integer" })
  numero!: number;

  @Column({ name: "coadyuvantes_ids", type: "text", nullable: true })
  coadyuvantesIds!: string | null;

  @Column({ name: "coadyuvantes_dosis", type: "text", nullable: true })
  coadyuvantesDosis!: string | null;

  @Column({ name: "orden_mezcla", type: "text", nullable: true })
  ordenMezcla!: string | null;

  @Column({
    name: "volumen_aplicacion",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  volumenAplicacion!: number | null;

  @Column({ name: "factor", type: "numeric", precision: 6, scale: 3, default: 1 })
  factor!: number;

  @Column({ name: "factor_editable", type: "boolean", default: false })
  factorEditable!: boolean;

  @Column({
    name: "cantidad_total_producto",
    type: "numeric",
    precision: 14,
    scale: 4,
    nullable: true
  })
  cantidadTotalProducto!: number | null;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaRecetaEntity, (receta) => receta.mezclas, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;

  @OneToMany(() => VisitaRecetaFitosanidadEntity, (producto) => producto.mezcla, {
    cascade: true
  })
  productos!: VisitaRecetaFitosanidadEntity[];
}
