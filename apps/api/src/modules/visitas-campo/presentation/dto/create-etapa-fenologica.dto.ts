import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  trimOptionalString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";
import type { EtapaFenologicaType } from "../../infrastructure/persistence/entities/etapa-fenologica.entity";

export class CreateEtapaFenologicaDto {
  @ApiProperty({
    example: "1",
    description: "Id del cultivo existente."
  })
  @Matches(/^[1-9]\d*$/, {
    message: "cultivoId must be a positive integer."
  })
  cultivoId!: string;

  @ApiProperty({
    example: "Floracion"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: "Etapa de floracion del cultivo."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: "Orden usado para listar etapas y labores."
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number | null;

  @ApiPropertyOptional({
    example: "Etapa",
    default: "Etapa",
    enum: ["Etapa", "Labor"]
  })
  @IsOptional()
  @IsIn(["Etapa", "Labor"])
  type?: EtapaFenologicaType;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
