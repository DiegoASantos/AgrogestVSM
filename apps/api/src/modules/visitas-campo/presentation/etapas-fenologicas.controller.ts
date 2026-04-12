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
import { EtapasFenologicasService } from "../application/etapas-fenologicas.service";
import { CreateEtapaFenologicaDto } from "./dto/create-etapa-fenologica.dto";
import { FindEtapasFenologicasQueryDto } from "./dto/find-etapas-fenologicas-query.dto";
import { UpdateEtapaFenologicaDto } from "./dto/update-etapa-fenologica.dto";

@ApiTags("Etapas Fenologicas")
@Controller("etapas-fenologicas")
export class EtapasFenologicasController {
  constructor(
    private readonly etapasFenologicasService: EtapasFenologicasService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea una etapa fenologica." })
  @ApiCreatedResponse({
    description: "Etapa fenologica creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o cultivo inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe una etapa con el mismo nombre para el cultivo."
  })
  createEtapaFenologica(
    @Body() createEtapaFenologicaDto: CreateEtapaFenologicaDto
  ) {
    return this.etapasFenologicasService.create(createEtapaFenologicaDto);
  }

  @Get()
  @ApiOperation({
    summary:
      "Lista las etapas fenologicas, con filtros opcionales por cultivo y estado."
  })
  @ApiQuery({
    name: "cultivo_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activa",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Lista de etapas fenologicas."
  })
  getEtapasFenologicas(@Query() query: FindEtapasFenologicasQueryDto) {
    return this.etapasFenologicasService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una etapa fenologica por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Etapa fenologica encontrada."
  })
  @ApiNotFoundResponse({
    description: "La etapa fenologica no existe."
  })
  getEtapaFenologicaById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.etapasFenologicasService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza una etapa fenologica." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Etapa fenologica actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o cultivo inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe una etapa con el mismo nombre para el cultivo."
  })
  @ApiNotFoundResponse({
    description: "La etapa fenologica no existe."
  })
  updateEtapaFenologica(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateEtapaFenologicaDto: UpdateEtapaFenologicaDto
  ) {
    return this.etapasFenologicasService.update(id, updateEtapaFenologicaDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente una etapa fenologica."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Etapa fenologica desactivada."
  })
  @ApiNotFoundResponse({
    description: "La etapa fenologica no existe."
  })
  deleteEtapaFenologica(@Param("id", ParseEntityIdPipe) id: string) {
    return this.etapasFenologicasService.remove(id);
  }
}
