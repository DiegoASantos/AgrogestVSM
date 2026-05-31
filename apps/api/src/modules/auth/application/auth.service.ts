import { randomUUID } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { compare } from "bcrypt";

type JwtExpiresIn = NonNullable<JwtSignOptions["expiresIn"]>;

import { createSuccessResponse } from "../../../common/http/api-response";
import { durationToMilliseconds } from "../../../common/utils/duration.util";
import { AppConfigService } from "../../../config/app-config.service";
import { RolesService } from "../../roles/application/roles.service";
import { UsersService } from "../../users/application/users.service";
import { LoginDto } from "../presentation/dto/login.dto";
import type {
  AccessTokenPayload,
  LoginResponse,
  RefreshResponse,
  RefreshTokenPayload
} from "../types/auth.types";
import { toAccessTokenPayload, toAuthenticatedUserProfile } from "./auth.mapper";
import { RefreshSessionsService } from "./refresh-sessions.service";
import { UserRolesService } from "./user-roles.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly userRolesService: UserRolesService,
    private readonly refreshSessionsService: RefreshSessionsService
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

    const accessToken = await this.signAccessToken(toAccessTokenPayload(user));
    const refreshSessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(
      user.publicId,
      refreshSessionId
    );
    await this.refreshSessionsService.create(
      refreshSessionId,
      user.publicId,
      refreshToken,
      this.getRefreshExpiry()
    );

    return createSuccessResponse<LoginResponse>({
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.appConfig.auth.accessExpiresIn,
      refreshExpiresIn: this.appConfig.auth.refreshExpiresIn,
      user: toAuthenticatedUserProfile(user)
    });
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.appConfig.auth.refreshSecret }
      );
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (!isRefreshTokenPayload(payload)) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const user = await this.usersService.findByPublicIdWithRoles(payload.sub);

    if (!user || !user.isActive) {
      await this.refreshSessionsService.revoke(payload.sid);
      throw new UnauthorizedException("Authentication is required.");
    }

    const accessToken = await this.signAccessToken(toAccessTokenPayload(user));
    const rotatedRefreshToken = await this.signRefreshToken(
      user.publicId,
      payload.sid
    );
    const rotated = await this.refreshSessionsService.rotate({
      id: payload.sid,
      userPublicId: user.publicId,
      currentRefreshToken: refreshToken,
      nextRefreshToken: rotatedRefreshToken,
      nextExpiresAt: this.getRefreshExpiry()
    });

    if (!rotated) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return createSuccessResponse<RefreshResponse>({
      accessToken,
      refreshToken: rotatedRefreshToken,
      tokenType: "Bearer",
      expiresIn: this.appConfig.auth.accessExpiresIn,
      refreshExpiresIn: this.appConfig.auth.refreshExpiresIn,
      user: toAuthenticatedUserProfile(user)
    });
  }

  async logout(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.appConfig.auth.refreshSecret }
      );
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (!isRefreshTokenPayload(payload)) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    await this.refreshSessionsService.revoke(payload.sid);
    return createSuccessResponse({ revoked: true });
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

  private signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.appConfig.auth.accessSecret,
      expiresIn: this.appConfig.auth.accessExpiresIn as JwtExpiresIn
    });
  }

  private signRefreshToken(publicId: string, sessionId: string): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: publicId,
      type: "refresh",
      sid: sessionId,
      jti: randomUUID()
    };
    return this.jwtService.signAsync(payload, {
      secret: this.appConfig.auth.refreshSecret,
      expiresIn: this.appConfig.auth.refreshExpiresIn as JwtExpiresIn
    });
  }

  private getRefreshExpiry() {
    return new Date(
      Date.now() +
        durationToMilliseconds(this.appConfig.auth.refreshExpiresIn)
    );
  }
}

function isRefreshTokenPayload(
  payload: RefreshTokenPayload | null | undefined
): payload is RefreshTokenPayload {
  return (
    payload?.type === "refresh" &&
    typeof payload.sub === "string" &&
    typeof payload.sid === "string" &&
    typeof payload.jti === "string"
  );
}
