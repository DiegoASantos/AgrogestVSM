import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductoresModule } from "../productores/productores.module";
import { AuthModule } from "../auth/auth.module";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../users/infrastructure/persistence/entities/user.entity";
import { ComercialService } from "./application/comercial.service";
import { PagosProductoresService } from "./application/pagos-productores.service";
import { AdminAcreedoresCosechaService } from "./application/admin-acreedores-cosecha.service";
import { ProducerCreditorAccessService } from "./application/producer-creditor-access.service";
import { AcreedorCosechaEntity } from "./infrastructure/persistence/entities/acreedor-cosecha.entity";
import { InvitacionAcreedorProductorEntity } from "./infrastructure/persistence/entities/invitacion-acreedor-productor.entity";
import { PagoCosechaEntity } from "./infrastructure/persistence/entities/pago-cosecha.entity";
import { RegistroCosechaEntity } from "./infrastructure/persistence/entities/registro-cosecha.entity";
import { RevisionAcreedorCosechaEntity } from "./infrastructure/persistence/entities/revision-acreedor-cosecha.entity";
import { PagoProductorEntity } from "./infrastructure/persistence/entities/pago-productor.entity";
import { DetallePagoProductorEntity } from "./infrastructure/persistence/entities/detalle-pago-productor.entity";
import { ComercialController } from "./presentation/comercial.controller";
import { ProducerCreditorController, CreditorReviewController } from "./presentation/producer-creditor.controller";
import { ProducerCodeThrottlerGuard } from "./presentation/producer-code-throttler.guard";
import { AdminAcreedoresCosechaController, PagosProductoresController } from "./presentation/pagos-productores.controller";
@Module({
  imports: [
    TypeOrmModule.forFeature([PagoCosechaEntity, AcreedorCosechaEntity, RegistroCosechaEntity, InvitacionAcreedorProductorEntity, RevisionAcreedorCosechaEntity, PagoProductorEntity, DetallePagoProductorEntity, ProductorEntity, UserEntity]),
    ProductoresModule,
    AuthModule
  ],
  controllers: [ComercialController, ProducerCreditorController, CreditorReviewController, PagosProductoresController, AdminAcreedoresCosechaController],
  providers: [ComercialService, PagosProductoresService, AdminAcreedoresCosechaService, ProducerCreditorAccessService, ProducerCodeThrottlerGuard]
})
export class ComercialModule {}
