import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VisitasCampoModule } from "../visitas-campo/visitas-campo.module";
import { ParcelasService } from "./application/parcelas.service";
import { ParcelaEntity } from "./infrastructure/persistence/entities/parcela.entity";
import { SectorEntity } from "../sectores/infrastructure/persistence/entities/sector.entity";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { SubsectorEntity } from "../subsectores/infrastructure/persistence/entities/subsector.entity";
import { UserEntity } from "../users/infrastructure/persistence/entities/user.entity";
import { ParcelasController } from "./presentation/parcelas.controller";
import { SectorParcelasController } from "./presentation/sector-parcelas.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParcelaEntity,
      SectorEntity,
      SubsectorEntity,
      ProductorEntity,
      UserEntity
    ]),
    VisitasCampoModule
  ],
  controllers: [ParcelasController, SectorParcelasController],
  providers: [ParcelasService],
  exports: [TypeOrmModule, ParcelasService]
})
export class ParcelasModule {}
