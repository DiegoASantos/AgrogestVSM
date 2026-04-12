import { Transform, Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

import { trimRequiredString } from "../../../../common/utils/string-normalizers.util";

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
}
