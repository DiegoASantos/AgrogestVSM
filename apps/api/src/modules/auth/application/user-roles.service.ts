import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { RolesService } from "../../roles/application/roles.service";
import { RoleEntity } from "../../roles/infrastructure/persistence/entities/role.entity";
import { UsersService } from "../../users/application/users.service";
import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import { UserRoleEntity } from "../infrastructure/persistence/entities/user-role.entity";
import { CreateUserRoleDto } from "../presentation/dto/create-user-role.dto";
import { FindUserRolesQueryDto } from "../presentation/dto/find-user-roles-query.dto";
import { UpdateUserRoleDto } from "../presentation/dto/update-user-role.dto";

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRolesRepository: Repository<UserRoleEntity>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService
  ) {}

  isReady(): boolean {
    return true;
  }

  findByUserId(userId: string): Promise<UserRoleEntity[]> {
    return this.userRolesRepository.find({
      where: { userId },
      relations: {
        role: true
      }
    });
  }

  async findAllAdmin(query: FindUserRolesQueryDto) {
    const userRoles = await this.userRolesRepository.find({
      relations: {
        user: true,
        role: true
      },
      where: {
        ...(query.usuario_id ? { userId: query.usuario_id } : {}),
        ...(query.rol_id ? { roleId: Number(query.rol_id) } : {})
      },
      order: {
        user: {
          firstName: "ASC",
          lastName: "ASC"
        },
        role: {
          name: "ASC"
        }
      },
      take: 500
    });

    return createSuccessResponse(
      userRoles.map((userRole) => this.toResponse(userRole)),
      {
        count: userRoles.length
      }
    );
  }

  async createAdmin(createUserRoleDto: CreateUserRoleDto) {
    const user = await this.findUserById(createUserRoleDto.userId);
    const role = await this.findRoleById(createUserRoleDto.roleId);

    const userRole = this.userRolesRepository.create({
      userId: user.id,
      roleId: role.id,
      user,
      role
    });

    try {
      const savedUserRole = await this.userRolesRepository.save(userRole);

      return createSuccessResponse(this.toResponse(savedUserRole, user, role));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async updateAdmin(
    userId: string,
    roleId: string,
    updateUserRoleDto: UpdateUserRoleDto
  ) {
    const currentUserRole = await this.findEntityByIds(userId, roleId);
    const nextUserId = updateUserRoleDto.userId ?? currentUserRole.userId;
    const nextRoleId =
      updateUserRoleDto.roleId ?? String(currentUserRole.roleId);

    const user = await this.findUserById(nextUserId);
    const role = await this.findRoleById(nextRoleId);

    if (
      nextUserId === currentUserRole.userId &&
      Number(nextRoleId) === currentUserRole.roleId
    ) {
      return createSuccessResponse(this.toResponse(currentUserRole, user, role));
    }

    const nextUserRole = this.userRolesRepository.create({
      userId: user.id,
      roleId: role.id,
      user,
      role
    });

    try {
      const savedUserRole = await this.dataSource.transaction(
        async (transactionManager) => {
          const userRolesRepository =
            transactionManager.getRepository(UserRoleEntity);
          const savedUserRole = await userRolesRepository.save(nextUserRole);

          await userRolesRepository.delete({
            userId: currentUserRole.userId,
            roleId: currentUserRole.roleId
          });

          return savedUserRole;
        }
      );

      return createSuccessResponse(this.toResponse(savedUserRole, user, role));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async removeAdmin(userId: string, roleId: string) {
    const userRole = await this.findEntityByIds(userId, roleId);
    const response = this.toResponse(userRole);

    await this.userRolesRepository.remove(userRole);

    return createSuccessResponse(response);
  }

  private async findEntityByIds(userId: string, roleId: string) {
    const userRole = await this.userRolesRepository.findOne({
      relations: {
        user: true,
        role: true
      },
      where: {
        userId,
        roleId: Number(roleId)
      }
    });

    if (!userRole) {
      throw new NotFoundException("Usuario rol not found.");
    }

    return userRole;
  }

  private async findUserById(id: string) {
    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException("Usuario not found.");
    }

    return user;
  }

  private async findRoleById(id: string) {
    const role = await this.rolesService.findById(id);

    if (!role) {
      throw new NotFoundException("Rol not found.");
    }

    return role;
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "usuario_roles_pkey"
      ) {
        throw new ConflictException("The user already has the selected role.");
      }
    }

    throw error;
  }

  private toResponse(
    userRole: UserRoleEntity,
    user: UserEntity = userRole.user,
    role: RoleEntity = userRole.role
  ) {
    return {
      userId: userRole.userId,
      roleId: String(userRole.roleId),
      user: {
        id: user.id,
        publicId: user.publicId,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        isActive: user.isActive
      },
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description
      }
    };
  }
}
