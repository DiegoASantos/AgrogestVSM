import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppConfigService } from "../config/app-config.service";
import { DatabaseConfigService } from "./database-config.service";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => {
        const dbConfig = appConfig.database;
        const { applicationName, ...options } = dbConfig;

        return {
          ...options,
          extra: {
            application_name: applicationName
          },
          autoLoadEntities: options.autoLoadEntities
        };
      }
    })
  ],
  providers: [DatabaseConfigService],
  exports: [DatabaseConfigService, TypeOrmModule]
})
export class DatabaseModule {}
