import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductoresModule } from "../productores/productores.module";
import { AuthModule } from "../auth/auth.module";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../users/infrastructure/persistence/entities/user.entity";
import { ComercialService } from "./application/comercial.service";
import { ProducerCreditorAccessService } from "./application/producer-creditor-access.service";
import { AcreedorCosechaEntity } from "./infrastructure/persistence/entities/acreedor-cosecha.entity";
import { InvitacionAcreedorProductorEntity } from "./infrastructure/persistence/entities/invitacion-acreedor-productor.entity";
import { PagoCosechaEntity } from "./infrastructure/persistence/entities/pago-cosecha.entity";
import { RegistroCosechaEntity } from "./infrastructure/persistence/entities/registro-cosecha.entity";
import { RevisionAcreedorCosechaEntity } from "./infrastructure/persistence/entities/revision-acreedor-cosecha.entity";
import { ComercialController } from "./presentation/comercial.controller";
import { ProducerCreditorController, CreditorReviewController } from "./presentation/producer-creditor.controller";
import { ProducerCodeThrottlerGuard } from "./presentation/producer-code-throttler.guard";
@Module({
  imports: [
    TypeOrmModule.forFeature([PagoCosechaEntity, AcreedorCosechaEntity, RegistroCosechaEntity, InvitacionAcreedorProductorEntity, RevisionAcreedorCosechaEntity, ProductorEntity, UserEntity]),
    ProductoresModule,
    AuthModule
  ],
  controllers: [ComercialController, ProducerCreditorController, CreditorReviewController],
  providers: [ComercialService, ProducerCreditorAccessService, ProducerCodeThrottlerGuard]
})
export class ComercialModule {}
