import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ParcelaEntity } from "../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaRecetaEntity } from "../visita-recetas/infrastructure/persistence/entities/visita-receta.entity";
import { VisitaCalificacionesService } from "./application/visita-calificaciones.service";
import { VisitaCalificacionEntity } from "./infrastructure/persistence/entities/visita-calificacion.entity";
import { ParcelaRecetaAnteriorController } from "./presentation/parcela-receta-anterior.controller";
import { ProductorCalificacionController } from "./presentation/productor-calificacion.controller";
import { VisitaCampoCalificacionesController } from "./presentation/visita-campo-calificaciones.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaCalificacionEntity,
      VisitaCampoEntity,
      VisitaRecetaEntity,
      ParcelaEntity,
      ProductorEntity
    ])
  ],
  controllers: [
    VisitaCampoCalificacionesController,
    ParcelaRecetaAnteriorController,
    ProductorCalificacionController
  ],
  providers: [VisitaCalificacionesService],
  exports: [TypeOrmModule, VisitaCalificacionesService]
})
export class VisitaCalificacionesModule {}
