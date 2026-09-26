import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

import type { PagoCosechaBank, PagoCosechaDocumentType } from "./pago-cosecha.entity";

@Entity({ name: "registros_cosecha" })
@Unique("uq_registros_cosecha_public_id", ["publicId"])
@Index("idx_registros_cosecha_productor_fecha", ["productorId", "registrationDate"])
export class RegistroCosechaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "productor_id", type: "bigint" })
  productorId!: string;

  @Column({ name: "acreedor_id", type: "bigint" })
  creditorId!: string;

  @Column({ name: "cantidad_jabas", type: "integer" })
  crateQuantity!: number;

  @Column({ name: "precio_jaba", type: "numeric", precision: 12, scale: 2 })
  cratePrice!: string;

  @Column({ name: "fecha_registro", type: "date" })
  registrationDate!: string;

  @Column({ name: "fecha_cosecha", type: "date" })
  harvestDate!: string;

  @Column({ name: "nombres_acreedor", type: "varchar", length: 100 })
  creditorFirstName!: string;

  @Column({ name: "apellidos_acreedor", type: "varchar", length: 100 })
  creditorLastName!: string;

  @Column({ name: "tipo_documento_acreedor", type: "varchar", length: 3 })
  creditorDocumentType!: PagoCosechaDocumentType;

  @Column({ name: "nro_documento_acreedor", type: "varchar", length: 11 })
  creditorDocumentNumber!: string;

  @Column({ name: "banco", type: "varchar", length: 20 })
  bank!: PagoCosechaBank;

  @Column({ name: "nro_cuenta", type: "varchar", length: 30 })
  accountNumber!: string;

  @Column({ name: "creado_por_usuario_id", type: "bigint" })
  createdByUserId!: string;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;
}
