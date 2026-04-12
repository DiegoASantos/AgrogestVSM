import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query
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

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { RolesService } from "../application/roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@ApiTags("Roles")
@Roles("ADMIN")
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({ summary: "Crea un rol." })
  @ApiCreatedResponse({
    description: "Rol creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un rol con el mismo codigo o nombre."
  })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createAdmin(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los roles." })
  @ApiOkResponse({
    description: "Lista de roles."
  })
  getRoles(@Query() pagination: PaginationQueryDto) {
    return this.rolesService.findAllAdmin(pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un rol por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Rol encontrado."
  })
  @ApiNotFoundResponse({
    description: "El rol no existe."
  })
  getRoleById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.rolesService.findAdminById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza un rol." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Rol actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un rol con el mismo codigo o nombre."
  })
  @ApiNotFoundResponse({
    description: "El rol no existe."
  })
  updateRole(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto
  ) {
    return this.rolesService.updateAdmin(id, updateRoleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Elimina un rol." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Rol eliminado."
  })
  @ApiConflictResponse({
    description: "El rol esta en uso."
  })
  @ApiNotFoundResponse({
    description: "El rol no existe."
  })
  deleteRole(@Param("id", ParseEntityIdPipe) id: string) {
    return this.rolesService.removeAdmin(id);
  }
}
