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
import { CreatePlagaEnfermedadEtapaNivelDto } from "./dto/create-plaga-enfermedad-etapa-nivel.dto";
import { UpdatePlagaEnfermedadEtapaNivelDto } from "./dto/update-plaga-enfermedad-etapa-nivel.dto";

@ApiTags("Plagas y Enfermedades - Etapas y Niveles")
@Controller("plagas-enfermedades-etapas-niveles")
export class PlagasEnfermedadesEtapasNivelesController {
  constructor(
    private readonly sanitaryCatalogsService: SanitaryCatalogsService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({
    summary:
      "Crea una relacion entre plaga/enfermedad, etapa fenologica y nivel."
  })
  @ApiCreatedResponse({
    description: "Relacion creada."
  })
  @ApiConflictResponse({
    description: "Ya existe una relacion con la misma combinacion."
  })
  createPestDiseaseStageLevel(
    @Body() createDto: CreatePlagaEnfermedadEtapaNivelDto
  ) {
    return this.sanitaryCatalogsService.createPestDiseaseStageLevel(createDto);
  }

  @Get()
  @ApiOperation({
    summary:
      "Lista las relaciones de plagas/enfermedades con etapas y niveles."
  })
  @ApiOkResponse({
    description: "Relaciones encontradas."
  })
  getPestDiseaseStageLevels(@Query() pagination: PaginationQueryDto) {
    return this.sanitaryCatalogsService.findAllPestDiseaseStageLevels(
      pagination
    );
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtiene una relacion por id."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Relacion encontrada."
  })
  @ApiNotFoundResponse({
    description: "La relacion no existe."
  })
  getPestDiseaseStageLevelById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sanitaryCatalogsService.findPestDiseaseStageLevelById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Actualiza una relacion."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Relacion actualizada."
  })
  @ApiConflictResponse({
    description: "Ya existe una relacion con la misma combinacion."
  })
  @ApiNotFoundResponse({
    description: "La relacion no existe."
  })
  updatePestDiseaseStageLevel(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdatePlagaEnfermedadEtapaNivelDto
  ) {
    return this.sanitaryCatalogsService.updatePestDiseaseStageLevel(
      id,
      updateDto
    );
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente una relacion."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Relacion desactivada."
  })
  @ApiNotFoundResponse({
    description: "La relacion no existe."
  })
  deletePestDiseaseStageLevel(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sanitaryCatalogsService.removePestDiseaseStageLevel(id);
  }
}
