import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcrypt";

import { createSuccessResponse } from "../../../common/http/api-response";
import { AppConfigService } from "../../../config/app-config.service";
import { RolesService } from "../../roles/application/roles.service";
import { UsersService } from "../../users/application/users.service";
import { LoginDto } from "../presentation/dto/login.dto";
import type { AccessTokenPayload, LoginResponse } from "../types/auth.types";
import { toAccessTokenPayload, toAuthenticatedUserProfile } from "./auth.mapper";
import { UserRolesService } from "./user-roles.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly userRolesService: UserRolesService
  ) {}

  getModuleStatus() {
    return {
      ready: true,
      usersModuleReady: this.usersService.isReady(),
      rolesModuleReady: this.rolesService.isReady(),
      userRolesModuleReady: this.userRolesService.isReady()
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const passwordMatches = await compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const accessTokenPayload = toAccessTokenPayload(user);
    const accessToken = await this.jwtService.signAsync(accessTokenPayload);

    return createSuccessResponse<LoginResponse>({
      accessToken,
      tokenType: "Bearer",
      expiresIn: this.appConfig.auth.accessExpiresIn,
      user: toAuthenticatedUserProfile(user)
    });
  }

  async getAuthenticatedUser(accessTokenPayload: AccessTokenPayload) {
    const user = await this.usersService.findByPublicIdWithRoles(
      accessTokenPayload.sub
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authentication is required.");
    }

    return createSuccessResponse(toAuthenticatedUserProfile(user));
  }
}
