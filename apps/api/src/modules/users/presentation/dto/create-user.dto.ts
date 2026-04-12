import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

import {
  trimOptionalLowercaseString,
  trimOptionalString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreateUserDto {
  @ApiProperty({
    example: "Juan"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({
    example: "Perez"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({
    example: "juan.perez@agrogest.local"
  })
  @Transform(({ value }) => trimOptionalLowercaseString(value) ?? "")
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @ApiPropertyOptional({
    example: "999888777"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiProperty({
    example: "ClaveSegura123*"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
