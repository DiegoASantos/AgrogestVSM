import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength
} from "class-validator";
import type { TipoSujetoComercial } from "../../infrastructure/persistence/entities/visita-comercial.entity";

const clean = ({ value }: { value: unknown }) =>
  value == null ? value : String(value).trim();
export const TIPOS_SUJETO_COMERCIAL = [
  "PERSONA",
  "FUNDO",
  "ASOCIATIVA",
  "RECORREDOR"
] as const;

export class CreateVisitaComercialDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  publicId!: string;

  @ApiProperty({ enum: TIPOS_SUJETO_COMERCIAL })
  @IsIn(TIPOS_SUJETO_COMERCIAL)
  tipoSujeto!: TipoSujetoComercial;

  @ApiProperty({ maxLength: 150 })
  @Transform(clean)
  @IsString()
  @MaxLength(150)
  nombres!: string;

  @ApiPropertyOptional({ maxLength: 150 })
  @Transform(clean)
  @IsOptional()
  @IsString()
  @MaxLength(150)
  apellidos?: string | null;

  @ApiProperty({ maxLength: 2000 })
  @Transform(clean)
  @IsString()
  @MaxLength(2000)
  descripcion!: string;

  @ApiProperty({ example: "2026-10-16" })
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaVisita!: string;

  @ApiPropertyOptional({ description: "GeoJSON Point [longitud, latitud]." })
  @IsOptional()
  @IsObject()
  ubicacionVisita?: { type: "Point"; coordinates: [number, number] } | null;
}
