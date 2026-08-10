import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf
} from "class-validator";

import {
  trimOptionalLowercaseString,
  trimOptionalString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class UpdateProfileDto {
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
  phone?: string;

  @ApiPropertyOptional({
    description: "Required when newPassword is provided",
    example: "ClaveActual123"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @ValidateIf((dto) => dto.newPassword !== undefined && dto.newPassword !== null)
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;

  @ApiPropertyOptional({
    description: "New password (min 6 characters). Requires currentPassword.",
    example: "NuevaClave456"
  })
  @Transform(({ value }) => trimOptionalString(value))
  @ValidateIf((dto) => dto.currentPassword !== undefined && dto.currentPassword !== null)
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword?: string;
}
