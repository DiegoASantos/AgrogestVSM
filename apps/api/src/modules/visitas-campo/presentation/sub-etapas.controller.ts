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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { SubEtapasService } from "../application/sub-etapas.service";
import { CreateSubEtapaDto } from "./dto/create-sub-etapa.dto";
import { FindSubEtapasQueryDto } from "./dto/find-sub-etapas-query.dto";
import { UpdateSubEtapaDto } from "./dto/update-sub-etapa.dto";

@ApiTags("Sub Etapas")
@Controller("sub-etapas")
export class SubEtapasController {
  constructor(private readonly subEtapasService: SubEtapasService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea una sub etapa." })
  @ApiCreatedResponse({
    description: "Sub etapa creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o etapa fenologica inexistente/no valida."
  })
  @ApiConflictResponse({
    description: "Ya existe una sub etapa con el mismo nombre u orden."
  })
  createSubEtapa(@Body() createSubEtapaDto: CreateSubEtapaDto) {
    return this.subEtapasService.create(createSubEtapaDto);
  }

  @Get()
  @ApiOperation({
    summary:
      "Lista las sub etapas, con filtros opcionales por etapa fenologica y estado."
  })
  @ApiQuery({
    name: "etapa_fenologica_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "estado",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Lista de sub etapas."
  })
  getSubEtapas(@Query() query: FindSubEtapasQueryDto) {
    return this.subEtapasService.findAll(query, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una sub etapa por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Sub etapa encontrada."
  })
  @ApiNotFoundResponse({
    description: "La sub etapa no existe."
  })
  getSubEtapaById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.subEtapasService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza una sub etapa." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Sub etapa actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o etapa fenologica inexistente/no valida."
  })
  @ApiConflictResponse({
    description: "Ya existe una sub etapa con el mismo nombre u orden."
  })
  @ApiNotFoundResponse({
    description: "La sub etapa no existe."
  })
  updateSubEtapa(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateSubEtapaDto: UpdateSubEtapaDto
  ) {
    return this.subEtapasService.update(id, updateSubEtapaDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente una sub etapa."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Sub etapa desactivada."
  })
  @ApiNotFoundResponse({
    description: "La sub etapa no existe."
  })
  deleteSubEtapa(@Param("id", ParseEntityIdPipe) id: string) {
    return this.subEtapasService.remove(id);
  }
}
