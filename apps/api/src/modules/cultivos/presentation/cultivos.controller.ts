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
import { CultivosService } from "../application/cultivos.service";
import { CreateCultivoDto } from "./dto/create-cultivo.dto";
import { UpdateCultivoDto } from "./dto/update-cultivo.dto";

@ApiTags("Cultivos")
@Controller("cultivos")
export class CultivosController {
  constructor(private readonly cultivosService: CultivosService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un cultivo." })
  @ApiCreatedResponse({
    description: "Cultivo creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un cultivo con el mismo codigo o nombre."
  })
  createCultivo(@Body() createCultivoDto: CreateCultivoDto) {
    return this.cultivosService.create(createCultivoDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los cultivos disponibles." })
  @ApiOkResponse({
    description: "Lista de cultivos."
  })
  getCultivos() {
    return this.cultivosService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un cultivo por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Cultivo encontrado."
  })
  @ApiNotFoundResponse({
    description: "El cultivo no existe."
  })
  getCultivoById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.cultivosService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un cultivo." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Cultivo actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un cultivo con el mismo codigo o nombre."
  })
  @ApiNotFoundResponse({
    description: "El cultivo no existe."
  })
  updateCultivo(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateCultivoDto: UpdateCultivoDto
  ) {
    return this.cultivosService.update(id, updateCultivoDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({
    summary: "Desactiva logicamente un cultivo."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Cultivo desactivado."
  })
  @ApiNotFoundResponse({
    description: "El cultivo no existe."
  })
  deleteCultivo(@Param("id", ParseEntityIdPipe) id: string) {
    return this.cultivosService.remove(id);
  }
}
