import type { AuthRole, AuthSession } from "../types/auth.types";
import { adminRoutes } from "../../../shared/constants/site";

export const ADMIN_ROLE_CODE = "ADMIN";
export const ANALYST_ROLE_CODE = "ANALISTA";
export const AGRONOMIST_ROLE_CODE = "AGRONOMO";

type SessionInput = Pick<AuthSession, "user"> | null | undefined;
type RolesInput = Pick<AuthRole, "code">[] | undefined;

export function hasRole(roles: RolesInput, roleCode: string) {
  const normalizedCode = roleCode.trim().toUpperCase();

  return (roles ?? []).some((role) => role.code.trim().toUpperCase() === normalizedCode);
}

export function isAdminSession(session: SessionInput) {
  return hasRole(session?.user.roles, ADMIN_ROLE_CODE);
}

export function isAnalystSession(session: SessionInput) {
  return hasRole(session?.user.roles, ANALYST_ROLE_CODE);
}

export function isAgronomistSession(session: SessionInput) {
  return hasRole(session?.user.roles, AGRONOMIST_ROLE_CODE);
}

export function isClimateSession(session: SessionInput) {
  return (
    isAdminSession(session) || isAnalystSession(session) || isAgronomistSession(session)
  );
}

export function isAdminOrAnalystSession(session: SessionInput) {
  return isAdminSession(session) || isAnalystSession(session);
}

export function canManageReservoirReadings(session: SessionInput) {
  return isAdminSession(session) || isAnalystSession(session);
}

export function canAccessAdminPath(pathname: string, session: SessionInput) {
  if (!pathname) {
    return true;
  }

  if (isClimatePath(pathname)) {
    return isClimateSession(session);
  }

  if (isMaintenancePath(pathname) || isReportsPath(pathname)) {
    return isAdminOrAnalystSession(session);
  }

  if (isSecurityPath(pathname)) {
    return isAdminSession(session);
  }

  return true;
}

export function isClimatePath(pathname: string) {
  return pathname === "/clima" || pathname.startsWith("/clima/");
}

export function isMaintenancePath(pathname: string) {
  return (
    pathname === adminRoutes.mantenimiento ||
    pathname.startsWith(`${adminRoutes.mantenimiento}/`)
  );
}

export function isReportsPath(pathname: string) {
  return pathname === adminRoutes.reportes || pathname.startsWith(`${adminRoutes.reportes}/`);
}

export function isSecurityPath(pathname: string) {
  return (
    pathname === adminRoutes.seguridad ||
    pathname.startsWith(`${adminRoutes.seguridad}/`)
  );
}

export function isRestrictedAdminPath(pathname: string) {
  return (
    isMaintenancePath(pathname) || isReportsPath(pathname) || isSecurityPath(pathname)
  );
}
