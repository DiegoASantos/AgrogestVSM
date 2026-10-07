import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";
import { TipoDocumentoEntity } from "../../../../tipos-documento/infrastructure/persistence/entities/tipo-documento.entity";
import { AcreedorCosechaEntity } from "./acreedor-cosecha.entity";
import { PagoProductorEntity, type PagoProductorStatus } from "./pago-productor.entity";

@Entity({ name: "detalle_pago_productores" })
@Index("idx_detalle_pago_productores_pago", ["paymentId", "createdAt", "id"])
@Index("idx_detalle_pago_productores_acreedor", ["creditorId"])
@Index("idx_detalle_pago_productores_supervisor", ["supervisorId"])
export class DetallePagoProductorEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "pago_productor_id", type: "bigint" })
  paymentId!: string;

  @ManyToOne(() => PagoProductorEntity, (payment) => payment.details, {
    onDelete: "RESTRICT"
  })
  @JoinColumn({ name: "pago_productor_id" })
  payment!: PagoProductorEntity;

  @Column({ name: "acreedor_id", type: "bigint" })
  creditorId!: string;

  @ManyToOne(() => AcreedorCosechaEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "acreedor_id" })
  creditor!: AcreedorCosechaEntity;

  @Column({ name: "tipo_documento_id_productor", type: "smallint" })
  producerDocumentTypeId!: number;

  @ManyToOne(() => TipoDocumentoEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tipo_documento_id_productor" })
  producerDocumentType!: TipoDocumentoEntity;

  @Column({ name: "nro_documento_productor", type: "varchar", length: 20 })
  producerDocumentNumber!: string;

  @Column({ name: "cantidad_jabas", type: "integer" })
  crateQuantity!: number;

  @Column({ name: "precio_jaba", type: "numeric", precision: 10, scale: 2 })
  cratePrice!: string;

  @Column({ name: "precio_kilo", type: "numeric", precision: 10, scale: 2 })
  kiloPrice!: string;

  @Column({ name: "porcentaje_peso", type: "numeric", precision: 10, scale: 2 })
  weightPercentage!: string;

  @Column({ name: "aplica_fairtrade", type: "boolean", default: false })
  fairtradeApplies!: boolean;

  @Column({ name: "supervisor_id", type: "bigint" })
  supervisorId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "supervisor_id" })
  supervisor!: UserEntity;

  @Column({ name: "sub_total", type: "numeric", precision: 10, scale: 2 })
  subtotal!: string;

  @Column({ name: "tipo_descuento", type: "varchar", length: 200, default: "NO_APLICA" })
  discountType!: string;

  @Column({
    name: "monto_descuento",
    type: "numeric",
    precision: 10,
    scale: 2,
    default: "0.00"
  })
  discountAmount!: string;

  @Column({ name: "total_post_descuento", type: "numeric", precision: 10, scale: 2 })
  totalAfterDiscount!: string;

  @Column({ name: "detraccion", type: "numeric", precision: 10, scale: 2 })
  withholdingAmount!: string;

  @Column({ name: "total_post_detraccion", type: "numeric", precision: 10, scale: 2 })
  totalAfterWithholding!: string;

  @Column({ name: "nro_liquidacion", type: "varchar", length: 50, nullable: true })
  settlementNumber!: string | null;

  @Column({ name: "observacion", type: "varchar", length: 300 })
  observation!: string;

  @Column({ name: "estado", type: "varchar", length: 10, default: "PENDIENTE" })
  status!: PagoProductorStatus;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;
}
