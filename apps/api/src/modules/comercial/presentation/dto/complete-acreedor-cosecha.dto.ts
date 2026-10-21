import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, Matches } from "class-validator";
import { PAGO_COSECHA_BANKS, type PagoCosechaBank } from "../../infrastructure/persistence/entities/acreedor-cosecha.entity";

export class CompleteAcreedorCosechaDto {
  @ApiProperty({ enum: PAGO_COSECHA_BANKS, description: "Banco para la cuenta de abono." })
  @IsIn(PAGO_COSECHA_BANKS)
  bank!: PagoCosechaBank;

  @ApiProperty({ description: "Número de cuenta o CCI, de hasta 30 dígitos." })
  @Transform(({ value }) => typeof value === "string" ? value.replace(/\s/g, "") : value)
  @Matches(/^\d{1,30}$/)
  accountNumber!: string;
}
