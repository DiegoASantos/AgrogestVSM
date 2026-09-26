import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductoresModule } from "../productores/productores.module";
import { ComercialService } from "./application/comercial.service";
import { AcreedorCosechaEntity } from "./infrastructure/persistence/entities/acreedor-cosecha.entity";
import { PagoCosechaEntity } from "./infrastructure/persistence/entities/pago-cosecha.entity";
import { RegistroCosechaEntity } from "./infrastructure/persistence/entities/registro-cosecha.entity";
import { ComercialController } from "./presentation/comercial.controller";
@Module({
  imports: [
    TypeOrmModule.forFeature([PagoCosechaEntity, AcreedorCosechaEntity, RegistroCosechaEntity]),
    ProductoresModule
  ],
  controllers: [ComercialController],
  providers: [ComercialService]
})
export class ComercialModule {}
