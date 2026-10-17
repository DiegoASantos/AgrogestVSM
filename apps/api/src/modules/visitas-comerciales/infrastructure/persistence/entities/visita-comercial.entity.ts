import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn
} from "typeorm";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";

export type TipoSujetoComercial = "PERSONA" | "FUNDO" | "ASOCIATIVA" | "RECORREDOR";

@Entity({ name: "visitas_comerciales" })
@Index("idx_visitas_comerciales_fecha", ["fechaVisita", "id"], { where: "activo = true" })
@Index("idx_visitas_comerciales_agronomo_fecha", ["agronomoUsuarioId", "fechaVisita"], {
  where: "activo = true"
})
export class VisitaComercialEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({
    name: "public_id",
    type: "uuid",
    default: () => "gen_random_uuid()",
    unique: true
  })
  publicId!: string;

  @Column({ name: "agronomo_usuario_id", type: "bigint" })
  agronomoUsuarioId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "agronomo_usuario_id" })
  agronomoUsuario!: UserEntity;

  @Column({ name: "tipo_sujeto", type: "varchar", length: 12 })
  tipoSujeto!: TipoSujetoComercial;

  @Column({ name: "nombres", type: "varchar", length: 150 })
  nombres!: string;

  @Column({ name: "apellidos", type: "varchar", length: 150, nullable: true })
  apellidos!: string | null;

  @Column({ name: "descripcion", type: "text" })
  descripcion!: string;

  @Column({ name: "fecha_visita", type: "date" })
  fechaVisita!: string;

  @Column({
    name: "ubicacion_visita",
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true
  })
  ubicacionVisita!: { type: "Point"; coordinates: [number, number] } | null;

  @Column({ name: "activo", type: "boolean", default: true })
  activo!: boolean;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  creadoAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  actualizadoAt!: Date;
}
