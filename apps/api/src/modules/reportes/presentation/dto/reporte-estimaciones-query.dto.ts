import { Transform } from "class-transformer";
import { IsDateString, IsOptional, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReporteEstimacionesQueryDto {
  @ApiProperty({
    name: "fecha_desde",
    example: "2026-01-01",
    description: "Fecha inicial inclusiva; el reporte la normaliza al lunes de su semana."
  })
  @Transform(({ value }) => trimString(value))
  @IsDateString({}, { message: "fecha_desde must be a valid ISO 8601 date string." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "fecha_desde must use YYYY-MM-DD format."
  })
  fecha_desde!: string;

  @ApiProperty({
    name: "fecha_hasta",
    example: "2026-09-13",
    description: "Fecha final inclusiva; el reporte la normaliza al domingo de su semana."
  })
  @Transform(({ value }) => trimString(value))
  @IsDateString({}, { message: "fecha_hasta must be a valid ISO 8601 date string." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "fecha_hasta must use YYYY-MM-DD format."
  })
  fecha_hasta!: string;

  @ApiPropertyOptional({
    name: "agronomo_usuario_id",
    example: "7",
    description: "Filtra ambos agregados por el usuario agrónomo indicado."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "agronomo_usuario_id must be a positive integer."
  })
  agronomo_usuario_id?: string;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim();
}
