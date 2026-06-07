import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CampaniaEntity } from "../campanias/infrastructure/persistence/entities/campania.entity";
import { CultivoEntity } from "../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { ParcelaEntity } from "../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../users/infrastructure/persistence/entities/user.entity";
import { VariedadEntity } from "../variedades/infrastructure/persistence/entities/variedad.entity";
import { VisitaEvaluacionEntity } from "../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaObservacionSanitariaEntity } from "../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaProductoRecomendadoEntity } from "../visita-productos-recomendados/infrastructure/persistence/entities/visita-producto-recomendado.entity";
import { VisitaRecomendacionEntity } from "../visita-recomendaciones/infrastructure/persistence/entities/visita-recomendacion.entity";
import { EtapasFenologicasService } from "./application/etapas-fenologicas.service";
import { SubEtapasService } from "./application/sub-etapas.service";
import { VisitaPasoObservacionesService } from "./application/visita-paso-observaciones.service";
import { VisitasCampoService } from "./application/visitas-campo.service";
import { EtapaFenologicaEntity } from "./infrastructure/persistence/entities/etapa-fenologica.entity";
import { SubEtapaEntity } from "./infrastructure/persistence/entities/sub-etapa.entity";
import { VisitaCampoEntity } from "./infrastructure/persistence/entities/visita-campo.entity";
import { VisitaPasoObservacionEntity } from "./infrastructure/persistence/entities/visita-paso-observacion.entity";
import { EtapasFenologicasController } from "./presentation/etapas-fenologicas.controller";
import { SubEtapasController } from "./presentation/sub-etapas.controller";
import { VisitaPasoObservacionesController } from "./presentation/visita-paso-observaciones.controller";
import { VisitasCampoController } from "./presentation/visitas-campo.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaCampoEntity,
      EtapaFenologicaEntity,
      SubEtapaEntity,
      CultivoEntity,
      VariedadEntity,
      ParcelaEntity,
      CampaniaEntity,
      UserEntity,
      ProductorEntity,
      VisitaEvaluacionEntity,
      VisitaObservacionSanitariaEntity,
      VisitaRecomendacionEntity,
      VisitaProductoRecomendadoEntity,
      VisitaPasoObservacionEntity
    ])
  ],
  controllers: [
    VisitasCampoController,
    EtapasFenologicasController,
    SubEtapasController,
    VisitaPasoObservacionesController
  ],
  providers: [
    VisitasCampoService,
    EtapasFenologicasService,
    SubEtapasService,
    VisitaPasoObservacionesService
  ],
  exports: [
    TypeOrmModule,
    VisitasCampoService,
    EtapasFenologicasService,
    SubEtapasService,
    VisitaPasoObservacionesService
  ]
})
export class VisitasCampoModule {}
