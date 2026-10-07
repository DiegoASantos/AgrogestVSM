import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "invitaciones_acreedor_productor" })
@Index("uq_invitacion_acreedor_activa_productor", ["productorId"], {
  unique: true,
  where: "revocado_at IS NULL"
})
export class InvitacionAcreedorProductorEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "productor_id", type: "bigint" })
  productorId!: string;

  @Column({ name: "codigo_hash", type: "char", length: 64, unique: true })
  codeHash!: string;

  @Column({ name: "emitido_por_usuario_id", type: "bigint" })
  issuedByUserId!: string;

  @Column({ name: "expira_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revocado_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
