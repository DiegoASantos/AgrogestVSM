import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { hash } from "bcrypt";
import { randomUUID } from "node:crypto";
import { Repository } from "typeorm";

import { RoleEntity } from "../../../roles/infrastructure/persistence/entities/role.entity";
import { UserEntity } from "../../../users/infrastructure/persistence/entities/user.entity";
import { UserRoleEntity } from "../persistence/entities/user-role.entity";

type SeedRoleDefinition = {
  code: string;
  name: string;
  description: string;
};

type AuthSeedConfig = {
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
};

const AUTH_SEED_ROLES: SeedRoleDefinition[] = [
  {
    code: "ADMIN",
    name: "ADMIN",
    description: "Rol administrador base para desarrollo."
  },
  {
    code: "AGRONOMO",
    name: "AGRONOMO",
    description: "Rol agronomo base para desarrollo."
  }
];

const DEFAULT_AUTH_SEED_CONFIG: AuthSeedConfig = {
  adminFirstName: "Admin",
  adminLastName: "VSM",
  adminEmail: "admin@agrogestvsm.local",
  adminPassword: "Admin123*"
};

const DEFAULT_BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthSeedService {
  private readonly logger = new Logger(AuthSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRolesRepository: Repository<UserRoleEntity>
  ) {}

  async run(): Promise<void> {
    const seedConfig = readAuthSeedConfig();
    const rolesByCode = await this.ensureBaseRoles();
    const adminUser = await this.ensureAdminUser(seedConfig);

    await this.ensureAdminRoleAssignment(adminUser, rolesByCode.ADMIN);

    this.logger.log(
      `Auth seed completed for ${seedConfig.adminEmail.toLowerCase()}.`
    );
  }

  private async ensureBaseRoles(): Promise<Record<string, RoleEntity>> {
    const rolesByCode: Record<string, RoleEntity> = {};

    for (const definition of AUTH_SEED_ROLES) {
      let role = await this.rolesRepository.findOne({
        where: { code: definition.code }
      });

      if (!role) {
        role = await this.rolesRepository.save(
          this.rolesRepository.create({
            code: definition.code,
            name: definition.name,
            description: definition.description
          })
        );

        this.logger.log(`Created role ${definition.code}.`);
      } else {
        this.logger.log(`Role ${definition.code} already exists.`);
      }

      rolesByCode[definition.code] = role;
    }

    return rolesByCode;
  }

  private async ensureAdminUser(seedConfig: AuthSeedConfig): Promise<UserEntity> {
    const normalizedEmail = seedConfig.adminEmail.toLowerCase();
    const existingUser = await this.usersRepository
      .createQueryBuilder("user")
      .where("LOWER(user.email) = LOWER(:email)", {
        email: normalizedEmail
      })
      .getOne();

    if (existingUser) {
      this.logger.log(`Admin user ${normalizedEmail} already exists.`);

      if (!existingUser.isActive) {
        this.logger.warn(
          `Admin user ${normalizedEmail} exists but is inactive. The seed does not modify existing users.`
        );
      }

      return existingUser;
    }

    const passwordHash = await hash(
      seedConfig.adminPassword,
      DEFAULT_BCRYPT_ROUNDS
    );
    const timestamp = new Date();

    const adminUser = await this.usersRepository.save(
      this.usersRepository.create({
        publicId: randomUUID(),
        firstName: seedConfig.adminFirstName,
        lastName: seedConfig.adminLastName,
        email: normalizedEmail,
        phone: null,
        passwordHash,
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp
      })
    );

    this.logger.log(`Created admin user ${normalizedEmail}.`);

    return adminUser;
  }

  private async ensureAdminRoleAssignment(
    adminUser: UserEntity,
    adminRole: RoleEntity
  ): Promise<void> {
    const existingAssignment = await this.userRolesRepository.findOne({
      where: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    });

    if (existingAssignment) {
      this.logger.log(
        `Admin role already assigned to ${adminUser.email.toLowerCase()}.`
      );

      return;
    }

    await this.userRolesRepository.save(
      this.userRolesRepository.create({
        userId: adminUser.id,
        roleId: adminRole.id
      })
    );

    this.logger.log(
      `Assigned role ${adminRole.code} to ${adminUser.email.toLowerCase()}.`
    );
  }
}

function readAuthSeedConfig(): AuthSeedConfig {
  const isProduction = process.env.NODE_ENV === "production";

  const adminPassword = process.env.SEED_ADMIN_PASSWORD?.trim();

  if (isProduction && !adminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required in production. " +
        "Set it as an environment variable before running the seed."
    );
  }

  return {
    adminFirstName: readSeedValue(
      process.env.SEED_ADMIN_FIRST_NAME,
      DEFAULT_AUTH_SEED_CONFIG.adminFirstName
    ),
    adminLastName: readSeedValue(
      process.env.SEED_ADMIN_LAST_NAME,
      DEFAULT_AUTH_SEED_CONFIG.adminLastName
    ),
    adminEmail: readSeedValue(
      process.env.SEED_ADMIN_EMAIL,
      DEFAULT_AUTH_SEED_CONFIG.adminEmail
    ),
    adminPassword: adminPassword || DEFAULT_AUTH_SEED_CONFIG.adminPassword
  };
}

function readSeedValue(value: string | undefined, fallback: string): string {
  const normalizedValue = value?.trim();

  return normalizedValue && normalizedValue.length > 0
    ? normalizedValue
    : fallback;
}
