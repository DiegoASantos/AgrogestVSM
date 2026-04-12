import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ParcelasModule } from "../parcelas/parcelas.module";
import { SectoresModule } from "../sectores/sectores.module";
import { VisitasCampoModule } from "../visitas-campo/visitas-campo.module";
import { ProductoresService } from "./application/productores.service";
import { ProductorEntity } from "./infrastructure/persistence/entities/productor.entity";
import { ProductoresController } from "./presentation/productores.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductorEntity]),
    SectoresModule,
    ParcelasModule,
    VisitasCampoModule
  ],
  controllers: [ProductoresController],
  providers: [ProductoresService],
  exports: [TypeOrmModule, ProductoresService]
})
export class ProductoresModule {}
