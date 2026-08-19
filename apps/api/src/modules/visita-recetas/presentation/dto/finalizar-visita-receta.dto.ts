import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";

import { CreateVisitaRecetaDto } from "./create-visita-receta.dto";

export class FinalizarVisitaRecetaDto extends CreateVisitaRecetaDto {
  @ApiProperty({
    example: "17:30",
    description: "Hora obligatoria de cierre de la visita en formato HH:mm."
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, {
    message: "endVisitTime must be a valid time in HH:mm or HH:mm:ss format."
  })
  endVisitTime!: string;
}
