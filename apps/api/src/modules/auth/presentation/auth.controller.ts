import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from "@nestjs/swagger";

import { AuthService } from "../application/auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { CurrentAuthUser } from "./decorators/current-auth-user.decorator";
import { Public } from "./decorators/public.decorator";
import { Roles } from "./decorators/roles.decorator";
import type { AccessTokenPayload } from "../types/auth.types";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Public()
  @ApiOperation({ summary: "Autentica un usuario con email y password." })
  @ApiBody({
    type: LoginDto
  })
  @ApiOkResponse({
    description: "Credenciales validas. Devuelve un access token JWT.",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        timestamp: {
          type: "string",
          format: "date-time"
        },
        data: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            tokenType: {
              type: "string",
              example: "Bearer"
            },
            expiresIn: {
              type: "string",
              example: "1h"
            },
            user: {
              type: "object",
              properties: {
                publicId: {
                  type: "string",
                  format: "uuid"
                },
                firstName: {
                  type: "string",
                  example: "Juan"
                },
                lastName: {
                  type: "string",
                  example: "Perez"
                },
                email: {
                  type: "string",
                  example: "juan.perez@agrogest.com"
                },
                phone: {
                  type: "string",
                  nullable: true,
                  example: "999888777"
                },
                isActive: {
                  type: "boolean",
                  example: true
                },
                roles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "number",
                        example: 1
                      },
                      code: {
                        type: "string",
                        example: "ADMIN"
                      },
                      name: {
                        type: "string",
                        example: "Administrador"
                      },
                      description: {
                        type: "string",
                        nullable: true,
                        example: "Acceso total al panel"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: "Credenciales invalidas."
  })
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @Public()
  @ApiOperation({
    summary: "Intercambia un refresh token por un nuevo par access/refresh."
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: "Refresh valido. Devuelve un nuevo access token y refresh rotado."
  })
  @ApiUnauthorizedResponse({
    description: "Refresh token ausente, invalido o expirado."
  })
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Post("logout")
  @Public()
  @ApiOperation({
    summary: "Revoca la sesion asociada a un refresh token."
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: "Sesion revocada."
  })
  @ApiUnauthorizedResponse({
    description: "Refresh token ausente, invalido o expirado."
  })
  @Header("Cache-Control", "no-store")
  @HttpCode(HttpStatus.OK)
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.logout(refreshTokenDto.refreshToken);
  }

  @Get("status")
  @ApiBearerAuth("access-token")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Expone el estado base del modulo de autenticacion." })
  @ApiOkResponse({
    description: "Estado tecnico del modulo auth.",
    schema: {
      type: "object",
      properties: {
        ready: { type: "boolean", example: true },
        usersModuleReady: { type: "boolean", example: true },
        rolesModuleReady: { type: "boolean", example: true },
        userRolesModuleReady: { type: "boolean", example: true }
      }
    }
  })
  @ApiForbiddenResponse({
    description: "Solo administradores pueden consultar el estado tecnico del modulo."
  })
  @Header("Cache-Control", "no-store")
  getStatus() {
    return this.authService.getModuleStatus();
  }

  @Get("me")
  @ApiBearerAuth("access-token")
  @ApiOperation({
    summary: "Devuelve el usuario autenticado actual y sus roles."
  })
  @ApiOkResponse({
    description: "Usuario autenticado.",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        timestamp: {
          type: "string",
          format: "date-time"
        },
        data: {
          type: "object",
          properties: {
            publicId: {
              type: "string",
              format: "uuid"
            },
            firstName: {
              type: "string",
              example: "Juan"
            },
            lastName: {
              type: "string",
              example: "Perez"
            },
            email: {
              type: "string",
              example: "juan.perez@agrogest.com"
            },
            phone: {
              type: "string",
              nullable: true,
              example: "999888777"
            },
            isActive: {
              type: "boolean",
              example: true
            },
            roles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "number",
                    example: 1
                  },
                  code: {
                    type: "string",
                    example: "ADMIN"
                  },
                  name: {
                    type: "string",
                    example: "Administrador"
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    example: "Acceso total al panel"
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: "Token ausente, invalido o expirado."
  })
  @Header("Cache-Control", "no-store")
  getAuthenticatedUser(
    @CurrentAuthUser() accessTokenPayload: AccessTokenPayload
  ) {
    return this.authService.getAuthenticatedUser(accessTokenPayload);
  }
}
