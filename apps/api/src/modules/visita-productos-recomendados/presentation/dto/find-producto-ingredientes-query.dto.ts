import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

export class FindProductoIngredientesQueryDto {
  @ApiPropertyOptional({
    name: "producto_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "producto_id must be a positive integer."
  })
  producto_id?: string;

  @ApiPropertyOptional({
    name: "ingrediente_activo_id",
    example: "1"
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "ingrediente_activo_id must be a positive integer."
  })
  ingrediente_activo_id?: string;
}
