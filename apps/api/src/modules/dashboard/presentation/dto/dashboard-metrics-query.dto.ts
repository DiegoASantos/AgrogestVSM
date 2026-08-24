import { Transform } from "class-transformer";
import { IsDateString, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DashboardDateRangeQueryDto {
  @ApiPropertyOptional({ name: "fecha_desde", example: "2026-08-01" })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString({}, { message: "fecha_desde must be a valid ISO 8601 date string." })
  fecha_desde?: string;

  @ApiPropertyOptional({ name: "fecha_hasta", example: "2026-08-31" })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString({}, { message: "fecha_hasta must be a valid ISO 8601 date string." })
  fecha_hasta?: string;
}

export class DashboardParcelasPorEtapaQueryDto extends DashboardDateRangeQueryDto {
  @ApiPropertyOptional({ name: "etapa_fenologica_id", example: "1" })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "etapa_fenologica_id must be a positive integer."
  })
  etapa_fenologica_id?: string;
}

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim();
}
