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
import { TiposDocumentoService } from "../application/tipos-documento.service";
import { CreateTipoDocumentoDto } from "./dto/create-tipo-documento.dto";
import { UpdateTipoDocumentoDto } from "./dto/update-tipo-documento.dto";

@ApiTags("Tipos Documento")
@Controller("tipos-documento")
export class TiposDocumentoController {
  constructor(
    private readonly tiposDocumentoService: TiposDocumentoService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un tipo de documento." })
  @ApiCreatedResponse({
    description: "Tipo de documento creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un tipo de documento con el mismo codigo o nombre."
  })
  createTipoDocumento(@Body() createTipoDocumentoDto: CreateTipoDocumentoDto) {
    return this.tiposDocumentoService.create(createTipoDocumentoDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los tipos de documento." })
  @ApiOkResponse({
    description: "Lista de tipos de documento."
  })
  getTiposDocumento() {
    return this.tiposDocumentoService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un tipo de documento por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Tipo de documento encontrado."
  })
  @ApiNotFoundResponse({
    description: "El tipo de documento no existe."
  })
  getTipoDocumentoById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.tiposDocumentoService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un tipo de documento." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Tipo de documento actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un tipo de documento con el mismo codigo o nombre."
  })
  @ApiNotFoundResponse({
    description: "El tipo de documento no existe."
  })
  updateTipoDocumento(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateTipoDocumentoDto: UpdateTipoDocumentoDto
  ) {
    return this.tiposDocumentoService.update(id, updateTipoDocumentoDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Elimina un tipo de documento." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Tipo de documento eliminado."
  })
  @ApiConflictResponse({
    description: "El tipo de documento esta en uso."
  })
  @ApiNotFoundResponse({
    description: "El tipo de documento no existe."
  })
  deleteTipoDocumento(@Param("id", ParseEntityIdPipe) id: string) {
    return this.tiposDocumentoService.remove(id);
  }
}
