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

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { CampaniasService } from "../application/campanias.service";
import { CreateCampaniaDto } from "./dto/create-campania.dto";
import { FindCampaniasQueryDto } from "./dto/find-campanias-query.dto";
import { UpdateCampaniaDto } from "./dto/update-campania.dto";

@ApiTags("Campanias")
@Controller("campanias")
export class CampaniasController {
  constructor(private readonly campaniasService: CampaniasService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea una campania." })
  @ApiCreatedResponse({
    description: "Campania creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o cultivo inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe una campania con el mismo nombre."
  })
  createCampania(@Body() createCampaniaDto: CreateCampaniaDto) {
    return this.campaniasService.create(createCampaniaDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista las campanias, con filtros opcionales por cultivo y estado."
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
    description: "Lista de campanias."
  })
  getCampanias(
    @Query() query: FindCampaniasQueryDto,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.campaniasService.findAll(query, pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una campania por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Campania encontrada."
  })
  @ApiNotFoundResponse({
    description: "La campania no existe."
  })
  getCampaniaById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.campaniasService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza una campania." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Campania actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o cultivo inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe una campania con el mismo nombre."
  })
  @ApiNotFoundResponse({
    description: "La campania no existe."
  })
  updateCampania(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateCampaniaDto: UpdateCampaniaDto
  ) {
    return this.campaniasService.update(id, updateCampaniaDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente una campania."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Campania desactivada."
  })
  @ApiNotFoundResponse({
    description: "La campania no existe."
  })
  deleteCampania(@Param("id", ParseEntityIdPipe) id: string) {
    return this.campaniasService.remove(id);
  }
}
