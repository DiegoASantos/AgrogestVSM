import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
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
import { SanitaryCatalogsService } from "../application/sanitary-catalogs.service";
import { CreateNivelIncidenciaDto } from "./dto/create-nivel-incidencia.dto";
import { UpdateNivelIncidenciaDto } from "./dto/update-nivel-incidencia.dto";

@ApiTags("Niveles de Incidencia")
@Controller("niveles-incidencia")
export class NivelesIncidenciaController {
  constructor(
    private readonly sanitaryCatalogsService: SanitaryCatalogsService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Crea un nivel de incidencia."
  })
  @ApiCreatedResponse({
    description: "Nivel de incidencia creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un nivel con el mismo nombre o valor de orden."
  })
  createIncidenceLevel(
    @Body() createNivelIncidenciaDto: CreateNivelIncidenciaDto
  ) {
    return this.sanitaryCatalogsService.createIncidenceLevel(
      createNivelIncidenciaDto
    );
  }

  @Get()
  @ApiOperation({
    summary: "Lista el catalogo de niveles de incidencia."
  })
  @ApiOkResponse({
    description: "Catalogo de niveles de incidencia."
  })
  getIncidenceLevels(@Query() pagination: PaginationQueryDto) {
    return this.sanitaryCatalogsService.findAllIncidenceLevels(pagination);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtiene un nivel de incidencia por id."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "3"
  })
  @ApiOkResponse({
    description: "Nivel de incidencia encontrado."
  })
  @ApiNotFoundResponse({
    description: "El nivel de incidencia no existe."
  })
  getIncidenceLevelById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sanitaryCatalogsService.findIncidenceLevelById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Actualiza un nivel de incidencia."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "3"
  })
  @ApiOkResponse({
    description: "Nivel de incidencia actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un nivel con el mismo nombre o valor de orden."
  })
  @ApiNotFoundResponse({
    description: "El nivel de incidencia no existe."
  })
  updateIncidenceLevel(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateNivelIncidenciaDto: UpdateNivelIncidenciaDto
  ) {
    return this.sanitaryCatalogsService.updateIncidenceLevel(
      id,
      updateNivelIncidenciaDto
    );
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Elimina un nivel de incidencia."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "3"
  })
  @ApiOkResponse({
    description: "Nivel de incidencia eliminado."
  })
  @ApiConflictResponse({
    description: "El nivel de incidencia esta en uso."
  })
  @ApiNotFoundResponse({
    description: "El nivel de incidencia no existe."
  })
  deleteIncidenceLevel(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sanitaryCatalogsService.removeIncidenceLevel(id);
  }
}
