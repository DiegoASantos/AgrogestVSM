import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  Min
} from "class-validator";

const FUENTES_AGUA = ["subterranea", "superficial", "pluvial"] as const;
const TIPOS_SUELO = ["arenoso", "arcilloso", "limoso", "franco"] as const;
const HUMEDADES_SUELO = [
  "saturado",
  "optimo",
  "moderadamente_seco",
  "seco"
] as const;

export class CreateVisitaRiegoDto {
  @ApiProperty({
    example: 1,
    description: "Identificador del tipo de riego aplicado."
  })
  @IsInt()
  @Min(1)
  tipoRiegoId!: number;

  @ApiPropertyOptional({
    example: "subterranea",
    description: "Fuente de agua: subterranea, superficial o pluvial."
  })
  @IsOptional()
  @IsIn(FUENTES_AGUA)
  fuenteAgua?: (typeof FUENTES_AGUA)[number];

  @ApiPropertyOptional({
    example: "franco",
    description: "Tipo de suelo: arenoso, arcilloso, limoso o franco."
  })
  @IsOptional()
  @IsIn(TIPOS_SUELO)
  tipoSuelo?: (typeof TIPOS_SUELO)[number];

  @ApiPropertyOptional({
    example: "optimo",
    description:
      "Humedad del suelo: saturado, optimo, moderadamente_seco o seco."
  })
  @IsOptional()
  @IsIn(HUMEDADES_SUELO)
  humedadSuelo?: (typeof HUMEDADES_SUELO)[number];

  @ApiPropertyOptional({
    example: false,
    description: "Indica si la planta presenta estres hidrico."
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return value;
  })
  estresHidrico?: boolean;
}
