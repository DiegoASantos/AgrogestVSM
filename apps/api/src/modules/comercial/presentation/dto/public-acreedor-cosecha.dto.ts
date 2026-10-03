import { OmitType } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CreateAcreedorCosechaDto } from "./create-acreedor-cosecha.dto";

export class PublicAcreedorCosechaDto extends OmitType(CreateAcreedorCosechaDto, [
  "productorId"
] as const) {}

export class UpdatePublicAcreedorCosechaDto extends OmitType(PublicAcreedorCosechaDto, [
  "publicId"
] as const) {}

export class ExchangeProducerCodeDto {
  @IsString()
  @MinLength(8)
  @MaxLength(19)
  code!: string;
}

export class ReviewCreditorDto {
  @IsIn(["APPROVED", "OBSERVED"])
  decision!: "APPROVED" | "OBSERVED";

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observation?: string;
}
