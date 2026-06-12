import { PartialType } from "@nestjs/swagger";

import { CreateDetalleNutrienteDto } from "./create-detalle-nutriente.dto";

export class UpdateDetalleNutrienteDto extends PartialType(CreateDetalleNutrienteDto) {}
