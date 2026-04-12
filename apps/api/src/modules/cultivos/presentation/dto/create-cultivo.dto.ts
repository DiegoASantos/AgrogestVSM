import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  trimOptionalUppercaseString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreateCultivoDto {
  @ApiPropertyOptional({
    example: "ARROZ",
    description: "Codigo corto del cultivo."
  })
  @Transform(({ value }) => trimOptionalUppercaseString(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string | null;

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
