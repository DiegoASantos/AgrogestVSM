import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { UserRoleEntity } from "../../../../auth/infrastructure/persistence/entities/user-role.entity";

@Entity({ name: "roles" })
export class RoleEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "smallint"
  })
  id!: number;

  @Column({
    name: "codigo",
    type: "varchar",
    length: 30
  })
  code!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 60
  })
  name!: string;

  @Column({
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
  userRoles!: UserRoleEntity[];
}
