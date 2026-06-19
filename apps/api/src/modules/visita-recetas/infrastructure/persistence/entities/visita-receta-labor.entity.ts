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

@Entity({ name: "visita_receta_labores" })
export class VisitaRecetaLaborEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({
    name: "labor",
    type: "varchar",
    length: 50
  })
  labor!:
    | "limpieza_maleza_pala"
    | "limpieza_maleza_motoguadana"
    | "horqueteo"
    | "enzunchado"
    | "recoleccion_frutos"
    | "trampas_mosca";

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @ManyToOne(() => VisitaRecetaEntity, (receta) => receta.labores, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;
}
