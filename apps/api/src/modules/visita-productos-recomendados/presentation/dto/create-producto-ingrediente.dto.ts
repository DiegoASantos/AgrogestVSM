import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

import { trimRequiredString } from "../../../../common/utils/string-normalizers.util";

export class CreateProductoIngredienteDto {
  @ApiProperty({
    example: "1"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "productId must be a positive integer."
  })
  productId!: string;

  @ApiProperty({
    example: "1"
  })
  @Transform(({ value }) => trimRequiredString(value))
  @Matches(/^[1-9]\d*$/, {
    message: "ingredientActiveId must be a positive integer."
  })
  ingredientActiveId!: string;
}
