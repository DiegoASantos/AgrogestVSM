import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { RecommendationTypesService } from "../application/recommendation-types.service";

@ApiTags("Tipos de Recomendacion")
@Controller("tipos-recomendacion")
export class TiposRecomendacionController {
  constructor(
    private readonly recommendationTypesService: RecommendationTypesService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Lista el catalogo de tipos de recomendacion."
  })
  @ApiOkResponse({
    description: "Catalogo de tipos de recomendacion."
  })
  getRecommendationTypes(@Query() pagination: PaginationQueryDto) {
    return this.recommendationTypesService.findAll(pagination);
  }
}
