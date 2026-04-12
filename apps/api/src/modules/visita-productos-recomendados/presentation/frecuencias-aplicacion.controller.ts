import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ProductCatalogsService } from "../application/product-catalogs.service";

@ApiTags("Frecuencias de Aplicacion")
@Controller("frecuencias-aplicacion")
export class FrecuenciasAplicacionController {
  constructor(
    private readonly productCatalogsService: ProductCatalogsService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Lista el catalogo de frecuencias de aplicacion."
  })
  @ApiOkResponse({
    description: "Catalogo de frecuencias de aplicacion."
  })
  getApplicationFrequencies(@Query() pagination: PaginationQueryDto) {
    return this.productCatalogsService.findAllApplicationFrequencies(pagination);
  }
}
