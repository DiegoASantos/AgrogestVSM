import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class CreateVisitaLaborCulturalDto {
  @ApiProperty({
    example: 1,
    description: "Identificador de la labor cultural realizada."
  })
  @IsInt()
  @Min(1)
  laborCulturalId!: number;
}
