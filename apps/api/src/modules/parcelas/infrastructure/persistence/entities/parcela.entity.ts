import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { SectorEntity } from "../../../../sectores/infrastructure/persistence/entities/sector.entity";
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
    name: "sector_id",
    type: "bigint"
  })
  sectorId!: string;

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

  @ManyToOne(() => SectorEntity, (sector) => sector.parcelas, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "sector_id",
    referencedColumnName: "id"
  })
  sector!: SectorEntity;

  @OneToMany(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.parcela)
  visitasCampo!: VisitaCampoEntity[];
}
