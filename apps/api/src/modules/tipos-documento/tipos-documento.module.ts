import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { TiposDocumentoService } from "./application/tipos-documento.service";
import { TipoDocumentoEntity } from "./infrastructure/persistence/entities/tipo-documento.entity";
import { TiposDocumentoController } from "./presentation/tipos-documento.controller";

@Module({
  imports: [TypeOrmModule.forFeature([TipoDocumentoEntity])],
  controllers: [TiposDocumentoController],
  providers: [TiposDocumentoService],
  exports: [TypeOrmModule, TiposDocumentoService]
})
export class TiposDocumentoModule {}
