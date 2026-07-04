import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

export class FindRecetaAnteriorQueryDto {
  @ApiPropertyOptional({
    name: "excluirVisitaId",
    example: "12",
    description: "Id de visita actual que debe excluirse de la busqueda."
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "excluirVisitaId must be a positive integer."
  })
  excluirVisitaId?: string;
}
