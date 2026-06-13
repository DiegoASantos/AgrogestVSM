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
import { LaboresCulturalesService } from "../application/labores-culturales.service";
import { CreateOperationalCatalogDto } from "./dto/create-operational-catalog.dto";
import { UpdateOperationalCatalogDto } from "./dto/update-operational-catalog.dto";

@ApiTags("Labores Culturales")
@Controller("labores-culturales")
export class LaboresCulturalesController {
  constructor(
    private readonly laboresCulturalesService: LaboresCulturalesService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea una labor cultural." })
  @ApiCreatedResponse({ description: "Labor cultural creada." })
  @ApiConflictResponse({ description: "Ya existe una labor cultural con el mismo nombre." })
  create(@Body() createDto: CreateOperationalCatalogDto) {
    return this.laboresCulturalesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista las labores culturales." })
  @ApiOkResponse({ description: "Catalogo de labores culturales." })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.laboresCulturalesService.findAll(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una labor cultural por id." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Labor cultural encontrada." })
  @ApiNotFoundResponse({ description: "La labor cultural no existe." })
  findById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.laboresCulturalesService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza una labor cultural." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Labor cultural actualizada." })
  @ApiConflictResponse({ description: "Ya existe una labor cultural con el mismo nombre." })
  @ApiNotFoundResponse({ description: "La labor cultural no existe." })
  update(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateOperationalCatalogDto
  ) {
    return this.laboresCulturalesService.update(id, updateDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Desactiva una labor cultural." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Labor cultural desactivada." })
  @ApiNotFoundResponse({ description: "La labor cultural no existe." })
  remove(@Param("id", ParseEntityIdPipe) id: string) {
    return this.laboresCulturalesService.remove(id);
  }
}
