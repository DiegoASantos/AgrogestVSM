import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { VisitaRecetaEntity } from "./visita-receta.entity";

@Entity({ name: "visita_receta_riego" })
export class VisitaRecetaRiegoEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "receta_id", type: "bigint" })
  recetaId!: string;

  @Column({
    name: "tipo_recomendacion",
    type: "varchar",
    length: 30
  })
  tipoRecomendacion!:
    | "riego_pesado"
    | "riego_ligero"
    | "inicio_agoste"
    | "ruptura_agoste";

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToOne(() => VisitaRecetaEntity, (receta) => receta.riego, {
    onDelete: "CASCADE"
  })
  @JoinColumn({ name: "receta_id", referencedColumnName: "id" })
  receta!: VisitaRecetaEntity;
}
