import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, Matches } from "class-validator";

export class BuscarAcreedorDocumentoDto {
  @ApiProperty({ enum: ["DNI", "RUC"] })
  @IsIn(["DNI", "RUC"])
  tipoDocumento!: "DNI" | "RUC";

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @Matches(/^\d{8}$|^\d{11}$/)
  nroDocumento!: string;
}
