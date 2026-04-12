import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppConfigModule } from "../../../../config/config.module";
import { DatabaseModule } from "../../../../database/database.module";
import { RoleEntity } from "../../../roles/infrastructure/persistence/entities/role.entity";
import { UserEntity } from "../../../users/infrastructure/persistence/entities/user.entity";
import { UserRoleEntity } from "../persistence/entities/user-role.entity";
import { AuthSeedService } from "./auth-seed.service";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    TypeOrmModule.forFeature([UserEntity, RoleEntity, UserRoleEntity])
  ],
  providers: [AuthSeedService]
})
export class AuthSeedModule {}
