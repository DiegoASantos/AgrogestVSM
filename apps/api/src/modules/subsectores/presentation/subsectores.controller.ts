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
import { SubsectoresService } from "../application/subsectores.service";
import { CreateSubsectorDto } from "./dto/create-subsector.dto";
import { FindSubsectoresQueryDto } from "./dto/find-subsectores-query.dto";
import { UpdateSubsectorDto } from "./dto/update-subsector.dto";

@ApiTags("Subsectores")
@Controller("subsectores")
export class SubsectoresController {
  constructor(private readonly subsectoresService: SubsectoresService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un subsector." })
  @ApiCreatedResponse({
    description: "Subsector creado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o sector inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe un subsector con el mismo nombre para el sector."
  })
  createSubsector(@Body() createSubsectorDto: CreateSubsectorDto) {
    return this.subsectoresService.create(createSubsectorDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista subsectores con filtros opcionales por sector y estado."
  })
  @ApiQuery({
    name: "sector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Lista de subsectores."
  })
  getSubsectores(@Query() query: FindSubsectoresQueryDto) {
    return this.subsectoresService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un subsector por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Subsector encontrado."
  })
  @ApiNotFoundResponse({
    description: "El subsector no existe."
  })
  getSubsectorById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.subsectoresService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un subsector." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Subsector actualizado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o sector inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe un subsector con el mismo nombre para el sector."
  })
  @ApiNotFoundResponse({
    description: "El subsector no existe."
  })
  updateSubsector(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateSubsectorDto: UpdateSubsectorDto
  ) {
    return this.subsectoresService.update(id, updateSubsectorDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente un subsector."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Subsector desactivado."
  })
  @ApiNotFoundResponse({
    description: "El subsector no existe."
  })
  deleteSubsector(@Param("id", ParseEntityIdPipe) id: string) {
    return this.subsectoresService.remove(id);
  }
}
