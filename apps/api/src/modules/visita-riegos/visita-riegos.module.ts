import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { TipoRiegoEntity } from "../operaciones-campo/infrastructure/persistence/entities/tipo-riego.entity";
import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaRiegosService } from "./application/visita-riegos.service";
import { VisitaRiegoEntity } from "./infrastructure/persistence/entities/visita-riego.entity";
import { VisitaCampoRiegosController } from "./presentation/visita-campo-riegos.controller";
import { VisitaRiegosController } from "./presentation/visita-riegos.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaRiegoEntity,
      VisitaCampoEntity,
      TipoRiegoEntity
    ])
  ],
  controllers: [VisitaCampoRiegosController, VisitaRiegosController],
  providers: [VisitaRiegosService],
  exports: [TypeOrmModule, VisitaRiegosService]
})
export class VisitaRiegosModule {}
