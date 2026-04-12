import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import {
  trimOptionalString,
  trimOptionalUppercaseString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreateRoleDto {
  @ApiProperty({
    example: "SUPERVISOR"
  })
  @Transform(({ value }) => trimOptionalUppercaseString(value) ?? "")
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code!: string;

  @ApiProperty({
    example: "Supervisor"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({
    example: "Rol supervisor administrativo."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}
