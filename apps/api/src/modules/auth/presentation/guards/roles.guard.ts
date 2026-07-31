import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { REQUIRED_ROLES_KEY } from "../decorators/roles.decorator";

const ANALYST_ROLE_CODE = "ANALISTA";
const ADMIN_ROLE_CODE = "ADMIN";
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRoles = request.user?.roles ?? [];

    if (isAnalystReadOnlyRequest(userRoles, request.method)) {
      throw new ForbiddenException(
        "El rol ANALISTA solo puede consultar informacion desde el panel web."
      );
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (requiredRoles.some((role) => userRoles.includes(role))) {
      return true;
    }

    throw new ForbiddenException(
      "You do not have permission to access this resource."
    );
  }
}

function isAnalystReadOnlyRequest(userRoles: string[], method: string): boolean {
  return (
    userRoles.includes(ANALYST_ROLE_CODE) &&
    !userRoles.includes(ADMIN_ROLE_CODE) &&
    !READ_ONLY_METHODS.has(method.toUpperCase())
  );
}
