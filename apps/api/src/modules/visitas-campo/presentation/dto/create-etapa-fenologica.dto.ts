import { Transform } from "class-transformer";
import {
  IsBoolean,
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
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
