import { PartialType } from "@nestjs/swagger";
import { CreateMarcaProductoDto } from "./create-marca-producto.dto";

export class UpdateMarcaProductoDto extends PartialType(CreateMarcaProductoDto) {}
