import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { CampaniasController } from "../../../campanias/presentation/campanias.controller";
import { CultivosController } from "../../../cultivos/presentation/cultivos.controller";
import { DetalleNutrientesController } from "../../../nutricion/presentation/detalle-nutrientes.controller";
import { NutrientesController } from "../../../nutricion/presentation/nutrientes.controller";
import { LaboresCulturalesController } from "../../../operaciones-campo/presentation/labores-culturales.controller";
import { TiposRiegoController } from "../../../operaciones-campo/presentation/tipos-riego.controller";
import { ParcelasController } from "../../../parcelas/presentation/parcelas.controller";
import { ProductoresController } from "../../../productores/presentation/productores.controller";
import { SectoresController } from "../../../sectores/presentation/sectores.controller";
import { SubsectoresController } from "../../../subsectores/presentation/subsectores.controller";
import { TiposDocumentoController } from "../../../tipos-documento/presentation/tipos-documento.controller";
import { EtapasFenologicasController } from "../../../visitas-campo/presentation/etapas-fenologicas.controller";
import { SubEtapasController } from "../../../visitas-campo/presentation/sub-etapas.controller";
import { NivelesIncidenciaController } from "../../../visita-observaciones-sanitarias/presentation/niveles-incidencia.controller";
import { PlagasEnfermedadesController } from "../../../visita-observaciones-sanitarias/presentation/plagas-enfermedades.controller";
import { PlagasEnfermedadesEtapasNivelesController } from "../../../visita-observaciones-sanitarias/presentation/plagas-enfermedades-etapas-niveles.controller";
import { ALLOW_ANALYST_MUTATION_KEY } from "../decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../decorators/roles.decorator";

const adminAnalystHandlers = [
  ["cultivos.create", CultivosController.prototype.createCultivo],
  ["cultivos.update", CultivosController.prototype.updateCultivo],
  ["cultivos.delete", CultivosController.prototype.deleteCultivo],
  ["campanias.create", CampaniasController.prototype.createCampania],
  ["campanias.update", CampaniasController.prototype.updateCampania],
  ["campanias.delete", CampaniasController.prototype.deleteCampania],
  ["etapas.create", EtapasFenologicasController.prototype.createEtapaFenologica],
  ["etapas.update", EtapasFenologicasController.prototype.updateEtapaFenologica],
  ["etapas.delete", EtapasFenologicasController.prototype.deleteEtapaFenologica],
  ["sub-etapas.create", SubEtapasController.prototype.createSubEtapa],
  ["sub-etapas.update", SubEtapasController.prototype.updateSubEtapa],
  ["sub-etapas.delete", SubEtapasController.prototype.deleteSubEtapa],
  ["sectores.update", SectoresController.prototype.updateSector],
  ["sectores.delete", SectoresController.prototype.deleteSector],
  ["subsectores.update", SubsectoresController.prototype.updateSubsector],
  ["subsectores.delete", SubsectoresController.prototype.deleteSubsector],
  ["parcelas.assign", ParcelasController.prototype.updateParcelaAgronomo],
  ["niveles.create", NivelesIncidenciaController.prototype.createIncidenceLevel],
  ["niveles.update", NivelesIncidenciaController.prototype.updateIncidenceLevel],
  ["niveles.delete", NivelesIncidenciaController.prototype.deleteIncidenceLevel],
  ["plagas.create", PlagasEnfermedadesController.prototype.createPestDisease],
  ["plagas.update", PlagasEnfermedadesController.prototype.updatePestDisease],
  ["plagas.delete", PlagasEnfermedadesController.prototype.deletePestDisease],
  [
    "plagas-etapas.create",
    PlagasEnfermedadesEtapasNivelesController.prototype.createPestDiseaseStageLevel
  ],
  [
    "plagas-etapas.update",
    PlagasEnfermedadesEtapasNivelesController.prototype.updatePestDiseaseStageLevel
  ],
  [
    "plagas-etapas.delete",
    PlagasEnfermedadesEtapasNivelesController.prototype.deletePestDiseaseStageLevel
  ],
  ["nutrientes.create", NutrientesController.prototype.createNutrient],
  ["nutrientes.update", NutrientesController.prototype.updateNutrient],
  ["nutrientes.delete", NutrientesController.prototype.deleteNutrient],
  ["detalle-nutrientes.create", DetalleNutrientesController.prototype.createDetail],
  ["detalle-nutrientes.update", DetalleNutrientesController.prototype.updateDetail],
  ["detalle-nutrientes.delete", DetalleNutrientesController.prototype.deleteDetail],
  ["tipos-riego.create", TiposRiegoController.prototype.create],
  ["tipos-riego.update", TiposRiegoController.prototype.update],
  ["tipos-riego.delete", TiposRiegoController.prototype.remove],
  ["labores.create", LaboresCulturalesController.prototype.create],
  ["labores.update", LaboresCulturalesController.prototype.update],
  ["labores.delete", LaboresCulturalesController.prototype.remove],
  ["tipos-documento.create", TiposDocumentoController.prototype.createTipoDocumento],
  ["tipos-documento.update", TiposDocumentoController.prototype.updateTipoDocumento],
  ["tipos-documento.delete", TiposDocumentoController.prototype.deleteTipoDocumento]
] as const;

const agronomistCompatibleHandlers = [
  ["productores.create", ProductoresController.prototype.createProductor],
  ["productores.update", ProductoresController.prototype.updateProductor],
  ["productores.delete", ProductoresController.prototype.deleteProductor],
  ["parcelas.create", ParcelasController.prototype.createParcela],
  ["parcelas.update", ParcelasController.prototype.updateParcela],
  ["parcelas.delete", ParcelasController.prototype.deleteParcela],
  ["sectores.create", SectoresController.prototype.createSector],
  ["subsectores.create", SubsectoresController.prototype.createSubsector]
] as const;

describe("maintenance analyst mutation authorization", () => {
  it.each(adminAnalystHandlers)("allows ADMIN and ANALISTA on %s", (_name, handler) => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual([
      "ADMIN",
      "ANALISTA"
    ]);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, handler)).toBe(true);
  });

  it.each(agronomistCompatibleHandlers)(
    "adds ANALISTA without removing AGRONOMO from %s",
    (_name, handler) => {
      expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, handler)).toEqual([
        "ADMIN",
        "ANALISTA",
        "AGRONOMO"
      ]);
      expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, handler)).toBe(true);
    }
  );
});
