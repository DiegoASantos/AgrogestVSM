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
import { SectoresService } from "../application/sectores.service";
import { CreateSectorDto } from "./dto/create-sector.dto";
import { FindSectoresQueryDto } from "./dto/find-sectores-query.dto";
import { UpdateSectorDto } from "./dto/update-sector.dto";

@ApiTags("Sectores")
@Controller("sectores")
export class SectoresController {
  constructor(private readonly sectoresService: SectoresService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un sector." })
  @ApiCreatedResponse({
    description: "Sector creado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o productor inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe un sector con el mismo nombre para el productor."
  })
  createSector(@Body() createSectorDto: CreateSectorDto) {
    return this.sectoresService.create(createSectorDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista sectores con filtros opcionales por productor y estado."
  })
  @ApiQuery({
    name: "productor_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Lista de sectores."
  })
  getSectores(@Query() query: FindSectoresQueryDto) {
    return this.sectoresService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un sector por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Sector encontrado."
  })
  @ApiNotFoundResponse({
    description: "El sector no existe."
  })
  getSectorById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sectoresService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un sector." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Sector actualizado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o productor inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe un sector con el mismo nombre para el productor."
  })
  @ApiNotFoundResponse({
    description: "El sector no existe."
  })
  updateSector(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateSectorDto: UpdateSectorDto
  ) {
    return this.sectoresService.update(id, updateSectorDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente un sector."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Sector desactivado."
  })
  @ApiNotFoundResponse({
    description: "El sector no existe."
  })
  deleteSector(@Param("id", ParseEntityIdPipe) id: string) {
    return this.sectoresService.remove(id);
  }
}
