import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindSectoresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    name: "distrito_id",
    example: "1",
    description: "Filtra sectores por distrito."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "distrito_id must be a positive integer."
  })
  distrito_id?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Filtra sectores activos o inactivos."
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({
    message: "activo must be a boolean."
  })
  activo?: boolean;
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
