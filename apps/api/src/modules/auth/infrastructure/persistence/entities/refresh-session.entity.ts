import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "auth_refresh_sessions" })
export class RefreshSessionEntity {
  @PrimaryColumn({
    name: "id",
    type: "uuid"
  })
  id!: string;

  @Column({
    name: "user_public_id",
    type: "uuid"
  })
  userPublicId!: string;

  @Column({
    name: "token_hash",
    type: "varchar",
    length: 64
  })
  tokenHash!: string;

  @Column({
    name: "expires_at",
    type: "timestamptz"
  })
  expiresAt!: Date;

  @Column({
    name: "revoked_at",
    type: "timestamptz",
    nullable: true
  })
  revokedAt!: Date | null;

  @Column({
    name: "created_at",
    type: "timestamptz",
    default: () => "now()"
  })
  createdAt!: Date;

  @Column({
    name: "updated_at",
    type: "timestamptz",
    default: () => "now()"
  })
  updatedAt!: Date;
}
