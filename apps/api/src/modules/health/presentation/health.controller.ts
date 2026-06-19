import { Controller, Get } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";

import { Public } from "../../auth/presentation/decorators/public.decorator";
import { HealthService } from "../application/health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Verifica el estado base de la API." })
  @ApiOkResponse({
    description: "La API esta operativa.",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true
        },
        timestamp: {
          type: "string",
          format: "date-time"
        },
        data: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "ok"
            },
            service: {
              type: "string",
              example: "agrogest-vsm-api"
            },
            environment: {
              type: "string",
              example: "development"
            },
            uptimeSeconds: {
              type: "number",
              example: 42
            },
            deployment: {
              type: "object",
              properties: {
                commit: {
                  type: "string",
                  nullable: true,
                  example: "9deda38"
                },
                branch: {
                  type: "string",
                  nullable: true,
                  example: "master"
                },
                serviceId: {
                  type: "string",
                  nullable: true,
                  example: "srv_xxxxx"
                }
              }
            }
          }
        }
      }
    }
  })
  getHealth() {
    return this.healthService.getStatus();
  }

  @Get("db")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Verifica la conectividad actual con PostgreSQL." })
  @ApiOkResponse({
    description: "La conexion a la base de datos esta disponible.",
    schema: {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          example: true
        },
        timestamp: {
          type: "string",
          format: "date-time"
        },
        data: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "ok"
            },
            service: {
              type: "string",
              example: "agrogest-vsm-api"
            },
            database: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  example: "up"
                },
                type: {
                  type: "string",
                  example: "postgres"
                },
                postgisEnabled: {
                  type: "boolean",
                  example: true
                },
                postgisVersion: {
                  type: "string",
                  example: "3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1"
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiServiceUnavailableResponse({
    description: "La conexion a PostgreSQL no esta disponible."
  })
  getDatabaseHealth() {
    return this.healthService.getDatabaseStatus();
  }
}
