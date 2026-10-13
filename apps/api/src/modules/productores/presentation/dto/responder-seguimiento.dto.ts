import { IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResponderSeguimientoDto {
  @ApiProperty({ enum: ["si", "no"] })
  @IsIn(["si", "no"])
  decision!: "si" | "no";
}
