import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VariedadesService } from "./application/variedades.service";
import { VariedadEntity } from "./infrastructure/persistence/entities/variedad.entity";
import { CultivoVariedadesController } from "./presentation/cultivo-variedades.controller";
import { VariedadesController } from "./presentation/variedades.controller";

@Module({
  imports: [TypeOrmModule.forFeature([VariedadEntity])],
  controllers: [VariedadesController, CultivoVariedadesController],
  providers: [VariedadesService],
  exports: [TypeOrmModule, VariedadesService]
})
export class VariedadesModule {}
