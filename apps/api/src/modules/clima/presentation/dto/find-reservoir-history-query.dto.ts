import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsISO8601, IsOptional, Matches } from "class-validator";

import {
  RESERVOIR_VARIABLES,
  type ReservoirVariable
} from "../../application/reservoir-reading.constants";
import { ISO_DATETIME_WITH_TIMEZONE } from "./reservoir-reading-validation";

export class FindReservoirHistoryQueryDto {
  @ApiPropertyOptional({ enum: RESERVOIR_VARIABLES })
  @IsOptional()
  @IsIn(RESERVOIR_VARIABLES)
  variable?: ReservoirVariable;

  @ApiPropertyOptional({ example: "2026-08-01T00:00:00-05:00" })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(ISO_DATETIME_WITH_TIMEZONE, {
    message: "desde debe incluir fecha, hora y zona horaria."
  })
  desde?: string;

  @ApiPropertyOptional({ example: "2026-08-11T23:59:59-05:00" })
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(ISO_DATETIME_WITH_TIMEZONE, {
    message: "hasta debe incluir fecha, hora y zona horaria."
  })
  hasta?: string;
}
