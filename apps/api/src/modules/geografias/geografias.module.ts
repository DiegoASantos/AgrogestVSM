import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { GeografiasService } from "./application/geografias.service";
import { DepartamentoEntity } from "./infrastructure/persistence/entities/departamento.entity";
import { DistritoEntity } from "./infrastructure/persistence/entities/distrito.entity";
import { ProvinciaEntity } from "./infrastructure/persistence/entities/provincia.entity";
import { GeografiasController } from "./presentation/geografias.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([DepartamentoEntity, ProvinciaEntity, DistritoEntity])
  ],
  controllers: [GeografiasController],
  providers: [GeografiasService],
  exports: [TypeOrmModule]
})
export class GeografiasModule {}
