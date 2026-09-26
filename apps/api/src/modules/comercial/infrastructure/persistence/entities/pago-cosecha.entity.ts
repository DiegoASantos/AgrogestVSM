import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

export const PAGO_COSECHA_DOCUMENT_TYPES = ["DNI", "RUC"] as const;
export const PAGO_COSECHA_BANKS = ["INTERBANK", "BCP", "CAJA_PIURA", "BBVA"] as const;
export type PagoCosechaDocumentType = (typeof PAGO_COSECHA_DOCUMENT_TYPES)[number];
export type PagoCosechaBank = (typeof PAGO_COSECHA_BANKS)[number];

@Entity({ name: "pagos_cosecha" })
@Unique("uq_pagos_cosecha_public_id", ["publicId"])
@Index("idx_pagos_cosecha_productor", ["productorId", "createdAt"])
export class PagoCosechaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "productor_id", type: "bigint" })
  productorId!: string;

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
