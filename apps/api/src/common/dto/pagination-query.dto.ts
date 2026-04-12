import { Transform } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: "Numero de pagina (comienza en 1).",
    default: DEFAULT_PAGE
  })
  @IsOptional()
  @Transform(({ value }) => parsePositiveInt(value, DEFAULT_PAGE))
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    example: 50,
    description: `Cantidad de registros por pagina (max ${MAX_LIMIT}).`,
    default: DEFAULT_LIMIT
  })
  @IsOptional()
  @Transform(({ value }) => parsePositiveInt(value, DEFAULT_LIMIT))
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit: number = DEFAULT_LIMIT;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  get take(): number {
    return this.limit;
  }
}

function parsePositiveInt(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : defaultValue;
}
