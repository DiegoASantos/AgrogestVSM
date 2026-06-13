import { Body, Controller, Delete, Param, Patch } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaRiegosService } from "../application/visita-riegos.service";
import { UpdateVisitaRiegoDto } from "./dto/update-visita-riego.dto";

@ApiTags("Riegos de visita")
@Controller("riegos-visita")
export class VisitaRiegosController {
  constructor(private readonly visitaRiegosService: VisitaRiegosService) {}

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza el riego de una visita." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Riego actualizado." })
  @ApiBadRequestResponse({ description: "Datos invalidos." })
  @ApiNotFoundResponse({ description: "El riego no existe." })
  updateRiego(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateVisitaRiegoDto
  ) {
    return this.visitaRiegosService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Elimina el riego de una visita." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Riego eliminado." })
  @ApiNotFoundResponse({ description: "El riego no existe." })
  deleteRiego(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitaRiegosService.remove(id);
  }
}
