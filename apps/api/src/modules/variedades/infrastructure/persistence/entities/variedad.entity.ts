import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { CultivoEntity } from "../../../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

@Entity({ name: "variedades" })
export class VariedadEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "public_id",
    type: "uuid",
    default: () => "gen_random_uuid()"
  })
  publicId!: string;

  @Column({
    name: "cultivo_id",
    type: "bigint"
  })
  cultivoId!: string;

  @Column({
    name: "codigo",
    type: "varchar",
    length: 30,
    nullable: true
  })
  code!: string | null;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 100
  })
  name!: string;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @ManyToOne(() => CultivoEntity, (cultivo) => cultivo.varieties, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "cultivo_id",
    referencedColumnName: "id"
  })
  cultivo!: CultivoEntity;

  @OneToMany(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.variedad)
  visitasCampo!: VisitaCampoEntity[];
}
