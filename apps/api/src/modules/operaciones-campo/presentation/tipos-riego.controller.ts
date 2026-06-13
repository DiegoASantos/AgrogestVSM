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
import { TiposRiegoService } from "../application/tipos-riego.service";
import { CreateOperationalCatalogDto } from "./dto/create-operational-catalog.dto";
import { UpdateOperationalCatalogDto } from "./dto/update-operational-catalog.dto";

@ApiTags("Tipos Riego")
@Controller("tipos-riego")
export class TiposRiegoController {
  constructor(private readonly tiposRiegoService: TiposRiegoService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un tipo de riego." })
  @ApiCreatedResponse({ description: "Tipo de riego creado." })
  @ApiConflictResponse({ description: "Ya existe un tipo de riego con el mismo nombre." })
  create(@Body() createDto: CreateOperationalCatalogDto) {
    return this.tiposRiegoService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los tipos de riego." })
  @ApiOkResponse({ description: "Catalogo de tipos de riego." })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.tiposRiegoService.findAll(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un tipo de riego por id." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Tipo de riego encontrado." })
  @ApiNotFoundResponse({ description: "El tipo de riego no existe." })
  findById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.tiposRiegoService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un tipo de riego." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Tipo de riego actualizado." })
  @ApiConflictResponse({ description: "Ya existe un tipo de riego con el mismo nombre." })
  @ApiNotFoundResponse({ description: "El tipo de riego no existe." })
  update(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateOperationalCatalogDto
  ) {
    return this.tiposRiegoService.update(id, updateDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Desactiva un tipo de riego." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Tipo de riego desactivado." })
  @ApiNotFoundResponse({ description: "El tipo de riego no existe." })
  remove(@Param("id", ParseEntityIdPipe) id: string) {
    return this.tiposRiegoService.remove(id);
  }
}
