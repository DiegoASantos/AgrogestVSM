import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique
} from "typeorm";

import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";

@Entity({ name: "estimaciones_visitas" })
@Index("idx_estimaciones_visitas_semana_activa", ["startDate", "agronomistUserId"], {
  where: "activo = true"
})
@Unique("uq_estimaciones_visitas_public_id", ["publicId"])
@Unique("uq_estimaciones_visitas_agronomo_semana", ["agronomistUserId", "startDate"])
@Check("ck_estimaciones_visitas_cantidad_no_negativa", "visitas_estimadas >= 0")
@Check("ck_estimaciones_visitas_inicio_lunes", "EXTRACT(ISODOW FROM fecha_inicio) = 1")
@Check("ck_estimaciones_visitas_rango_semanal", "fecha_fin = fecha_inicio + 6")
export class EstimacionVisitaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "agronomo_usuario_id", type: "bigint" })
  agronomistUserId!: string;

  @Column({ name: "fecha_inicio", type: "date" })
  startDate!: string;

  @Column({ name: "fecha_fin", type: "date" })
  endDate!: string;

  @Column({ name: "visitas_estimadas", type: "integer" })
  estimatedVisits!: number;

  @Column({ name: "creado_por_usuario_id", type: "bigint" })
  createdByUserId!: string;

  @Column({ name: "actualizado_por_usuario_id", type: "bigint" })
  updatedByUserId!: string;

  @Column({ name: "activo", type: "boolean", default: () => "true" })
  isActive!: boolean;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT", onUpdate: "NO ACTION" })
  @JoinColumn({ name: "agronomo_usuario_id", referencedColumnName: "id" })
  agronomistUser!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT", onUpdate: "NO ACTION" })
  @JoinColumn({ name: "creado_por_usuario_id", referencedColumnName: "id" })
  createdByUser!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT", onUpdate: "NO ACTION" })
  @JoinColumn({ name: "actualizado_por_usuario_id", referencedColumnName: "id" })
  updatedByUser!: UserEntity;
}
