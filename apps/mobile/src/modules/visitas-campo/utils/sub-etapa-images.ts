import type { ImageSourcePropType } from "react-native";

// Por el momento, hasta que entreguen las imagenes correctas, se estara usando esta imagen del logo para probar.
const TEMPORARY_SUB_ETAPA_IMAGE = require("../../../../assets/images/icon_vsm.png");

export function getSubEtapaImageSource(): ImageSourcePropType {
  return TEMPORARY_SUB_ETAPA_IMAGE;
}
