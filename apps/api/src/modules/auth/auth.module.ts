import { Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppConfigService } from "../../config/app-config.service";
import { RolesModule } from "../roles/roles.module";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./application/auth.service";
import { RefreshSessionsService } from "./application/refresh-sessions.service";
import { UserRolesService } from "./application/user-roles.service";
import { RefreshSessionEntity } from "./infrastructure/persistence/entities/refresh-session.entity";
import { UserRoleEntity } from "./infrastructure/persistence/entities/user-role.entity";
import { AccessTokenGuard } from "./presentation/guards/access-token.guard";
import { RolesGuard } from "./presentation/guards/roles.guard";
import { LoginThrottlerGuard } from "./presentation/guards/login-throttler.guard";
import { AuthController } from "./presentation/auth.controller";
import { UserRolesController } from "./presentation/user-roles.controller";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => {
        return createAuthJwtModuleOptions(appConfig.auth.accessSecret);
      }
    }),
    TypeOrmModule.forFeature([UserRoleEntity, RefreshSessionEntity]),
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => [
        {
          ttl: appConfig.loginRateLimit.ttlMs,
          limit: appConfig.loginRateLimit.max,
          blockDuration: appConfig.loginRateLimit.blockDurationMs
        }
      ]
    }),
    UsersModule,
    RolesModule
  ],
  controllers: [AuthController, UserRolesController],
  providers: [
    AuthService,
    RefreshSessionsService,
    UserRolesService,
    AccessTokenGuard,
    RolesGuard,
    LoginThrottlerGuard,
    {
      provide: APP_GUARD,
      useExisting: AccessTokenGuard
    },
    {
      provide: APP_GUARD,
      useExisting: RolesGuard
    }
  ],
  exports: [AuthService, UserRolesService, AccessTokenGuard, RolesGuard, LoginThrottlerGuard, JwtModule, ThrottlerModule]
})
export class AuthModule {}

export function createAuthJwtModuleOptions(accessSecret: string): JwtModuleOptions {
  return { secret: accessSecret };
}
