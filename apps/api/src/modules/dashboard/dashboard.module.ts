import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DashboardController } from "./presentation/dashboard.controller";
import { DashboardService } from "./application/dashboard.service";
import { VisitaCalificacionesModule } from "../visita-calificaciones/visita-calificaciones.module";

@Module({
  imports: [TypeOrmModule.forFeature([]), VisitaCalificacionesModule],
  controllers: [DashboardController],
  providers: [DashboardService]
})
export class DashboardModule {}
