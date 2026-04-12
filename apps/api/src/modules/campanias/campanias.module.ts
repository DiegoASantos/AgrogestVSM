import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CultivoEntity } from "../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { CampaniasService } from "./application/campanias.service";
import { CampaniaEntity } from "./infrastructure/persistence/entities/campania.entity";
import { CampaniasController } from "./presentation/campanias.controller";

@Module({
  imports: [TypeOrmModule.forFeature([CampaniaEntity, CultivoEntity])],
  controllers: [CampaniasController],
  providers: [CampaniasService],
  exports: [TypeOrmModule, CampaniasService]
})
export class CampaniasModule {}
