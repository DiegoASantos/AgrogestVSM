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
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";
import { DetallePagoProductorEntity } from "./detalle-pago-productor.entity";

export const PAGO_PRODUCTOR_STATUSES = [
  "BORRADOR",
  "OBSERVADO",
  "PENDIENTE",
  "PAGADO",
  "ANULADO"
] as const;
export type PagoProductorStatus = (typeof PAGO_PRODUCTOR_STATUSES)[number];

@Entity({ name: "pago_productores" })
@Index("idx_pago_productores_productor_fecha", [
  "productorId",
  "harvestReceptionDate",
  "id"
])
@Index("idx_pago_productores_estado_fecha", ["status", "harvestReceptionDate", "id"])
export class PagoProductorEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "productor_id", type: "bigint" })
  productorId!: string;

  @ManyToOne(() => ProductorEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "productor_id" })
  productor!: ProductorEntity;

  @Column({ name: "sistema_origen", type: "varchar", length: 150 })
  sourceSystem!: string;

  @Column({ name: "nro_guia", type: "varchar", length: 150 })
  guideNumber!: string;

  @Column({ name: "lote", type: "varchar", length: 150 })
  lot!: string;

  @Column({ name: "protocolo", type: "varchar", length: 10 })
  protocol!: string;

  @Column({ name: "variedad", type: "varchar", length: 150 })
  variety!: string;

  @Column({ name: "tipo_cultivo", type: "varchar", length: 150 })
  cropType!: string;

  @Column({ name: "categoria", type: "varchar", length: 50 })
  category!: string;

  @Column({ name: "destino", type: "varchar", length: 150 })
  destination!: string;

  @Column({ name: "fecha_cosecha", type: "date" })
  harvestDate!: string;

  @Column({ name: "fecha_recepcion", type: "date" })
  harvestReceptionDate!: string;

  @Column({ name: "jabas", type: "integer" })
  crateQuantity!: number;

  @Column({ name: "peso_bruto", type: "numeric", precision: 10, scale: 2 })
  grossWeight!: string;

  @Column({ name: "peso_tara", type: "numeric", precision: 10, scale: 2 })
  tareWeight!: string;

  @Column({ name: "peso_neto", type: "numeric", precision: 10, scale: 2 })
  netWeight!: string;

  @Column({ name: "peso_promedio", type: "numeric", precision: 10, scale: 2 })
  averageWeight!: string;

  @Column({ name: "exportador", type: "varchar", length: 10 })
  exporter!: string;

  @Column({ name: "codigo_productor_origen", type: "varchar", length: 150 })
  sourceProducerCode!: string;

  @Column({ name: "nombre_productor_origen", type: "varchar", length: 250 })
  sourceProducerName!: string;

  @Column({ name: "estado", type: "varchar", length: 10, default: "BORRADOR" })
  status!: PagoProductorStatus;

  @Column({ name: "creado_por_usuario_id", type: "bigint" })
  createdByUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "creado_por_usuario_id" })
  createdBy!: UserEntity;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;

  @OneToMany(() => DetallePagoProductorEntity, (detail) => detail.payment)
  details!: DetallePagoProductorEntity[];
}
