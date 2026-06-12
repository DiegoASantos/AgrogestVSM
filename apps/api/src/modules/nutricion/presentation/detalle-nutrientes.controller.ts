import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { NutritionCatalogsService } from "../application/nutrition-catalogs.service";
import { CreateDetalleNutrienteDto } from "./dto/create-detalle-nutriente.dto";
import { UpdateDetalleNutrienteDto } from "./dto/update-detalle-nutriente.dto";

@ApiTags("Nutricion - Detalle Nutrientes")
@Controller("detalle-nutrientes")
export class DetalleNutrientesController {
  constructor(private readonly nutritionCatalogsService: NutritionCatalogsService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un detalle de nutriente." })
  @ApiCreatedResponse({ description: "Detalle creado." })
  @ApiConflictResponse({
    description: "Ya existe un detalle con el mismo nutriente y nombre."
  })
  createDetail(@Body() createDto: CreateDetalleNutrienteDto) {
    return this.nutritionCatalogsService.createDetail(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los detalles de nutrientes." })
  @ApiOkResponse({ description: "Detalle de nutrientes." })
  getDetails(@Query() pagination: PaginationQueryDto) {
    return this.nutritionCatalogsService.findAllDetails(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un detalle por id." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Detalle encontrado." })
  @ApiNotFoundResponse({ description: "El detalle no existe." })
  getDetailById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.nutritionCatalogsService.findDetailById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un detalle de nutriente." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Detalle actualizado." })
  @ApiConflictResponse({
    description: "Ya existe un detalle con el mismo nutriente y nombre."
  })
  @ApiNotFoundResponse({ description: "El detalle no existe." })
  updateDetail(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateDetalleNutrienteDto
  ) {
    return this.nutritionCatalogsService.updateDetail(id, updateDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Desactiva logicamente un detalle de nutriente." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Detalle desactivado." })
  @ApiNotFoundResponse({ description: "El detalle no existe." })
  deleteDetail(@Param("id", ParseEntityIdPipe) id: string) {
    return this.nutritionCatalogsService.removeDetail(id);
  }
}
