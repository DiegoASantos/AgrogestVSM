import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  trimOptionalString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreatePlagaEnfermedadEtapaNivelDto {
  @ApiProperty({
    example: "1"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: "plagaEnfermedadId must be a positive integer."
  })
  plagaEnfermedadId!: string;

  @ApiProperty({
    example: "1"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: "etapaFenologicaId must be a positive integer."
  })
  etapaFenologicaId!: string;

  @ApiProperty({
    example: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nivelIncidenciaSeveridadId!: number;

  @ApiPropertyOptional({
    example: "Sintomas visibles durante esta etapa."
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
