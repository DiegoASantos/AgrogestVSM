import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaRecetaFitosanidadEntity } from "./visita-receta-fitosanidad.entity";
import { VisitaRecetaFertilizacionEntity } from "./visita-receta-fertilizacion.entity";
import { VisitaRecetaRiegoEntity } from "./visita-receta-riego.entity";
import { VisitaRecetaLaborEntity } from "./visita-receta-labor.entity";

@Entity({ name: "visita_recetas" })
export class VisitaRecetaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "visita_id", type: "bigint" })
  visitaId!: string;

  @Column({ name: "etapa_fenologica", type: "text", nullable: true })
  etapaFenologica!: string | null;

  @Column({ name: "version", type: "integer", default: 1 })
  version!: number;

  @CreateDateColumn({ name: "creado_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "actualizado_at", type: "timestamptz" })
  updatedAt!: Date;

  @OneToOne(() => VisitaCampoEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "visita_id", referencedColumnName: "id" })
  visita!: VisitaCampoEntity;

  @OneToMany(
    () => VisitaRecetaFitosanidadEntity,
    (fitosanidad) => fitosanidad.receta,
    { cascade: true }
  )
  fitosanidad!: VisitaRecetaFitosanidadEntity[];

  @OneToMany(
    () => VisitaRecetaFertilizacionEntity,
    (fertilizacion) => fertilizacion.receta,
    { cascade: true }
  )
  fertilizacion!: VisitaRecetaFertilizacionEntity[];

  @OneToOne(
    () => VisitaRecetaRiegoEntity,
    (riego) => riego.receta,
    { cascade: true }
  )
  riego!: VisitaRecetaRiegoEntity | null;

  @OneToMany(
    () => VisitaRecetaLaborEntity,
    (labor) => labor.receta,
    { cascade: true }
  )
  labores!: VisitaRecetaLaborEntity[];
}
