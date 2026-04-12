import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  trimOptionalString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreateCampaniaDto {
  @ApiProperty({
    example: "Campania 2026"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: "1",
    description: "Id del cultivo existente."
  })
  @Matches(/^[1-9]\d*$/, {
    message: "cultivoId must be a positive integer."
  })
  cultivoId!: string;

  @ApiProperty({
    example: "2026-01-15"
  })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({
    example: "2026-05-30"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({
    example: "Campania principal del periodo."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
