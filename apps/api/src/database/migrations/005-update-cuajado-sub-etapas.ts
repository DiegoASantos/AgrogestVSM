import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const UPDATE_CUAJADO_SUB_ETAPAS_MIGRATION: DatabaseMigration = {
  id: "005-update-cuajado-sub-etapas",
  description: "Updates fruit set sub stages after removing petal fall.",
  sql: `
    UPDATE sub_etapas
    SET estado = false,
        orden = 1000
    WHERE lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) =
      lower(translate('Caida de Petalos', 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'));

    UPDATE sub_etapas
    SET porcentaje = 0,
        orden = 1
    WHERE lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) =
      lower(translate('Cuajado Inicial', 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'));

    UPDATE sub_etapas
    SET porcentaje = 50,
        orden = 2
    WHERE lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) IN (
      lower(translate('Definicion - Amarre de frutos', 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')),
      lower(translate('Definicion - Amarre de Frutos', 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
    );

    UPDATE sub_etapas
    SET porcentaje = 100,
        orden = 3
    WHERE lower(translate(nombre, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) IN (
      lower(translate('Consolidacion - Amarre total', 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')),
      lower(translate('Consolidacion - Amarre Total', 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
    );
  `
};
