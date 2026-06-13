import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class CreateVisitaRiegoDto {
  @ApiProperty({
    example: 1,
    description: "Identificador del tipo de riego aplicado."
  })
  @IsInt()
  @Min(1)
  tipoRiegoId!: number;
}
