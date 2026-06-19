import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { VisitaRecetaEntity } from "./visita-receta.entity";

@Entity({ name: "visita_receta_historial" })
export class VisitaRecetaHistorialEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({ name: "version", type: "integer" })
  version!: number;

  @Column({ name: "snapshot", type: "jsonb" })
  snapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => VisitaRecetaEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;
}
