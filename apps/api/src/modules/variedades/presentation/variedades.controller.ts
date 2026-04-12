import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VariedadesService } from "../application/variedades.service";

@ApiTags("Variedades")
@Controller("variedades")
export class VariedadesController {
  constructor(private readonly variedadesService: VariedadesService) {}

  @Get()
  @ApiOperation({ summary: "Lista las variedades disponibles." })
  @ApiOkResponse({
    description: "Lista de variedades."
  })
  getVariedades(@Query() pagination: PaginationQueryDto) {
    return this.variedadesService.findAll(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una variedad por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Variedad encontrada."
  })
  @ApiNotFoundResponse({
    description: "La variedad no existe."
  })
  getVariedadById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.variedadesService.findById(id);
  }
}
