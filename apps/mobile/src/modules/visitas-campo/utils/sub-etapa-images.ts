/* eslint-disable @typescript-eslint/no-require-imports */
import type { ImageSourcePropType } from "react-native";

const FALLBACK_SUB_ETAPA_IMAGE = require("../../../../assets/images/icon_vsm.png");

const SUB_ETAPA_IMAGES: Record<string, ImageSourcePropType> = {
  "yema hinchada": require("../../../../assets/images/yema_hinchada.webp"),
  "emergencia foliar": require("../../../../assets/images/emergencia_foliar.webp"),
  "desarrollo foliar": require("../../../../assets/images/desarrollo_foliar.webp"),
  "transicion de color": require("../../../../assets/images/transicion_color.webp"),
  "transicion color": require("../../../../assets/images/transicion_color.webp"),
  "hoja verde claro": require("../../../../assets/images/hoja_verde_claro.webp"),
  "maduracion completa": require("../../../../assets/images/maduracion_completa.webp"),
  "ruptura de yema": require("../../../../assets/images/ruptura_yema.webp"),
  "ruptura yema": require("../../../../assets/images/ruptura_yema.webp"),
  "enlogacion vela o espiga": require("../../../../assets/images/enlogacion_vela_espiga.webp"),
  "enlogacion vela o espigas": require("../../../../assets/images/enlogacion_vela_espiga.webp"),
  "elongacion vela o espiga": require("../../../../assets/images/enlogacion_vela_espiga.webp"),
  "elongacion vela o espigas": require("../../../../assets/images/enlogacion_vela_espiga.webp"),
  "apertura floral": require("../../../../assets/images/apertura_floral.webp"),
  "floracion plena": require("../../../../assets/images/plena_floracion.webp"),
  "plena floracion": require("../../../../assets/images/plena_floracion.webp"),
  "cuajado inicial": require("../../../../assets/images/cuajado_inicial.webp"),
  "definicion amarre de frutos": require("../../../../assets/images/amarre_frutos.webp"),
  "amarre de frutos": require("../../../../assets/images/amarre_frutos.webp"),
  "consolidacion amarre total": require("../../../../assets/images/amarre_total.webp"),
  "amarre total": require("../../../../assets/images/amarre_total.webp"),
  "inicio llenado": require("../../../../assets/images/inicio_llenado.webp"),
  "inicio de llenado": require("../../../../assets/images/inicio_llenado.webp"),
  "madurez fisiologica": require("../../../../assets/images/madurez_fisiologica.webp"),
  "cambio de color interno": require("../../../../assets/images/cambio_color_interno.webp"),
  "cambio color interno": require("../../../../assets/images/cambio_color_interno.webp"),
  "madurez de cosecha": require("../../../../assets/images/madurez_cosecha.webp")
};

export function getSubEtapaImageSource(
  subEtapaName?: string | null
): ImageSourcePropType {
  if (!subEtapaName) {
    return FALLBACK_SUB_ETAPA_IMAGE;
  }

  return SUB_ETAPA_IMAGES[normalizeSubEtapaName(subEtapaName)] ?? FALLBACK_SUB_ETAPA_IMAGE;
}

function normalizeSubEtapaName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}
