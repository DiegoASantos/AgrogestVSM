import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { CALIFICACION_MODULOS, type CalificacionModulo } from "../../domain/weight-matrix";

export class UpsertVisitaCalificacionDto {
  @ApiProperty({
    enum: CALIFICACION_MODULOS,
    example: "plagas",
    description: "Modulo de cumplimiento tecnico evaluado."
  })
  @IsIn(CALIFICACION_MODULOS)
  modulo!: CalificacionModulo;

  @ApiProperty({
    example: 3,
    minimum: 0,
    maximum: 3,
    description: "Puntaje de cumplimiento tecnico entre 0 y 3."
  })
  @IsInt()
  @Min(0)
  @Max(3)
  puntaje!: number;

  @ApiPropertyOptional({
    example: "Aplicacion realizada dentro del plazo recomendado.",
    description: "Observacion tecnica de soporte para el puntaje."
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  observacion?: string | null;
}
