import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
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

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { SanitaryCatalogsService } from "../application/sanitary-catalogs.service";
import { CreatePlagaEnfermedadDto } from "./dto/create-plaga-enfermedad.dto";
import { UpdatePlagaEnfermedadDto } from "./dto/update-plaga-enfermedad.dto";

@ApiTags("Plagas y Enfermedades")
@Controller("plagas-enfermedades")
export class PlagasEnfermedadesController {
  constructor(
    private readonly sanitaryCatalogsService: SanitaryCatalogsService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Crea una plaga o enfermedad."
  })
  @ApiCreatedResponse({
    description: "Registro creado."
  })
  @ApiConflictResponse({
    description: "Ya existe una plaga o enfermedad con el mismo nombre."
  })
  createPestDisease(
    @Body() createPlagaEnfermedadDto: CreatePlagaEnfermedadDto
  ) {
    return this.sanitaryCatalogsService.createPestDisease(
      createPlagaEnfermedadDto
    );
  }

  @Get()
  @ApiOperation({
    summary: "Lista el catalogo de plagas y enfermedades."
  })
  @ApiOkResponse({
    description: "Catalogo de plagas y enfermedades."
  })
  getPestDiseases() {
    return this.sanitaryCatalogsService.findAllPestDiseases();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Obtiene una plaga o enfermedad por id."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Registro encontrado."
  })
  @ApiNotFoundResponse({
    description: "La plaga o enfermedad no existe."
  })
  getPestDiseaseById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sanitaryCatalogsService.findPestDiseaseById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Actualiza una plaga o enfermedad."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Registro actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe una plaga o enfermedad con el mismo nombre."
  })
  @ApiNotFoundResponse({
    description: "La plaga o enfermedad no existe."
  })
  updatePestDisease(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updatePlagaEnfermedadDto: UpdatePlagaEnfermedadDto
  ) {
    return this.sanitaryCatalogsService.updatePestDisease(
      id,
      updatePlagaEnfermedadDto
    );
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente una plaga o enfermedad."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Registro desactivado."
  })
  @ApiNotFoundResponse({
    description: "La plaga o enfermedad no existe."
  })
  deletePestDisease(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sanitaryCatalogsService.removePestDisease(id);
  }
}
