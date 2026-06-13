import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LaborCulturalEntity } from "../operaciones-campo/infrastructure/persistence/entities/labor-cultural.entity";
import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaLaboresCulturalesService } from "./application/visita-labores-culturales.service";
import { VisitaLaborCulturalEntity } from "./infrastructure/persistence/entities/visita-labor-cultural.entity";
import { VisitaCampoLaboresCulturalesController } from "./presentation/visita-campo-labores-culturales.controller";
import { VisitaLaboresCulturalesController } from "./presentation/visita-labores-culturales.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaLaborCulturalEntity,
      VisitaCampoEntity,
      LaborCulturalEntity
    ])
  ],
  controllers: [
    VisitaCampoLaboresCulturalesController,
    VisitaLaboresCulturalesController
  ],
  providers: [VisitaLaboresCulturalesService],
  exports: [TypeOrmModule, VisitaLaboresCulturalesService]
})
export class VisitaLaboresCulturalesModule {}
