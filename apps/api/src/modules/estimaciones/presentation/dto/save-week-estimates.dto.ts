import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  Matches,
  Min,
  ValidateIf,
  ValidateNested
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SaveWeekEstimateItemDto {
  @ApiProperty({
    example: "7",
    description: "ID interno del usuario activo con rol AGRONOMO."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @Matches(/^[1-9]\d*$/, {
    message: "agronomoUsuarioId must be a positive integer."
  })
  agronomoUsuarioId!: string;

  @ApiProperty({
    example: 12,
    nullable: true,
    description:
      "Cantidad semanal estimada. null retira logicamente una estimacion existente."
  })
  @ValidateIf((_object, value) => value !== null)
  @Type(() => Number)
  @IsInt({ message: "visitasEstimadas must be an integer or null." })
  @Min(0, { message: "visitasEstimadas must be greater than or equal to zero." })
  visitasEstimadas!: number | null;
}

export class SaveWeekEstimatesDto {
  @ApiProperty({
    type: [SaveWeekEstimateItemDto],
    description: "Cambios de estimacion que se guardaran en una sola transaccion."
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SaveWeekEstimateItemDto)
  estimaciones!: SaveWeekEstimateItemDto[];
}
