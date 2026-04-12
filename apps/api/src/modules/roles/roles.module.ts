import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RolesService } from "./application/roles.service";
import { RoleEntity } from "./infrastructure/persistence/entities/role.entity";
import { RolesController } from "./presentation/roles.controller";

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [TypeOrmModule, RolesService]
})
export class RolesModule {}
