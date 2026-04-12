import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { RecommendationTypesService } from "./application/recommendation-types.service";
import { VisitaRecomendacionesService } from "./application/visita-recomendaciones.service";
import { TipoRecomendacionEntity } from "./infrastructure/persistence/entities/tipo-recomendacion.entity";
import { VisitaRecomendacionEntity } from "./infrastructure/persistence/entities/visita-recomendacion.entity";
import { TiposRecomendacionController } from "./presentation/tipos-recomendacion.controller";
import { VisitaCampoRecomendacionesController } from "./presentation/visita-campo-recomendaciones.controller";
import { VisitaRecomendacionesController } from "./presentation/visita-recomendaciones.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaCampoEntity,
      VisitaRecomendacionEntity,
      TipoRecomendacionEntity
    ])
  ],
  controllers: [
    TiposRecomendacionController,
    VisitaCampoRecomendacionesController,
    VisitaRecomendacionesController
  ],
  providers: [RecommendationTypesService, VisitaRecomendacionesService],
  exports: [
    TypeOrmModule,
    RecommendationTypesService,
    VisitaRecomendacionesService
  ]
})
export class VisitaRecomendacionesModule {}
