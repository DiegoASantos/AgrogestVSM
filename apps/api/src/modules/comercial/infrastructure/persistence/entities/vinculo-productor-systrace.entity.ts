import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ProductorEntity } from "../../../../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";

@Entity({ name: "vinculos_productores_systrace" })
@Index("idx_vinculos_systrace_productor", ["productorId"])
@Check("chk_vinculo_systrace_codigo_no_vacio", "length(trim(codigo_productor_systrace)) > 0")
export class VinculoProductorSystraceEntity {
  @PrimaryGeneratedColumn({ name: "id", type: "bigint" })
  id!: string;

  @Column({ name: "public_id", type: "uuid", unique: true, default: () => "gen_random_uuid()" })
  publicId!: string;

  @Column({ name: "codigo_productor_systrace", type: "varchar", length: 150, unique: true })
  sourceProducerCode!: string;

  @Column({ name: "productor_id", type: "bigint" })
  productorId!: string;

  @ManyToOne(() => ProductorEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "productor_id" })
  productor!: ProductorEntity;

  @Column({ name: "creado_por_usuario_id", type: "bigint" })
  createdByUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "creado_por_usuario_id" })
  createdBy!: UserEntity;

  @Column({ name: "actualizado_por_usuario_id", type: "bigint" })
  updatedByUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "actualizado_por_usuario_id" })
  updatedBy!: UserEntity;

  @Column({ name: "creado_at", type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ name: "actualizado_at", type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;
}
