import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EstimacionesService } from "./application/estimaciones.service";
import { EstimacionVisitaEntity } from "./infrastructure/persistence/entities/estimacion-visita.entity";
import { EstimacionesController } from "./presentation/estimaciones.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EstimacionVisitaEntity])],
  controllers: [EstimacionesController],
  providers: [EstimacionesService]
})
export class EstimacionesModule {}
