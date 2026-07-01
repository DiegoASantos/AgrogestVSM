import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { DistritoEntity } from "../geografias/infrastructure/persistence/entities/distrito.entity";
import { ParcelaEntity } from "../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { SubsectorEntity } from "../subsectores/infrastructure/persistence/entities/subsector.entity";
import { SectoresService } from "./application/sectores.service";
import { SectorEntity } from "./infrastructure/persistence/entities/sector.entity";
import { ProductorSectoresController } from "./presentation/productor-sectores.controller";
import { SectoresController } from "./presentation/sectores.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SectorEntity,
      DistritoEntity,
      ParcelaEntity,
      ProductorEntity,
      SubsectorEntity
    ])
  ],
  controllers: [SectoresController, ProductorSectoresController],
  providers: [SectoresService],
  exports: [TypeOrmModule, SectoresService]
})
export class SectoresModule {}
