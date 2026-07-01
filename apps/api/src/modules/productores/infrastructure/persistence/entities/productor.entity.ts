import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { ParcelaEntity } from "../../../../parcelas/infrastructure/persistence/entities/parcela.entity";

export const PRODUCTOR_ENTITY_TYPES = ["persona", "fundo", "cooperativa"] as const;
export type ProductorEntityType = (typeof PRODUCTOR_ENTITY_TYPES)[number];

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
    name: "entidad",
    type: "varchar",
    length: 20,
    default: () => "'persona'"
  })
  entityType!: ProductorEntityType;

  @Column({
    name: "tipo_documento_id",
    type: "smallint",
    nullable: true
  })
  documentTypeId!: number | null;

  @Column({
    name: "nro_documento",
    type: "varchar",
    length: 20,
    nullable: true
  })
  documentNumber!: string | null;

  @Column({
    name: "nombres",
    type: "varchar",
    length: 100,
    nullable: true
  })
  firstName!: string | null;

  @Column({
    name: "apellidos",
    type: "varchar",
    length: 100,
    nullable: true
  })
  lastName!: string | null;

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

  @OneToMany(() => ParcelaEntity, (parcela) => parcela.productor)
  parcelas!: ParcelaEntity[];
}
