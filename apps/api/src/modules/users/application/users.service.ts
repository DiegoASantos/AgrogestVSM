import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "bcrypt";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { UserEntity } from "../infrastructure/persistence/entities/user.entity";
import { CreateUserDto } from "../presentation/dto/create-user.dto";
import { UpdateUserDto } from "../presentation/dto/update-user.dto";

export type SelfProfileUpdate = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>
  ) {}

  isReady(): boolean {
    return true;
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { id }
    });
  }

  findByPublicId(publicId: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { publicId }
    });
  }

  findByPublicIdWithRoles(publicId: string): Promise<UserEntity | null> {
    return this.createAuthUserQuery()
      .where("user.public_id = :publicId", {
        publicId
      })
      .getOne();
  }

  // The database enforces a unique index on lower(email).
  findByEmail(email: string): Promise<UserEntity | null> {
    return this.createAuthUserQuery()
      .where("LOWER(user.email) = LOWER(:email)", {
        email: email.trim()
      })
      .getOne();
  }

  async findAllAdmin() {
    const users = await this.createAdminUserQuery()
      .orderBy("user.createdAt", "DESC")
      .take(500)
      .getMany();

    return createSuccessResponse(
      users.map((user) => this.toAdminResponse(user)),
      {
        count: users.length
      }
    );
  }

  async findActiveAgronomistLookups() {
    const users = await this.usersRepository
      .createQueryBuilder("user")
      .innerJoin("user.userRoles", "userRole")
      .innerJoin("userRole.role", "role")
      .where("user.activo = true")
      .andWhere("role.codigo = :roleCode", { roleCode: "AGRONOMO" })
      .orderBy("user.apellidos", "ASC")
      .addOrderBy("user.nombres", "ASC")
      .getMany();

    return createSuccessResponse(
      users.map((user) => ({
        id: user.id,
        displayName: `${user.firstName} ${user.lastName}`.trim(),
        isActive: user.isActive
      })),
      { count: users.length }
    );
  }

  async findAdminById(id: string) {
    const user = await this.findAdminEntityById(id);

    return createSuccessResponse(this.toAdminResponse(user));
  }

  async createAdmin(createUserDto: CreateUserDto) {
    const user = this.usersRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: createUserDto.email,
      phone: createUserDto.phone ?? null,
      passwordHash: await hash(createUserDto.password, 10),
      ...(createUserDto.isActive !== undefined
        ? { isActive: createUserDto.isActive }
        : {}),
      ...(createUserDto.canDeleteVisits !== undefined
        ? { canDeleteVisits: createUserDto.canDeleteVisits }
        : {})
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      const persistedUser = await this.findAdminEntityById(savedUser.id);

      return createSuccessResponse(this.toAdminResponse(persistedUser));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async updateAdmin(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findEntityById(id);
    const updatedUser = this.usersRepository.merge(user, {
      ...(updateUserDto.firstName !== undefined
        ? { firstName: updateUserDto.firstName }
        : {}),
      ...(updateUserDto.lastName !== undefined
        ? { lastName: updateUserDto.lastName }
        : {}),
      ...(updateUserDto.email !== undefined ? { email: updateUserDto.email } : {}),
      ...(updateUserDto.phone !== undefined ? { phone: updateUserDto.phone } : {}),
      ...(updateUserDto.isActive !== undefined
        ? { isActive: updateUserDto.isActive }
        : {}),
      ...(updateUserDto.canDeleteVisits !== undefined
        ? { canDeleteVisits: updateUserDto.canDeleteVisits }
        : {})
    });

    if (updateUserDto.password !== undefined && updateUserDto.password !== null) {
      updatedUser.passwordHash = await hash(updateUserDto.password, 10);
    }

    try {
      await this.usersRepository.save(updatedUser);
      const persistedUser = await this.findAdminEntityById(id);

      return createSuccessResponse(this.toAdminResponse(persistedUser));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async updateSelfProfile(
    publicId: string,
    updateData: SelfProfileUpdate
  ): Promise<UserEntity> {
    const user = await this.findByPublicIdWithRoles(publicId);

    if (!user) {
      throw new NotFoundException("Usuario not found.");
    }

    const updatedUser = this.usersRepository.merge(user, {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      email: updateData.email,
      ...(updateData.phone !== undefined ? { phone: updateData.phone } : {}),
      ...(updateData.passwordHash !== undefined
        ? { passwordHash: updateData.passwordHash }
        : {})
    });

    try {
      await this.usersRepository.save(updatedUser);
      const persistedUser = await this.findByPublicIdWithRoles(publicId);

      if (!persistedUser) {
        throw new NotFoundException("Usuario not found.");
      }

      return persistedUser;
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async removeAdmin(id: string) {
    const user = await this.findEntityById(id);

    if (!user.isActive) {
      const persistedUser = await this.findAdminEntityById(id);

      return createSuccessResponse(this.toAdminResponse(persistedUser));
    }

    user.isActive = false;

    try {
      await this.usersRepository.save(user);
      const persistedUser = await this.findAdminEntityById(id);

      return createSuccessResponse(this.toAdminResponse(persistedUser));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  private createAuthUserQuery() {
    return this.usersRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.userRoles", "userRole")
      .leftJoinAndSelect("userRole.role", "role");
  }

  private createAdminUserQuery() {
    return this.createAuthUserQuery();
  }

  private async findEntityById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException("Usuario not found.");
    }

    return user;
  }

  private async findAdminEntityById(id: string) {
    const user = await this.createAdminUserQuery()
      .where("user.id = :id", { id })
      .getOne();

    if (!user) {
      throw new NotFoundException("Usuario not found.");
    }

    return user;
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
        databaseError.constraint === "ux_usuarios_email_lower"
      ) {
        throw new ConflictException("A user with the same email already exists.");
      }
    }

    throw error;
  }

  private toAdminResponse(user: UserEntity) {
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
      id: user.id,
      publicId: user.publicId,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      canDeleteVisits: user.canDeleteVisits,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles
    };
  }
}
