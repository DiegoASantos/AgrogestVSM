import { randomUUID } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcrypt";

import { UpdateProfileDto } from "../presentation/dto/update-profile.dto";

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

    const sessionExpiresAt = this.getRefreshExpiry();
    const accessToken = await this.signAccessToken(
      toAccessTokenPayload(user),
      sessionExpiresAt
    );
    const refreshSessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(
      user.publicId,
      refreshSessionId,
      sessionExpiresAt
    );
    await this.refreshSessionsService.create(
      refreshSessionId,
      user.publicId,
      refreshToken,
      sessionExpiresAt
    );

    return createSuccessResponse<LoginResponse>({
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: this.appConfig.auth.accessExpiresIn,
      refreshExpiresIn: this.appConfig.auth.refreshExpiresIn,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
      user: toAuthenticatedUserProfile(user)
    });
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.appConfig.auth.refreshSecret
      });
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

    const sessionExpiresAt = await this.refreshSessionsService.getActiveExpiry({
      id: payload.sid,
      userPublicId: user.publicId,
      refreshToken
    });

    if (!sessionExpiresAt) {
      await this.refreshSessionsService.revoke(payload.sid);
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const remainingSeconds = Math.floor((sessionExpiresAt.getTime() - Date.now()) / 1000);

    if (remainingSeconds <= 0) {
      await this.refreshSessionsService.revoke(payload.sid);
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const configuredAccessSeconds = Math.floor(
      durationToMilliseconds(this.appConfig.auth.accessExpiresIn) / 1000
    );
    const accessSeconds = Math.min(configuredAccessSeconds, remainingSeconds);
    const accessExpiresIn = `${accessSeconds}s`;
    const refreshExpiresIn = `${remainingSeconds}s`;
    const accessToken = await this.signAccessToken(
      toAccessTokenPayload(user),
      sessionExpiresAt
    );
    const rotatedRefreshToken = await this.signRefreshToken(
      user.publicId,
      payload.sid,
      sessionExpiresAt
    );
    const rotated = await this.refreshSessionsService.rotate({
      id: payload.sid,
      userPublicId: user.publicId,
      currentRefreshToken: refreshToken,
      nextRefreshToken: rotatedRefreshToken
    });

    if (!rotated) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return createSuccessResponse<RefreshResponse>({
      accessToken,
      refreshToken: rotatedRefreshToken,
      tokenType: "Bearer",
      expiresIn:
        accessSeconds === configuredAccessSeconds
          ? this.appConfig.auth.accessExpiresIn
          : accessExpiresIn,
      refreshExpiresIn,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
      user: toAuthenticatedUserProfile(user)
    });
  }

  async logout(refreshToken: string) {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.appConfig.auth.refreshSecret
      });
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
    const user = await this.usersService.findByPublicIdWithRoles(accessTokenPayload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authentication is required.");
    }

    return createSuccessResponse(toAuthenticatedUserProfile(user));
  }

  async updateAuthenticatedUser(
    accessTokenPayload: AccessTokenPayload,
    updateProfileDto: UpdateProfileDto
  ) {
    const user = await this.usersService.findByPublicIdWithRoles(accessTokenPayload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authentication is required.");
    }

    const updatedUser = await this.usersService.updateSelfProfile(
      accessTokenPayload.sub,
      {
        firstName: updateProfileDto.firstName,
        lastName: updateProfileDto.lastName,
        email: updateProfileDto.email,
        ...(updateProfileDto.phone !== undefined
          ? { phone: updateProfileDto.phone ?? undefined }
          : {}),
        ...(updateProfileDto.newPassword !== undefined &&
        updateProfileDto.newPassword !== null &&
        updateProfileDto.newPassword.trim().length > 0
          ? { passwordHash: await hash(updateProfileDto.newPassword, 10) }
          : {})
      }
    );

    return createSuccessResponse(toAuthenticatedUserProfile(updatedUser));
  }

  private signAccessToken(
    payload: AccessTokenPayload,
    sessionExpiresAt: Date
  ): Promise<string> {
    const configuredExpiry =
      Date.now() + durationToMilliseconds(this.appConfig.auth.accessExpiresIn);
    const exp = Math.floor(Math.min(configuredExpiry, sessionExpiresAt.getTime()) / 1000);
    return this.jwtService.signAsync(
      { ...payload, exp },
      { secret: this.appConfig.auth.accessSecret }
    );
  }

  private signRefreshToken(
    publicId: string,
    sessionId: string,
    sessionExpiresAt: Date
  ): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: publicId,
      type: "refresh",
      sid: sessionId,
      jti: randomUUID(),
      exp: Math.floor(sessionExpiresAt.getTime() / 1000)
    };
    return this.jwtService.signAsync(payload, {
      secret: this.appConfig.auth.refreshSecret
    });
  }

  private getRefreshExpiry() {
    return new Date(
      Date.now() + durationToMilliseconds(this.appConfig.auth.refreshExpiresIn)
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
