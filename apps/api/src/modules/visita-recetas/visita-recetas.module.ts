import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaObservacionSanitariaEntity } from "../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaEvaluacionEntity } from "../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaRiegoEntity } from "../visita-riegos/infrastructure/persistence/entities/visita-riego.entity";
import { VisitaLaborCulturalEntity } from "../visita-labores-culturales/infrastructure/persistence/entities/visita-labor-cultural.entity";

import { VisitaRecetasService } from "./application/visita-recetas.service";
import { VisitaRecetasConsolidacionService } from "./application/visita-recetas-consolidacion.service";
import { CoadyuvanteEntity } from "./infrastructure/persistence/entities/coadyuvante.entity";
import { IngredienteActivoEntity } from "./infrastructure/persistence/entities/ingrediente-activo.entity";
import { MarcaProductoEntity } from "./infrastructure/persistence/entities/marca-producto.entity";
import { ModoAccionEntity } from "./infrastructure/persistence/entities/modo-accion.entity";
import { TipoControlEntity } from "./infrastructure/persistence/entities/tipo-control.entity";
import { TipoProductoFitosanitarioEntity } from "./infrastructure/persistence/entities/tipo-producto-fitosanitario.entity";
import { FertilizanteEntity } from "./infrastructure/persistence/entities/fertilizante.entity";
import { VisitaRecetaEntity } from "./infrastructure/persistence/entities/visita-receta.entity";
import { VisitaRecetaFitosanidadEntity } from "./infrastructure/persistence/entities/visita-receta-fitosanidad.entity";
import { VisitaRecetaFertilizacionEntity } from "./infrastructure/persistence/entities/visita-receta-fertilizacion.entity";
import { VisitaRecetaRiegoEntity } from "./infrastructure/persistence/entities/visita-receta-riego.entity";
import { VisitaRecetaLaborEntity } from "./infrastructure/persistence/entities/visita-receta-labor.entity";
import { VisitaRecetaHistorialEntity } from "./infrastructure/persistence/entities/visita-receta-historial.entity";
import { VisitaCampoRecetasController } from "./presentation/visita-campo-recetas.controller";
import { RecetasCatalogosController } from "./presentation/recetas-catalogos.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaCampoEntity,
      VisitaObservacionSanitariaEntity,
      VisitaEvaluacionEntity,
      VisitaRiegoEntity,
      VisitaLaborCulturalEntity,
      CoadyuvanteEntity,
      IngredienteActivoEntity,
      MarcaProductoEntity,
      ModoAccionEntity,
      TipoControlEntity,
      TipoProductoFitosanitarioEntity,
      FertilizanteEntity,
      VisitaRecetaEntity,
      VisitaRecetaFitosanidadEntity,
      VisitaRecetaFertilizacionEntity,
      VisitaRecetaRiegoEntity,
      VisitaRecetaLaborEntity,
      VisitaRecetaHistorialEntity
    ])
  ],
  controllers: [VisitaCampoRecetasController, RecetasCatalogosController],
  providers: [VisitaRecetasService, VisitaRecetasConsolidacionService],
  exports: [VisitaRecetasService]
})
export class VisitaRecetasModule {}
