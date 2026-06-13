import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LaboresCulturalesService } from "./application/labores-culturales.service";
import { TiposRiegoService } from "./application/tipos-riego.service";
import { LaborCulturalEntity } from "./infrastructure/persistence/entities/labor-cultural.entity";
import { TipoRiegoEntity } from "./infrastructure/persistence/entities/tipo-riego.entity";
import { LaboresCulturalesController } from "./presentation/labores-culturales.controller";
import { TiposRiegoController } from "./presentation/tipos-riego.controller";

@Module({
  imports: [TypeOrmModule.forFeature([TipoRiegoEntity, LaborCulturalEntity])],
  controllers: [TiposRiegoController, LaboresCulturalesController],
  providers: [TiposRiegoService, LaboresCulturalesService],
  exports: [TypeOrmModule, TiposRiegoService, LaboresCulturalesService]
})
export class OperacionesCampoModule {}
