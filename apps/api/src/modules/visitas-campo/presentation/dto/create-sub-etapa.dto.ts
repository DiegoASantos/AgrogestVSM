import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  trimOptionalString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreateSubEtapaDto {
  @ApiProperty({
    example: "1",
    description: "Id de una etapa fenologica con tipo Etapa."
  })
  @Matches(/^[1-9]\d*$/, {
    message: "etapaFenologicaId must be a positive integer."
  })
  etapaFenologicaId!: string;

  @ApiProperty({
    example: "Boton floral"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder!: number;

  @ApiPropertyOptional({
    example: "Descripcion breve de la sub etapa."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: 25,
    description: "Porcentaje de avance asociado a la sub etapa."
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number | null;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
