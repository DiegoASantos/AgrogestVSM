import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindVisitasCampoQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    name: "productor_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "productor_id must be a positive integer."
  })
  productor_id?: string;

  @ApiPropertyOptional({
    name: "parcela_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "parcela_id must be a positive integer."
  })
  parcela_id?: string;

  @ApiPropertyOptional({
    name: "campania_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "campania_id must be a positive integer."
  })
  campania_id?: string;

  @ApiPropertyOptional({
    name: "agronomo_usuario_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "agronomo_usuario_id must be a positive integer."
  })
  agronomo_usuario_id?: string;

  @ApiPropertyOptional({
    name: "fecha_desde",
    example: "2026-04-01"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString(
    {},
    {
      message: "fecha_desde must be a valid ISO 8601 date string."
    }
  )
  fecha_desde?: string;

  @ApiPropertyOptional({
    name: "fecha_hasta",
    example: "2026-04-30"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString(
    {},
    {
      message: "fecha_hasta must be a valid ISO 8601 date string."
    }
  )
  fecha_hasta?: string;

  @ApiPropertyOptional({
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({
    message: "activo must be a boolean."
  })
  activo?: boolean;
}

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim();
}

function parseOptionalBoolean(value: unknown): boolean | undefined | unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return value;
}
