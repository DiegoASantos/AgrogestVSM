import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from "class-validator";

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

  @ApiPropertyOptional({
    example: true,
    nullable: true,
    description:
      "Indica si un puntaje menor a 3 esta justificado por una causa externa."
  })
  @IsOptional()
  @IsBoolean()
  justificado?: boolean | null;

  @ApiPropertyOptional({
    example: "recursos",
    nullable: true,
    description: "Categoria de justificacion para incumplimientos justificados."
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  categoriaJustificacion?: string | null;

  @ApiPropertyOptional({
    example: "problemas_agua",
    nullable: true,
    description: "Motivo especifico de justificacion para el incumplimiento."
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  motivoJustificacion?: string | null;
}
