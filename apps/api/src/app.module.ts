import { Module } from "@nestjs/common";

import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CampaniasModule } from "./modules/campanias/campanias.module";
import { CultivosModule } from "./modules/cultivos/cultivos.module";
import { HealthModule } from "./modules/health/health.module";
import { GeografiasModule } from "./modules/geografias/geografias.module";
import { NutricionModule } from "./modules/nutricion/nutricion.module";
import { OperacionesCampoModule } from "./modules/operaciones-campo/operaciones-campo.module";
import { ParcelasModule } from "./modules/parcelas/parcelas.module";
import { ProductoresModule } from "./modules/productores/productores.module";
import { RolesModule } from "./modules/roles/roles.module";
import { SectoresModule } from "./modules/sectores/sectores.module";
import { TiposDocumentoModule } from "./modules/tipos-documento/tipos-documento.module";
import { UsersModule } from "./modules/users/users.module";
import { VariedadesModule } from "./modules/variedades/variedades.module";
import { VisitaEvaluacionesModule } from "./modules/visita-evaluaciones/visita-evaluaciones.module";
import { VisitaLaboresCulturalesModule } from "./modules/visita-labores-culturales/visita-labores-culturales.module";
import { VisitaObservacionesSanitariasModule } from "./modules/visita-observaciones-sanitarias/visita-observaciones-sanitarias.module";
import { VisitaRiegosModule } from "./modules/visita-riegos/visita-riegos.module";
import { VisitasCampoModule } from "./modules/visitas-campo/visitas-campo.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    GeografiasModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CultivosModule,
    VariedadesModule,
    CampaniasModule,
    TiposDocumentoModule,
    ProductoresModule,
    SectoresModule,
    ParcelasModule,
    VisitasCampoModule,
    NutricionModule,
    OperacionesCampoModule,
    VisitaEvaluacionesModule,
    VisitaObservacionesSanitariasModule,
    VisitaRiegosModule,
    VisitaLaboresCulturalesModule
  ]
})
export class AppModule {}
