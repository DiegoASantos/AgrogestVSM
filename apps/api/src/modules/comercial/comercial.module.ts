import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductoresModule } from "../productores/productores.module";
import { ComercialService } from "./application/comercial.service";
import { PagoCosechaEntity } from "./infrastructure/persistence/entities/pago-cosecha.entity";
import { ComercialController } from "./presentation/comercial.controller";
@Module({
  imports: [TypeOrmModule.forFeature([PagoCosechaEntity]), ProductoresModule],
  controllers: [ComercialController],
  providers: [ComercialService]
})
export class ComercialModule {}
