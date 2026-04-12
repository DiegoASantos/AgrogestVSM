import { Injectable } from "@nestjs/common";
import {
  TypeOrmModuleOptions,
  TypeOrmOptionsFactory
} from "@nestjs/typeorm";
import type { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

import { AppConfigService } from "../config/app-config.service";
import type { DatabaseConnectionOptions } from "./database.types";

@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly appConfig: AppConfigService) {}

  get options(): DatabaseConnectionOptions {
    return this.appConfig.database;
  }

  get isConfigured(): boolean {
    const { username, password, database, host } = this.options;

    return [username, password, database, host].every(
      (value) => String(value).trim().length > 0
    );
  }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const { applicationName, ...options } = this.options;

    const postgresOptions: PostgresConnectionOptions = {
      ...options,
      extra: {
        application_name: applicationName
      }
    };

    return {
      ...postgresOptions,
      autoLoadEntities: options.autoLoadEntities
    };
  }
}
