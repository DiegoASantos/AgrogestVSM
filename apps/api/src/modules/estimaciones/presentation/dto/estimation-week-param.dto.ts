import { Transform } from "class-transformer";
import { Matches } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class EstimationWeekParamDto {
  @ApiProperty({
    example: "2026-09-09",
    description:
      "Fecha ISO perteneciente a la semana solicitada; se normaliza de lunes a domingo."
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "fecha must use YYYY-MM-DD format."
  })
  fecha!: string;
}
