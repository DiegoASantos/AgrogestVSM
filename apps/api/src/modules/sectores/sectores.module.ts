import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { SectoresService } from "./application/sectores.service";
import { SectorEntity } from "./infrastructure/persistence/entities/sector.entity";
import { ProductorSectoresController } from "./presentation/productor-sectores.controller";
import { SectoresController } from "./presentation/sectores.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SectorEntity, ProductorEntity])],
  controllers: [SectoresController, ProductorSectoresController],
  providers: [SectoresService],
  exports: [TypeOrmModule, SectoresService]
})
export class SectoresModule {}
