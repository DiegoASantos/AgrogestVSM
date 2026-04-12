import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";

import { UsersService } from "../../../users/application/users.service";
import type {
  AccessTokenPayload,
  AuthenticatedRequest
} from "../../types/auth.types";
import { PUBLIC_ROUTE_KEY } from "../decorators/public.decorator";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublicRoute = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (isPublicRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractBearerToken(request.headers.authorization);

    if (!accessToken) {
      throw new UnauthorizedException("Authentication is required.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        accessToken
      );

      if (!this.isValidPayload(payload)) {
        throw new UnauthorizedException("Invalid access token.");
      }

      const user = await this.usersService.findByPublicId(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException("Authentication is required.");
      }

      request.user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Invalid or expired access token.");
    }
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return null;
    }

    return token;
  }

  private isValidPayload(
    payload: AccessTokenPayload | null | undefined
  ): payload is AccessTokenPayload {
    return Boolean(
      payload &&
        typeof payload.sub === "string" &&
        typeof payload.userId === "string" &&
        typeof payload.email === "string" &&
        Array.isArray(payload.roles)
    );
  }
}
