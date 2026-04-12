import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { RoleEntity } from "../infrastructure/persistence/entities/role.entity";
import { CreateRoleDto } from "../presentation/dto/create-role.dto";
import { UpdateRoleDto } from "../presentation/dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>
  ) {}

  isReady(): boolean {
    return true;
  }

  findById(id: number | string): Promise<RoleEntity | null> {
    return this.rolesRepository.findOne({
      where: { id: Number(id) }
    });
  }

  findByCode(code: string): Promise<RoleEntity | null> {
    return this.rolesRepository.findOne({
      where: { code }
    });
  }

  async findAllAdmin(pagination: PaginationQueryDto) {
    const [roles, total] = await this.rolesRepository.findAndCount({
      order: {
        name: "ASC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      roles.map((role) => this.toResponse(role)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findAdminById(id: string) {
    const role = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(role));
  }

  async createAdmin(createRoleDto: CreateRoleDto) {
    const role = this.rolesRepository.create({
      code: createRoleDto.code,
      name: createRoleDto.name,
      description: createRoleDto.description ?? null
    });

    try {
      const savedRole = await this.rolesRepository.save(role);

      return createSuccessResponse(this.toResponse(savedRole));
    } catch (error) {
      this.handlePersistenceError(error, "create");
    }
  }

  async updateAdmin(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findEntityById(id);
    const updatedRole = this.rolesRepository.merge(role, {
      ...(updateRoleDto.code !== undefined ? { code: updateRoleDto.code } : {}),
      ...(updateRoleDto.name !== undefined ? { name: updateRoleDto.name } : {}),
      ...(updateRoleDto.description !== undefined
        ? { description: updateRoleDto.description }
        : {})
    });

    try {
      const savedRole = await this.rolesRepository.save(updatedRole);

      return createSuccessResponse(this.toResponse(savedRole));
    } catch (error) {
      this.handlePersistenceError(error, "update");
    }
  }

  async removeAdmin(id: string) {
    const role = await this.findEntityById(id);
    const response = this.toResponse(role);

    try {
      await this.rolesRepository.remove(role);

      return createSuccessResponse(response);
    } catch (error) {
      this.handlePersistenceError(error, "delete");
    }
  }

  private async findEntityById(id: string) {
    const role = await this.rolesRepository.findOne({
      where: { id: Number(id) }
    });

    if (!role) {
      throw new NotFoundException("Rol not found.");
    }

    return role;
  }

  private handlePersistenceError(
    error: unknown,
    operation: "create" | "update" | "delete"
  ): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "roles_codigo_key"
      ) {
        throw new ConflictException("A role with the same code already exists.");
      }

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "roles_nombre_key"
      ) {
        throw new ConflictException("A role with the same name already exists.");
      }

      if (operation === "delete" && databaseError?.code === "23503") {
        throw new ConflictException("Cannot delete the role because it is in use.");
      }
    }

    throw error;
  }

  private toResponse(role: RoleEntity) {
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description
    };
  }
}
