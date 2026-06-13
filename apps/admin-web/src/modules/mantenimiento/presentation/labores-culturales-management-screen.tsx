"use client";

import { agriculturalCatalogsService } from "../services/agricultural-catalogs.service";
import { OperationalCatalogManagementScreen } from "./operational-catalog-management-screen";

export function LaboresCulturalesManagementScreen() {
  return (
    <OperationalCatalogManagementScreen
      createItem={agriculturalCatalogsService.createLaborCultural}
      deleteItem={agriculturalCatalogsService.deleteLaborCultural}
      description="Catalogo de labores culturales disponibles para visitas de campo."
      emptyDescription="No hay labores culturales registradas o la busqueda no devolvio coincidencias."
      emptyTitle="No hay labores culturales para mostrar"
      formId="labores-culturales-form"
      listCaption="Catalogo administrativo de labores culturales."
      loadItems={agriculturalCatalogsService.getLaboresCulturales}
      modalTitleEdit="Editar labor cultural"
      modalTitleNew="Nueva labor cultural"
      title="Labores culturales"
      updateItem={agriculturalCatalogsService.updateLaborCultural}
    />
  );
}
