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
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { UserRolesService } from "../application/user-roles.service";
import { Roles } from "./decorators/roles.decorator";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { FindUserRolesQueryDto } from "./dto/find-user-roles-query.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

@ApiTags("Usuario Roles")
@Roles("ADMIN")
@Controller("usuario-roles")
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post()
  @ApiOperation({ summary: "Crea una asignacion usuario rol." })
  @ApiCreatedResponse({
    description: "Asignacion creada."
  })
  @ApiConflictResponse({
    description: "La asignacion ya existe."
  })
  createUserRole(@Body() createUserRoleDto: CreateUserRoleDto) {
    return this.userRolesService.createAdmin(createUserRoleDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista asignaciones usuario rol con filtros opcionales."
  })
  @ApiQuery({
    name: "usuario_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "rol_id",
    required: false,
    type: String
  })
  @ApiOkResponse({
    description: "Lista de asignaciones."
  })
  getUserRoles(@Query() query: FindUserRolesQueryDto) {
    return this.userRolesService.findAllAdmin(query, query);
  }

  @Patch(":userId/:roleId")
  @ApiOperation({ summary: "Actualiza una asignacion usuario rol." })
  @ApiParam({
    name: "userId",
    type: String,
    example: "1"
  })
  @ApiParam({
    name: "roleId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Asignacion actualizada."
  })
  @ApiConflictResponse({
    description: "La asignacion destino ya existe."
  })
  @ApiNotFoundResponse({
    description: "La asignacion no existe."
  })
  updateUserRole(
    @Param("userId", ParseEntityIdPipe) userId: string,
    @Param("roleId", ParseEntityIdPipe) roleId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto
  ) {
    return this.userRolesService.updateAdmin(userId, roleId, updateUserRoleDto);
  }

  @Delete(":userId/:roleId")
  @ApiOperation({ summary: "Elimina una asignacion usuario rol." })
  @ApiParam({
    name: "userId",
    type: String,
    example: "1"
  })
  @ApiParam({
    name: "roleId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Asignacion eliminada."
  })
  @ApiNotFoundResponse({
    description: "La asignacion no existe."
  })
  deleteUserRole(
    @Param("userId", ParseEntityIdPipe) userId: string,
    @Param("roleId", ParseEntityIdPipe) roleId: string
  ) {
    return this.userRolesService.removeAdmin(userId, roleId);
  }
}
