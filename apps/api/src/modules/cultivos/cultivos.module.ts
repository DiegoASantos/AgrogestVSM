import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CultivosService } from "./application/cultivos.service";
import { CultivoEntity } from "./infrastructure/persistence/entities/cultivo.entity";
import { CultivosController } from "./presentation/cultivos.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CultivoEntity])],
  controllers: [CultivosController],
  providers: [CultivosService],
  exports: [TypeOrmModule, CultivosService]
})
export class CultivosModule {}
