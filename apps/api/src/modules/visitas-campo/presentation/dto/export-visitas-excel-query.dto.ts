import { Transform } from "class-transformer";
import { IsDateString, IsOptional, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ExportVisitasExcelQueryDto {
  @ApiProperty({
    name: "fecha_desde",
    example: "2026-08-01",
    description: "Fecha inicial inclusiva del reporte."
  })
  @Transform(({ value }) => String(value ?? "").trim())
  @IsDateString({}, { message: "fecha_desde must be a valid ISO 8601 date string." })
  fecha_desde!: string;

  @ApiProperty({
    name: "fecha_hasta",
    example: "2026-08-31",
    description: "Fecha final inclusiva del reporte."
  })
  @Transform(({ value }) => String(value ?? "").trim())
  @IsDateString({}, { message: "fecha_hasta must be a valid ISO 8601 date string." })
  fecha_hasta!: string;

  @ApiPropertyOptional({
    name: "agronomo_usuario_id",
    example: "1",
    description: "Agrónomo a incluir; se omite para todos los agrónomos."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "agronomo_usuario_id must be a positive integer."
  })
  agronomo_usuario_id?: string;
}
