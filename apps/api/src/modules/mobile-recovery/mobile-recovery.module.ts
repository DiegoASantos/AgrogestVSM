import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { VisitasCampoModule } from "../visitas-campo/visitas-campo.module";
import { VisitasComercialesModule } from "../visitas-comerciales/visitas-comerciales.module";
import { VisitaRecetasModule } from "../visita-recetas/visita-recetas.module";
import { ComercialModule } from "../comercial/comercial.module";
import { PagoCosechaEntity } from "../comercial/infrastructure/persistence/entities/pago-cosecha.entity";
import { RegistroCosechaEntity } from "../comercial/infrastructure/persistence/entities/registro-cosecha.entity";
import { AcreedorCosechaEntity } from "../comercial/infrastructure/persistence/entities/acreedor-cosecha.entity";
import { MobileRecoveryController } from "./presentation/mobile-recovery.controller";
import { MobileRecoveryService } from "./application/mobile-recovery.service";

@Module({
  imports: [
    AuthModule,
    VisitasCampoModule,
    VisitasComercialesModule,
    VisitaRecetasModule,
    ComercialModule,
    TypeOrmModule.forFeature([PagoCosechaEntity, RegistroCosechaEntity, AcreedorCosechaEntity])
  ],
  controllers: [MobileRecoveryController],
  providers: [MobileRecoveryService]
})
export class MobileRecoveryModule {}
