import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UsersService } from "./application/users.service";
import { UserEntity } from "./infrastructure/persistence/entities/user.entity";
import { UsersController } from "./presentation/users.controller";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [TypeOrmModule, UsersService]
})
export class UsersModule {}
