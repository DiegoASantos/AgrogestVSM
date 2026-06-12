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
import { CreateNutrienteDto } from "./dto/create-nutriente.dto";
import { UpdateNutrienteDto } from "./dto/update-nutriente.dto";

@ApiTags("Nutricion - Nutrientes")
@Controller("nutrientes")
export class NutrientesController {
  constructor(private readonly nutritionCatalogsService: NutritionCatalogsService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un nutriente por cultivo." })
  @ApiCreatedResponse({ description: "Nutriente creado." })
  @ApiConflictResponse({
    description: "Ya existe un nutriente con el mismo cultivo y nombre."
  })
  createNutrient(@Body() createDto: CreateNutrienteDto) {
    return this.nutritionCatalogsService.createNutrient(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista el catalogo de nutrientes." })
  @ApiOkResponse({ description: "Catalogo de nutrientes." })
  getNutrients(@Query() pagination: PaginationQueryDto) {
    return this.nutritionCatalogsService.findAllNutrients(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un nutriente por id." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Nutriente encontrado." })
  @ApiNotFoundResponse({ description: "El nutriente no existe." })
  getNutrientById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.nutritionCatalogsService.findNutrientById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un nutriente." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Nutriente actualizado." })
  @ApiConflictResponse({
    description: "Ya existe un nutriente con el mismo cultivo y nombre."
  })
  @ApiNotFoundResponse({ description: "El nutriente no existe." })
  updateNutrient(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateNutrienteDto
  ) {
    return this.nutritionCatalogsService.updateNutrient(id, updateDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Desactiva logicamente un nutriente." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Nutriente desactivado." })
  @ApiNotFoundResponse({ description: "El nutriente no existe." })
  deleteNutrient(@Param("id", ParseEntityIdPipe) id: string) {
    return this.nutritionCatalogsService.removeNutrient(id);
  }
}
