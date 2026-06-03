import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindSubEtapasQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    name: "etapa_fenologica_id",
    example: "1",
    description: "Filtra las sub etapas por id de etapa fenologica."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "etapa_fenologica_id must be a positive integer."
  })
  etapa_fenologica_id?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Filtra sub etapas activas o inactivas."
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({
    message: "estado must be a boolean."
  })
  estado?: boolean;
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
