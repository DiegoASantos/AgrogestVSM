import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min, ValidateIf } from "class-validator";

export class SaveWeekPricesDto {
  @ApiProperty({ description: "Precio mínimo en soles por jaba; ambos null retiran el rango.", example: 20.5, nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9999999999.99)
  precioMinimo!: number | null;

  @ApiProperty({ description: "Precio máximo en soles por jaba; ambos null retiran el rango.", example: 30, nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(9999999999.99)
  precioMaximo!: number | null;
}
