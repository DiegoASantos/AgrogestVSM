import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";

@Entity({ name: "estimaciones_precios" })
@Unique("uq_estimaciones_precios_public_id", ["publicId"])
@Unique("uq_estimaciones_precios_semana", ["startDate"])
@Check("ck_estimaciones_precios_inicio_lunes", "EXTRACT(ISODOW FROM fecha_inicio) = 1")
@Check("ck_estimaciones_precios_rango_semanal", "fecha_fin = fecha_inicio + 6")
@Check("ck_estimaciones_precios_importes", "precio_minimo >= 0 AND precio_maximo >= precio_minimo AND precio_maximo <= 9999999999.99")
export class EstimacionPrecioEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "fecha_inicio", type: "date" })
  startDate!: string;

  @Column({ name: "fecha_fin", type: "date" })
  endDate!: string;

  @Column({ name: "precio_minimo", type: "numeric", precision: 12, scale: 2 })
  minimumPrice!: string;

  @Column({ name: "precio_maximo", type: "numeric", precision: 12, scale: 2 })
  maximumPrice!: string;

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

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "creado_por_usuario_id" })
  createdByUser!: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "actualizado_por_usuario_id" })
  updatedByUser!: UserEntity;
}
