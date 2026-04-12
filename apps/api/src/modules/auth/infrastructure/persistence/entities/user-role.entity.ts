import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { RoleEntity } from "../../../../roles/infrastructure/persistence/entities/role.entity";
import { UserEntity } from "../../../../users/infrastructure/persistence/entities/user.entity";

@Entity({ name: "usuario_roles" })
export class UserRoleEntity {
  @PrimaryColumn({
    name: "usuario_id",
    type: "bigint"
  })
  userId!: string;

  @PrimaryColumn({
    name: "rol_id",
    type: "smallint"
  })
  roleId!: number;

  @ManyToOne(() => UserEntity, (user) => user.userRoles, {
    onDelete: "CASCADE",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "usuario_id",
    referencedColumnName: "id"
  })
  user!: UserEntity;

  @ManyToOne(() => RoleEntity, (role) => role.userRoles, {
    onDelete: "RESTRICT",
    onUpdate: "NO ACTION"
  })
  @JoinColumn({
    name: "rol_id",
    referencedColumnName: "id"
  })
  role!: RoleEntity;
}
