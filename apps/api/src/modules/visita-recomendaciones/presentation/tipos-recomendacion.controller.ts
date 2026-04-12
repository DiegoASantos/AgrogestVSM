import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

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
  getRecommendationTypes() {
    return this.recommendationTypesService.findAll();
  }
}
