import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { UserRoleEntity } from "../../../../auth/infrastructure/persistence/entities/user-role.entity";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

@Entity({ name: "usuarios" })
export class UserEntity {
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
    name: "nombres",
    type: "varchar",
    length: 100
  })
  firstName!: string;

  @Column({
    name: "apellidos",
    type: "varchar",
    length: 100
  })
  lastName!: string;

  @Column({
    name: "email",
    type: "varchar",
    length: 150
  })
  email!: string;

  @Column({
    name: "telefono",
    type: "varchar",
    length: 20,
    nullable: true
  })
  phone!: string | null;

  @Column({
    name: "password_hash",
    type: "text"
  })
  passwordHash!: string;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @Column({
    name: "creado_at",
    type: "timestamptz",
    default: () => "now()"
  })
  createdAt!: Date;

  @Column({
    name: "actualizado_at",
    type: "timestamptz",
    default: () => "now()"
  })
  updatedAt!: Date;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
  userRoles!: UserRoleEntity[];

  @OneToMany(
    () => VisitaCampoEntity,
    (visitaCampo) => visitaCampo.agronomoUsuario
  )
  visitasCampoComoAgronomo!: VisitaCampoEntity[];
}
