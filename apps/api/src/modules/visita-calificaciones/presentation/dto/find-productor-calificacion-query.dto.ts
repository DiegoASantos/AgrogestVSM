import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

export class FindProductorCalificacionQueryDto {
  @ApiPropertyOptional({
    name: "campania_id",
    example: "3",
    description: "Filtra el calculo general a una campania especifica."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "campania_id must be a positive integer."
  })
  campania_id?: string;
}
