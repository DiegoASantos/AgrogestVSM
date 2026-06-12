import { Module } from "@nestjs/common";

import { AppConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CampaniasModule } from "./modules/campanias/campanias.module";
import { CultivosModule } from "./modules/cultivos/cultivos.module";
import { HealthModule } from "./modules/health/health.module";
import { GeografiasModule } from "./modules/geografias/geografias.module";
import { NutricionModule } from "./modules/nutricion/nutricion.module";
import { ParcelasModule } from "./modules/parcelas/parcelas.module";
import { ProductoresModule } from "./modules/productores/productores.module";
import { RolesModule } from "./modules/roles/roles.module";
import { SectoresModule } from "./modules/sectores/sectores.module";
import { TiposDocumentoModule } from "./modules/tipos-documento/tipos-documento.module";
import { UsersModule } from "./modules/users/users.module";
import { VariedadesModule } from "./modules/variedades/variedades.module";
import { VisitaEvaluacionesModule } from "./modules/visita-evaluaciones/visita-evaluaciones.module";
import { VisitaObservacionesSanitariasModule } from "./modules/visita-observaciones-sanitarias/visita-observaciones-sanitarias.module";
import { VisitaProductosRecomendadosModule } from "./modules/visita-productos-recomendados/visita-productos-recomendados.module";
import { VisitaRecomendacionesModule } from "./modules/visita-recomendaciones/visita-recomendaciones.module";
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
    VisitaEvaluacionesModule,
    VisitaObservacionesSanitariasModule,
    VisitaRecomendacionesModule,
    VisitaProductosRecomendadosModule
  ]
})
export class AppModule {}
