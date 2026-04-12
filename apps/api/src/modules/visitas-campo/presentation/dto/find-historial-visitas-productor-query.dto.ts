import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, Matches } from "class-validator";

import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindHistorialVisitasProductorQueryDto extends PaginationQueryDto {
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
}

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim();
}
