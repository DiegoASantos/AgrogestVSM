import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import type {
  AccessTokenPayload,
  AuthenticatedUserProfile
} from "../types/auth.types";

export function toAuthenticatedUserProfile(
  user: UserEntity
): AuthenticatedUserProfile {
  const roles = (user.userRoles ?? [])
    .map((userRole) => userRole.role)
    .filter((role) => role !== null && role !== undefined)
    .sort((left, right) => left.id - right.id)
    .map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description
    }));

  return {
    publicId: user.publicId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    roles
  };
}

export function toAccessTokenPayload(user: UserEntity): AccessTokenPayload {
  const profile = toAuthenticatedUserProfile(user);

  return {
    sub: user.publicId,
    userId: user.id,
    email: user.email,
    roles: profile.roles.map((role) => role.code)
  };
}
