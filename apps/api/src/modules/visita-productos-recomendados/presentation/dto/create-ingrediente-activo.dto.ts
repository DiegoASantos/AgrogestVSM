import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { trimRequiredString } from "../../../../common/utils/string-normalizers.util";

export class CreateIngredienteActivoDto {
  @ApiProperty({
    example: "Azoxystrobin"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
