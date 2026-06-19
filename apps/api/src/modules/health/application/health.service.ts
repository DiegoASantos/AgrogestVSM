import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { AppConfigService } from "../../../config/app-config.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly appConfig: AppConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  getStatus() {
    return createSuccessResponse({
      status: "ok",
      service: this.appConfig.appName,
      environment: this.appConfig.nodeEnv,
      uptimeSeconds: Number(process.uptime().toFixed(0)),
      deployment: {
        commit: process.env.RENDER_GIT_COMMIT ?? null,
        branch: process.env.RENDER_GIT_BRANCH ?? null,
        serviceId: process.env.RENDER_SERVICE_ID ?? null
      }
    });
  }

  async getDatabaseStatus() {
    try {
      if (!this.dataSource.isInitialized) {
        throw new Error("TypeORM data source is not initialized.");
      }

      const [postgisMetadata] = await this.dataSource.query(
        'SELECT PostGIS_Version() AS "postgisVersion"'
      );

      return createSuccessResponse({
        status: "ok",
        service: this.appConfig.appName,
        database: {
          status: "up",
          type: this.appConfig.database.type,
          postgisEnabled: true,
          postgisVersion:
            typeof postgisMetadata?.postgisVersion === "string"
              ? postgisMetadata.postgisVersion
              : "unknown"
        }
      });
    } catch (error) {
      throw new ServiceUnavailableException({
        message: "Database or PostGIS connection is not available.",
        details: this.appConfig.isDevelopment
          ? {
              reason: error instanceof Error ? error.message : "Unknown error."
            }
          : undefined
      });
    }
  }
}
