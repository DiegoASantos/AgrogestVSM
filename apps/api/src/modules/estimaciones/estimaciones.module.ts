import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { EstimacionesService } from "./application/estimaciones.service";
import { EstimacionVisitaEntity } from "./infrastructure/persistence/entities/estimacion-visita.entity";
import { EstimacionesController } from "./presentation/estimaciones.controller";
import { EstimacionPrecioEntity } from "./infrastructure/persistence/entities/estimacion-precio.entity";

@Module({
  imports: [TypeOrmModule.forFeature([EstimacionVisitaEntity, EstimacionPrecioEntity])],
  controllers: [EstimacionesController],
  providers: [EstimacionesService]
})
export class EstimacionesModule {}
