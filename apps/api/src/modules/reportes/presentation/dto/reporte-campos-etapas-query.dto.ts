import { Transform } from "class-transformer";
import { IsOptional, Matches } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ReporteCamposEtapasQueryDto {
  @ApiPropertyOptional({
    name: "agronomo_usuario_id",
    example: "7",
    description: "Filtra por el agronomo activo que registro la ultima visita."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "agronomo_usuario_id must be a positive integer."
  })
  agronomo_usuario_id?: string;

  @ApiPropertyOptional({
    name: "productor_id",
    example: "15",
    description: "Filtra por el productor activo propietario de la parcela."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: "productor_id must be a positive integer."
  })
  productor_id?: string;
}

function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return String(value).trim();
}
