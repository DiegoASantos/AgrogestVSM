import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaniaEntity } from "../campanias/infrastructure/persistence/entities/campania.entity";
import { CultivoEntity } from "../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { ParcelaEntity } from "../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { SectorEntity } from "../sectores/infrastructure/persistence/entities/sector.entity";
import { SubsectorEntity } from "../subsectores/infrastructure/persistence/entities/subsector.entity";
import { VariedadEntity } from "../variedades/infrastructure/persistence/entities/variedad.entity";
import { CostBuildExportService } from "./application/cost-build-export.service";
import { CostBuildExportController } from "./presentation/cost-build-export.controller";
import { CostBuildApiKeyGuard } from "./presentation/guards/cost-build-api-key.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CultivoEntity,
      VariedadEntity,
      CampaniaEntity,
      ProductorEntity,
      SectorEntity,
      SubsectorEntity,
      ParcelaEntity
    ])
  ],
  controllers: [CostBuildExportController],
  providers: [CostBuildExportService, CostBuildApiKeyGuard]
})
export class IntegracionesModule {}
