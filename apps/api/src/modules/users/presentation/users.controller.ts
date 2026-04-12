import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
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

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { UsersService } from "../application/users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@ApiTags("Usuarios")
@Roles("ADMIN")
@Controller("usuarios")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: "Crea un usuario." })
  @ApiCreatedResponse({
    description: "Usuario creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un usuario con el mismo correo."
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createAdmin(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los usuarios." })
  @ApiOkResponse({
    description: "Lista de usuarios."
  })
  getUsers() {
    return this.usersService.findAllAdmin();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un usuario por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Usuario encontrado."
  })
  @ApiNotFoundResponse({
    description: "El usuario no existe."
  })
  getUserById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.usersService.findAdminById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza un usuario." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Usuario actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un usuario con el mismo correo."
  })
  @ApiNotFoundResponse({
    description: "El usuario no existe."
  })
  updateUser(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.usersService.updateAdmin(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Desactiva logicamente un usuario." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Usuario desactivado."
  })
  @ApiNotFoundResponse({
    description: "El usuario no existe."
  })
  deleteUser(@Param("id", ParseEntityIdPipe) id: string) {
    return this.usersService.removeAdmin(id);
  }
}
