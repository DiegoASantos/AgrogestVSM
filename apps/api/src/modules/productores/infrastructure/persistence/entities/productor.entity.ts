import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { SectorEntity } from "../../../../sectores/infrastructure/persistence/entities/sector.entity";

@Entity({ name: "productores" })
export class ProductorEntity {
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
    name: "tipo_documento_id",
    type: "smallint"
  })
  documentTypeId!: number;

  @Column({
    name: "nro_documento",
    type: "varchar",
    length: 20
  })
  documentNumber!: string;

  @Column({
    name: "telefono",
    type: "varchar",
    length: 20,
    nullable: true
  })
  phone!: string | null;

  @Column({
    name: "email",
    type: "varchar",
    length: 150,
    nullable: true
  })
  email!: string | null;

  @Column({
    name: "direccion",
    type: "text",
    nullable: true
  })
  address!: string | null;

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

  @OneToMany(() => SectorEntity, (sector) => sector.productor)
  sectors!: SectorEntity[];
}
