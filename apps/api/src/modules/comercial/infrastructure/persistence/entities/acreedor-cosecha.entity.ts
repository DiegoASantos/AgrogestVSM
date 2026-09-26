import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

import {
  PAGO_COSECHA_BANKS,
  PAGO_COSECHA_DOCUMENT_TYPES,
  type PagoCosechaBank,
  type PagoCosechaDocumentType
} from "./pago-cosecha.entity";

export { PAGO_COSECHA_BANKS, PAGO_COSECHA_DOCUMENT_TYPES };
export type { PagoCosechaBank, PagoCosechaDocumentType };

@Entity({ name: "acreedores_cosecha" })
@Unique("uq_acreedores_cosecha_public_id", ["publicId"])
@Unique("uq_acreedores_cosecha_datos", [
  "productorId",
  "creditorDocumentType",
  "creditorDocumentNumber",
  "bank",
  "accountNumber"
])
@Index("idx_acreedores_cosecha_productor", ["productorId", "createdAt"])
export class AcreedorCosechaEntity {
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
