import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ReportesService } from "./application/reportes.service";
import { ReportesController } from "./presentation/reportes.controller";

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [ReportesController],
  providers: [ReportesService]
})
export class ReportesModule {}

