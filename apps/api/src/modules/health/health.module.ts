import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { HealthService } from "./application/health.service";
import { HealthController } from "./presentation/health.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
