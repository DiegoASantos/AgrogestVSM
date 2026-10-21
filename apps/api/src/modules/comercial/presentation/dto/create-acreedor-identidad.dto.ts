import { PickType } from "@nestjs/mapped-types";
import { CreateAcreedorCosechaDto } from "./create-acreedor-cosecha.dto";

export class CreateAcreedorIdentidadDto extends PickType(CreateAcreedorCosechaDto, [
  "productorId",
  "publicId",
  "creditorFirstName",
  "creditorLastName",
  "creditorDocumentType",
  "creditorDocumentNumber"
] as const) {}
