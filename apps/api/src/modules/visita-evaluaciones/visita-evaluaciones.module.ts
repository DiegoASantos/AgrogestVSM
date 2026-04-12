import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaEvaluacionesService } from "./application/visita-evaluaciones.service";
import { VisitaEvaluacionEntity } from "./infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaCampoEvaluacionesController } from "./presentation/visita-campo-evaluaciones.controller";
import { VisitaEvaluacionesController } from "./presentation/visita-evaluaciones.controller";

@Module({
  imports: [TypeOrmModule.forFeature([VisitaEvaluacionEntity, VisitaCampoEntity])],
  controllers: [
    VisitaCampoEvaluacionesController,
    VisitaEvaluacionesController
  ],
  providers: [VisitaEvaluacionesService],
  exports: [TypeOrmModule, VisitaEvaluacionesService]
})
export class VisitaEvaluacionesModule {}
