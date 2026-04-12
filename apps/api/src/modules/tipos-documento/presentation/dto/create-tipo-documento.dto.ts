import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import {
  trimRequiredString,
  trimOptionalUppercaseString
} from "../../../../common/utils/string-normalizers.util";

export class CreateTipoDocumentoDto {
  @ApiProperty({
    example: "DNI"
  })
  @Transform(({ value }) => trimOptionalUppercaseString(value) ?? "")
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  code!: string;

  @ApiProperty({
    example: "Documento Nacional de Identidad"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;
}
