import { Transform } from "class-transformer";
import { IsDateString, IsOptional, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReporteVisitasQueryDto {
  @ApiProperty({
    name: "fecha_desde",
    example: "2026-09-01",
    description: "Fecha inicial inclusiva del reporte en formato ISO."
  })
  @Transform(({ value }) => trimString(value))
  @IsDateString({}, { message: "fecha_desde must be a valid ISO 8601 date string." })
  fecha_desde!: string;

  @ApiProperty({
    name: "fecha_hasta",
    example: "2026-09-30",
    description: "Fecha final inclusiva del reporte en formato ISO."
  })
  @Transform(({ value }) => trimString(value))
  @IsDateString({}, { message: "fecha_hasta must be a valid ISO 8601 date string." })
  fecha_hasta!: string;

  @ApiPropertyOptional({
    name: "agronomo_usuario_id",
    example: "7",
    description: "Filtra el reporte por un usuario activo con rol agronomo."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "agronomo_usuario_id must be a positive integer."
  })
  agronomo_usuario_id?: string;

  @ApiPropertyOptional({
    name: "productor_id",
    example: "15",
    description: "Filtra el reporte por productor."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "productor_id must be a positive integer."
  })
  productor_id?: string;
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

