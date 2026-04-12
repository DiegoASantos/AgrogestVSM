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
import { IngredientesActivosService } from "../application/ingredientes-activos.service";
import { CreateIngredienteActivoDto } from "./dto/create-ingrediente-activo.dto";
import { UpdateIngredienteActivoDto } from "./dto/update-ingrediente-activo.dto";

@ApiTags("Ingredientes Activos")
@Controller("ingredientes-activos")
export class IngredientesActivosController {
  constructor(
    private readonly ingredientesActivosService: IngredientesActivosService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un ingrediente activo." })
  @ApiCreatedResponse({
    description: "Ingrediente activo creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un ingrediente activo con el mismo nombre."
  })
  createIngredienteActivo(
    @Body() createIngredienteActivoDto: CreateIngredienteActivoDto
  ) {
    return this.ingredientesActivosService.create(createIngredienteActivoDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los ingredientes activos." })
  @ApiOkResponse({
    description: "Lista de ingredientes activos."
  })
  getIngredientesActivos() {
    return this.ingredientesActivosService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un ingrediente activo por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Ingrediente activo encontrado."
  })
  @ApiNotFoundResponse({
    description: "El ingrediente activo no existe."
  })
  getIngredienteActivoById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.ingredientesActivosService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un ingrediente activo." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Ingrediente activo actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un ingrediente activo con el mismo nombre."
  })
  @ApiNotFoundResponse({
    description: "El ingrediente activo no existe."
  })
  updateIngredienteActivo(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateIngredienteActivoDto: UpdateIngredienteActivoDto
  ) {
    return this.ingredientesActivosService.update(
      id,
      updateIngredienteActivoDto
    );
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Desactiva logicamente un ingrediente activo." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Ingrediente activo desactivado."
  })
  @ApiNotFoundResponse({
    description: "El ingrediente activo no existe."
  })
  deleteIngredienteActivo(@Param("id", ParseEntityIdPipe) id: string) {
    return this.ingredientesActivosService.remove(id);
  }
}
