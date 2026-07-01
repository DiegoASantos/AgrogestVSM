import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";

import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";

export class FindSubsectoresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    name: "sector_id",
    example: "1",
    description: "Filtra subsectores por sector."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "sector_id must be a positive integer."
  })
  sector_id?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Filtra subsectores activos o inactivos."
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
