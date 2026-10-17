import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VisitasComercialesService } from "./application/visitas-comerciales.service";
import { VisitaComercialEntity } from "./infrastructure/persistence/entities/visita-comercial.entity";
import { VisitasComercialesController } from "./presentation/visitas-comerciales.controller";
import { VisitasCampoModule } from "../visitas-campo/visitas-campo.module";

@Module({
  imports: [TypeOrmModule.forFeature([VisitaComercialEntity]), VisitasCampoModule],
  controllers: [VisitasComercialesController],
  providers: [VisitasComercialesService],
  exports: [VisitasComercialesService]
})
export class VisitasComercialesModule {}
