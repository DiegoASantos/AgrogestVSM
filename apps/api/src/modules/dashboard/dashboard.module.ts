import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DashboardController } from "./presentation/dashboard.controller";
import { DashboardService } from "./application/dashboard.service";

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
