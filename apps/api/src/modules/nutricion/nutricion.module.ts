import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CultivoEntity } from "../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { NutritionCatalogsService } from "./application/nutrition-catalogs.service";
import { DetalleNutrienteEntity } from "./infrastructure/persistence/entities/detalle-nutriente.entity";
import { NutrienteEntity } from "./infrastructure/persistence/entities/nutriente.entity";
import { DetalleNutrientesController } from "./presentation/detalle-nutrientes.controller";
import { NutrientesController } from "./presentation/nutrientes.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([NutrienteEntity, DetalleNutrienteEntity, CultivoEntity])
  ],
  controllers: [NutrientesController, DetalleNutrientesController],
  providers: [NutritionCatalogsService],
  exports: [TypeOrmModule, NutritionCatalogsService]
})
export class NutricionModule {}
