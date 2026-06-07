import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SanitaryCatalogsService } from "./application/sanitary-catalogs.service";
import { EtapaFenologicaEntity } from "../visitas-campo/infrastructure/persistence/entities/etapa-fenologica.entity";
import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaObservacionesSanitariasService } from "./application/visita-observaciones-sanitarias.service";
import { NivelIncidenciaEntity } from "./infrastructure/persistence/entities/nivel-incidencia.entity";
import { PlagaEnfermedadEtapaNivelEntity } from "./infrastructure/persistence/entities/plaga-enfermedad-etapa-nivel.entity";
import { PlagaEnfermedadEntity } from "./infrastructure/persistence/entities/plaga-enfermedad.entity";
import { VisitaObservacionSanitariaEntity } from "./infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { NivelesIncidenciaController } from "./presentation/niveles-incidencia.controller";
import { PlagasEnfermedadesEtapasNivelesController } from "./presentation/plagas-enfermedades-etapas-niveles.controller";
import { PlagasEnfermedadesController } from "./presentation/plagas-enfermedades.controller";
import { VisitaCampoObservacionesSanitariasController } from "./presentation/visita-campo-observaciones-sanitarias.controller";
import { VisitaObservacionesSanitariasController } from "./presentation/visita-observaciones-sanitarias.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaCampoEntity,
      VisitaObservacionSanitariaEntity,
      PlagaEnfermedadEntity,
      PlagaEnfermedadEtapaNivelEntity,
      NivelIncidenciaEntity,
      EtapaFenologicaEntity
    ])
  ],
  controllers: [
    PlagasEnfermedadesController,
    PlagasEnfermedadesEtapasNivelesController,
    NivelesIncidenciaController,
    VisitaCampoObservacionesSanitariasController,
    VisitaObservacionesSanitariasController
  ],
  providers: [SanitaryCatalogsService, VisitaObservacionesSanitariasService],
  exports: [
    TypeOrmModule,
    SanitaryCatalogsService,
    VisitaObservacionesSanitariasService
  ]
})
export class VisitaObservacionesSanitariasModule {}
