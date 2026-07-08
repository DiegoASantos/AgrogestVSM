import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public } from "../../auth/presentation/decorators/public.decorator";
import { CostBuildExportService } from "../application/cost-build-export.service";
import { CostBuildApiKeyGuard } from "./guards/cost-build-api-key.guard";

@ApiTags("Integraciones")
@Controller("integraciones/cost-build")
@Public()
@UseGuards(CostBuildApiKeyGuard)
export class CostBuildExportController {
  constructor(private readonly costBuildExportService: CostBuildExportService) {}

  @Get("export")
  @ApiOperation({
    summary: "Exporta datos maestros de AgroGest para Cost-Build."
  })
  @ApiHeader({
    name: "x-api-key",
    required: true,
    description: "API key autorizada para la integracion Cost-Build."
  })
  @ApiOkResponse({
    description:
      "Datos maestros de cultivos, variedades, campanias, productores, sectores, subsectores y parcelas."
  })
  exportAll() {
    return this.costBuildExportService.exportAll();
  }
}
