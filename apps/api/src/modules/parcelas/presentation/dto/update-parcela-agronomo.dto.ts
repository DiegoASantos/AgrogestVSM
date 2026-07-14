import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateParcelaAgronomoDto {
  @ApiPropertyOptional({
    example: "1",
    description:
      "ID del usuario con rol AGRONOMO a asignar. null desasigna el agronomo.",
    nullable: true
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" || value === "null" ? null : String(value).trim()
  )
  @IsString()
  @Matches(/^\d+$/, {
    message: "usuarioId must be a positive integer string."
  })
  usuarioId?: string | null;
}
