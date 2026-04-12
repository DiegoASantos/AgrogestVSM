import type { AuthRole, AuthSession } from "../types/auth.types";
import { adminRoutes } from "../../../shared/constants/site";

export const ADMIN_ROLE_CODE = "ADMIN";

type SessionInput = Pick<AuthSession, "user"> | null | undefined;
type RolesInput = Pick<AuthRole, "code">[] | undefined;

export function hasRole(roles: RolesInput, roleCode: string) {
  const normalizedCode = roleCode.trim().toUpperCase();

  return (roles ?? []).some((role) => role.code.trim().toUpperCase() === normalizedCode);
}

export function isAdminSession(session: SessionInput) {
  return hasRole(session?.user.roles, ADMIN_ROLE_CODE);
}

export function canAccessAdminPath(pathname: string, session: SessionInput) {
  if (!pathname) {
    return true;
  }

  return !isRestrictedAdminPath(pathname) || isAdminSession(session);
}

export function isRestrictedAdminPath(pathname: string) {
  return (
    pathname === adminRoutes.mantenimiento ||
    pathname.startsWith(`${adminRoutes.mantenimiento}/`) ||
    pathname === adminRoutes.seguridad ||
    pathname.startsWith(`${adminRoutes.seguridad}/`)
  );
}
