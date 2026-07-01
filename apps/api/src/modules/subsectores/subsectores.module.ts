import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ParcelaEntity } from "../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { SectorEntity } from "../sectores/infrastructure/persistence/entities/sector.entity";
import { SubsectoresService } from "./application/subsectores.service";
import { SubsectorEntity } from "./infrastructure/persistence/entities/subsector.entity";
import { ProductorSectorSubsectoresController } from "./presentation/productor-sector-subsectores.controller";
import { SectorSubsectoresController } from "./presentation/sector-subsectores.controller";
import { SubsectoresController } from "./presentation/subsectores.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubsectorEntity,
      SectorEntity,
      ProductorEntity,
      ParcelaEntity
    ])
  ],
  controllers: [
    SubsectoresController,
    SectorSubsectoresController,
    ProductorSectorSubsectoresController
  ],
  providers: [SubsectoresService],
  exports: [TypeOrmModule, SubsectoresService]
})
export class SubsectoresModule {}
