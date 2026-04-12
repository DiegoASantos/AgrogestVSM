import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FindCampaniasQueryDto {
  @ApiPropertyOptional({
    name: "cultivo_id",
    example: "1",
    description: "Filtra las campanias por id del cultivo."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "cultivo_id must be a positive integer."
  })
  cultivo_id?: string;

  @ApiPropertyOptional({
    example: true,
    description: "Filtra campanias activas o inactivas."
  })
  @IsOptional()
  @Transform(({ value }) => parseOptionalBoolean(value))
  @IsBoolean({
    message: "activa must be a boolean."
  })
  activa?: boolean;
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
