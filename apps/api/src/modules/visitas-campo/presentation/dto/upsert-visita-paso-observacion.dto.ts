import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

function trimOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalizedValue = String(value ?? "").trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

export class UpsertVisitaPasoObservacionDto {
  @ApiPropertyOptional({
    example: "Se observo baja presencia sanitaria."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observation?: string | null;

  @ApiPropertyOptional({
    example: "Continuar monitoreo en la siguiente visita."
  })
  @Transform(({ value }) => trimOptionalString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  recommendation?: string | null;

  @ApiPropertyOptional({ description: "Finaliza explícitamente el paso Plagas." })
  @IsOptional()
  @IsBoolean()
  finalized?: boolean;
}
