import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductorEntity } from "../../../../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";

@Entity({ name: "fotos_comerciales_productor" })
@Index("idx_fotos_comerciales_productor_fecha", ["productorId", "createdAt", "id"])
export class FotoComercialProductorEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", unique: true })
  publicId!: string;

  @Column({ name: "productor_id", type: "bigint" })
  productorId!: string;

  @ManyToOne(() => ProductorEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "productor_id" })
  productor?: ProductorEntity;

  @Column({ name: "creado_por_usuario_id", type: "bigint" })
  createdByUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "creado_por_usuario_id" })
  createdByUser?: UserEntity;

  @Column({ name: "storage_key", type: "uuid", unique: true })
  storageKey!: string;

  @Column({ name: "sha256_original", type: "char", length: 64 })
  originalSha256!: string;

  @Column({ name: "sha256_archivo", type: "char", length: 64 })
  storedSha256!: string;

  @Column({ name: "tamano_bytes", type: "integer" })
  sizeBytes!: number;

  @Column({ name: "mime_type", type: "varchar", length: 30 })
  mimeType!: string;

  @Column({ name: "nonce_hex", type: "char", length: 24 })
  nonceHex!: string;

  @Column({ name: "auth_tag_hex", type: "char", length: 32 })
  authTagHex!: string;

  @Column({ name: "key_version", type: "smallint", default: 1 })
  keyVersion!: number;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
