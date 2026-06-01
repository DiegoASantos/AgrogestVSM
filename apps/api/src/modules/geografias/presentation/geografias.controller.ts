import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { GeografiasService } from "../application/geografias.service";

@ApiTags("Geografias")
@Controller("geografias")
export class GeografiasController {
  constructor(private readonly geografiasService: GeografiasService) {}

  @Get("departamentos")
  @ApiOperation({ summary: "Lista departamentos disponibles." })
  getDepartamentos() {
    return this.geografiasService.findDepartamentos();
  }

  @Get("departamentos/:departamentoId/provincias")
  @ApiOperation({ summary: "Lista provincias de un departamento." })
  getProvincias(
    @Param("departamentoId", ParseEntityIdPipe) departamentoId: string
  ) {
    return this.geografiasService.findProvinciasByDepartamentoId(departamentoId);
  }

  @Get("provincias/:provinciaId/distritos")
  @ApiOperation({ summary: "Lista distritos de una provincia." })
  getDistritos(@Param("provinciaId", ParseEntityIdPipe) provinciaId: string) {
    return this.geografiasService.findDistritosByProvinciaId(provinciaId);
  }

  @Get("distritos")
  @ApiOperation({ summary: "Lista distritos con su jerarquia geografica." })
  getAllDistritos() {
    return this.geografiasService.findDistritos();
  }
}
