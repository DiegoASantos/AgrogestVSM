"use client";

import { agriculturalCatalogsService } from "../services/agricultural-catalogs.service";
import { OperationalCatalogManagementScreen } from "./operational-catalog-management-screen";

export function TiposRiegoManagementScreen() {
  return (
    <OperationalCatalogManagementScreen
      createItem={agriculturalCatalogsService.createTipoRiego}
      deleteItem={agriculturalCatalogsService.deleteTipoRiego}
      description="Catalogo de tipos de riego disponibles para visitas de campo."
      emptyDescription="No hay tipos de riego registrados o la busqueda no devolvio coincidencias."
      emptyTitle="No hay tipos de riego para mostrar"
      formId="tipos-riego-form"
      listCaption="Catalogo administrativo de tipos de riego."
      loadItems={agriculturalCatalogsService.getTiposRiego}
      modalTitleEdit="Editar tipo de riego"
      modalTitleNew="Nuevo tipo de riego"
      title="Tipos de riego"
      updateItem={agriculturalCatalogsService.updateTipoRiego}
    />
  );
}
