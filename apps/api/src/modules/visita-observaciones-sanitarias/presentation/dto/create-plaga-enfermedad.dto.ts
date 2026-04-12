import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
  trimOptionalLowercaseString,
  trimOptionalUppercaseString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreatePlagaEnfermedadDto {
  @ApiPropertyOptional({
    example: "PYR-001"
  })
  @Transform(({ value }) => trimOptionalUppercaseString(value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string | null;

  @ApiProperty({
    example: "Pyricularia"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example: "enfermedad",
    enum: ["plaga", "enfermedad"]
  })
  @Transform(({ value }) => trimOptionalLowercaseString(value))
  @IsString()
  @IsIn(["plaga", "enfermedad"])
  type!: string;

  @ApiPropertyOptional({
    example: true,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
