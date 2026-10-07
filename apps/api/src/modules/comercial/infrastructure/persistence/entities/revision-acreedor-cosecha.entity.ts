import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { CreditorApprovalStatus } from "./acreedor-cosecha.entity";

@Entity({ name: "revisiones_acreedor_cosecha" })
@Index("idx_revisiones_acreedor_cosecha", ["creditorId", "createdAt"])
export class RevisionAcreedorCosechaEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "acreedor_id", type: "bigint" })
  creditorId!: string;

  @Column({ name: "revisor_usuario_id", type: "bigint" })
  reviewerUserId!: string;

  @Column({ name: "decision", type: "varchar", length: 10 })
  decision!: Extract<CreditorApprovalStatus, "APPROVED" | "OBSERVED">;

  @Column({ name: "observacion", type: "text", nullable: true })
  observation!: string | null;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
