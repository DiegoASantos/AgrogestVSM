import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { ProductorEntity } from "../../../../productores/infrastructure/persistence/entities/productor.entity";
import { SubsectorEntity } from "../../../../subsectores/infrastructure/persistence/entities/subsector.entity";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

export type PointGeometry = {
  type: "Point";
  coordinates: [number, number];
};

export type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

@Entity({ name: "parcelas" })
@Index("uq_parcelas_productor_subsector_codigo", ["productorId", "subsectorId", "code"], {
  unique: true
})
export class ParcelaEntity {
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
    name: "subsector_id",
    type: "bigint"
  })
  subsectorId!: string;

  @Column({
    name: "productor_id",
    type: "bigint"
  })
  productorId!: string;

  @Column({
    name: "agronomo_usuario_id",
    type: "bigint",
    nullable: true
  })
  agronomoUsuarioId!: string | null;

  @Column({
    name: "codigo",
    type: "varchar",
    length: 30
  })
  code!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 150,
    nullable: true
  })
  name!: string | null;

  @Column({
    name: "area_ha",
    type: "numeric",
    precision: 12,
    scale: 4,
    nullable: true
  })
  areaHectares!: string | null;

  @Column({
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @Column({
    name: "punto_referencia",
    type: "geometry",
    spatialFeatureType: "Point",
    srid: 4326,
    nullable: true
  })
  referencePoint!: PointGeometry | null;

  @Column({
    name: "geometria",
    type: "geometry",
    spatialFeatureType: "MultiPolygon",
    srid: 4326,
    nullable: true
  })
  geometry!: MultiPolygonGeometry | null;

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

  @ManyToOne(() => SubsectorEntity, (subsector) => subsector.parcelas, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "subsector_id",
    referencedColumnName: "id"
  })
  subsector!: SubsectorEntity;

  @ManyToOne(() => ProductorEntity, (productor) => productor.parcelas, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "productor_id",
    referencedColumnName: "id"
  })
  productor!: ProductorEntity;

  @ManyToOne(() => UserEntity, (user) => user.parcelasAsignadas, {
    onDelete: "SET NULL",
    onUpdate: "NO ACTION",
    nullable: true
  })
  @JoinColumn({
    name: "agronomo_usuario_id",
    referencedColumnName: "id"
  })
  agronomoUsuario!: UserEntity | null;

  @OneToMany(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.parcela)
  visitasCampo!: VisitaCampoEntity[];
}
