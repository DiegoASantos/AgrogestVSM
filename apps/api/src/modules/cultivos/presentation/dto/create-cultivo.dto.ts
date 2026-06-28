import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { trimRequiredString } from "../../../../common/utils/string-normalizers.util";

export class CreateCultivoDto {
  @ApiProperty({
    example: "ARROZ",
    description: "Codigo corto del cultivo."
  })
  @Transform(({ value }) => trimRequiredString(value).toUpperCase())
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @ApiProperty({
    example: "Arroz",
    description: "Nombre visible del cultivo."
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
