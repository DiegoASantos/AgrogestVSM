import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { CampaniaEntity } from "../../../../campanias/infrastructure/persistence/entities/campania.entity";
import { CultivoEntity } from "../../../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { ParcelaEntity } from "../../../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";
import { VariedadEntity } from "../../../../variedades/infrastructure/persistence/entities/variedad.entity";
import { VisitaEvaluacionEntity } from "../../../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaObservacionSanitariaEntity } from "../../../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaProductoRecomendadoEntity } from "../../../../visita-productos-recomendados/infrastructure/persistence/entities/visita-producto-recomendado.entity";
import { VisitaRecomendacionEntity } from "../../../../visita-recomendaciones/infrastructure/persistence/entities/visita-recomendacion.entity";
import { EtapaFenologicaEntity } from "./etapa-fenologica.entity";
import { SubEtapaEntity } from "./sub-etapa.entity";

export type PointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

@Entity({ name: "visitas_campo" })
export class VisitaCampoEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "public_id",
    type: "uuid",
    default: () => "gen_random_uuid()"
  })
  publicId!: string;

  @Column({
    name: "nro_ficha",
    type: "varchar",
    length: 30,
    nullable: true
  })
  nroFicha!: string | null;

  @Column({
    name: "cultivo_id",
    type: "bigint"
  })
  cultivoId!: string;

  @Column({
    name: "variedad_id",
    type: "bigint"
  })
  variedadId!: string;

  @Column({
    name: "parcela_id",
    type: "bigint"
  })
  parcelaId!: string;

  @Column({
    name: "campania_id",
    type: "bigint"
  })
  campaniaId!: string;

  @Column({
    name: "agronomo_usuario_id",
    type: "bigint"
  })
  agronomoUsuarioId!: string;

  @Column({
    name: "nro_plantas",
    type: "integer",
    nullable: true
  })
  nroPlantas!: number | null;

  @Column({
    name: "area_ha",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  areaHectares!: string | null;

  @Column({
    name: "fecha_siembra",
    type: "date",
    nullable: true
  })
  fechaSiembra!: string | null;

  @Column({
    name: "fecha_visita",
    type: "date"
  })
  fechaVisita!: string;

  @Column({
    name: "hora_visita_inicio",
    type: "time"
  })
  horaVisitaInicio!: string;

  @Column({
    name: "hora_visita_fin",
    type: "time",
    nullable: true
  })
  horaVisitaFin!: string | null;

  @Column({
    name: "etapa_fenologica_id",
    type: "bigint",
    nullable: true
  })
  etapaFenologicaId!: string | null;

  @Column({
    name: "sub_etapa_id",
    type: "bigint",
    nullable: true
  })
  subEtapaId!: string | null;

  @Column({
    name: "sub_etapa_porcentaje",
    type: "numeric",
    precision: 5,
    scale: 2,
    nullable: true
  })
  subEtapaPercentage!: string | null;

  @Column({
    name: "observacion_general",
    type: "text",
    nullable: true
  })
  observacionGeneral!: string | null;

  @Column({
    name: "firma_agronomo_nombre",
    type: "varchar",
    length: 150,
    nullable: true
  })
  firmaAgronomoNombre!: string | null;

  @Column({
    name: "firma_productor_nombre",
    type: "varchar",
    length: 150,
    nullable: true
  })
  firmaProductorNombre!: string | null;

  @Column({
    name: "ubicacion_visita",
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true
  })
  ubicacionVisita!: PointGeometry | null;

  @Column({
    name: "sincronizado_at",
    type: "timestamptz",
    nullable: true
  })
  sincronizadoAt!: Date | null;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @Column({
    name: "creado_at",
    type: "timestamptz",
    default: () => "now()"
  })
  createdAt!: Date;

  @Column({
    name: "actualizado_at",
    type: "timestamptz",
    default: () => "now()"
  })
  updatedAt!: Date;

  @ManyToOne(() => CultivoEntity, (cultivo) => cultivo.visitasCampo, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "cultivo_id",
    referencedColumnName: "id"
  })
  cultivo!: CultivoEntity;

  @ManyToOne(() => VariedadEntity, (variedad) => variedad.visitasCampo, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "variedad_id",
    referencedColumnName: "id"
  })
  variedad!: VariedadEntity;

  @ManyToOne(() => ParcelaEntity, (parcela) => parcela.visitasCampo, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "parcela_id",
    referencedColumnName: "id"
  })
  parcela!: ParcelaEntity;

  @ManyToOne(() => CampaniaEntity, (campania) => campania.visitasCampo, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "campania_id",
    referencedColumnName: "id"
  })
  campania!: CampaniaEntity;

  @ManyToOne(() => UserEntity, (user) => user.visitasCampoComoAgronomo, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "agronomo_usuario_id",
    referencedColumnName: "id"
  })
  agronomoUsuario!: UserEntity;

  @ManyToOne(
    () => EtapaFenologicaEntity,
    (etapaFenologica) => etapaFenologica.visitasCampo,
    {
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "etapa_fenologica_id",
    referencedColumnName: "id"
  })
  etapaFenologica!: EtapaFenologicaEntity | null;

  @ManyToOne(() => SubEtapaEntity, {
    nullable: true,
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "sub_etapa_id",
    referencedColumnName: "id"
  })
  subEtapa!: SubEtapaEntity | null;

  @OneToMany(
    () => VisitaEvaluacionEntity,
    (visitaEvaluacion) => visitaEvaluacion.visita
  )
  evaluaciones!: VisitaEvaluacionEntity[];

  @OneToMany(
    () => VisitaObservacionSanitariaEntity,
    (visitaObservacionSanitaria) => visitaObservacionSanitaria.visita
  )
  observacionesSanitarias!: VisitaObservacionSanitariaEntity[];

  @OneToMany(
    () => VisitaRecomendacionEntity,
    (visitaRecomendacion) => visitaRecomendacion.visita
  )
  recomendaciones!: VisitaRecomendacionEntity[];

  @OneToMany(
    () => VisitaProductoRecomendadoEntity,
    (visitaProductoRecomendado) => visitaProductoRecomendado.visita
  )
  productosRecomendados!: VisitaProductoRecomendadoEntity[];
}
