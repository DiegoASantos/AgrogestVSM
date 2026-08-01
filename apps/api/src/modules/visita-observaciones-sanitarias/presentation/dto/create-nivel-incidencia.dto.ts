import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import {
  trimOptionalLowercaseString,
  trimRequiredString
} from "../../../../common/utils/string-normalizers.util";

export class CreateNivelIncidenciaDto {
  @ApiProperty({
    example: "Moderado"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name!: string;

  @ApiProperty({
    example: 2
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder!: number;

  @ApiProperty({
    example: 2,
    description: "Grado tecnico normalizado entre 0 y 3."
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  grade!: number;

  @ApiProperty({
    example: "incidencia",
    enum: ["incidencia", "severidad"]
  })
  @Transform(({ value }) => trimOptionalLowercaseString(value))
  @IsString()
  @IsIn(["incidencia", "severidad"])
  type!: string;
}
