import { Transform, Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, Max, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DashboardResumenQueryDto {
  @ApiPropertyOptional({ name: "year", example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "year must be an integer." })
  @Min(2000, { message: "year must be greater than or equal to 2000." })
  @Max(2100, { message: "year must be less than or equal to 2100." })
  year?: number;

  @ApiPropertyOptional({ name: "month", example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "month must be an integer." })
  @Min(1, { message: "month must be between 1 and 12." })
  @Max(12, { message: "month must be between 1 and 12." })
  month?: number;

  @ApiPropertyOptional({ name: "day", example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "day must be an integer." })
  @Min(1, { message: "day must be between 1 and 31." })
  @Max(31, { message: "day must be between 1 and 31." })
  day?: number;
}

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

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim();
}
