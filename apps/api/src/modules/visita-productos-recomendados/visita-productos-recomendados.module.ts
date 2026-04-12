import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { VisitaCampoEntity } from "../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { IngredientesActivosService } from "./application/ingredientes-activos.service";
import { ProductCatalogsService } from "./application/product-catalogs.service";
import { ProductoIngredientesService } from "./application/producto-ingredientes.service";
import { ProductosService } from "./application/productos.service";
import { VisitaProductosRecomendadosService } from "./application/visita-productos-recomendados.service";
import { FrecuenciaAplicacionEntity } from "./infrastructure/persistence/entities/frecuencia-aplicacion.entity";
import { IngredienteActivoEntity } from "./infrastructure/persistence/entities/ingrediente-activo.entity";
import { ProductoIngredienteEntity } from "./infrastructure/persistence/entities/producto-ingrediente.entity";
import { ProductoEntity } from "./infrastructure/persistence/entities/producto.entity";
import { VisitaProductoRecomendadoEntity } from "./infrastructure/persistence/entities/visita-producto-recomendado.entity";
import { FrecuenciasAplicacionController } from "./presentation/frecuencias-aplicacion.controller";
import { IngredientesActivosController } from "./presentation/ingredientes-activos.controller";
import { ProductoIngredientesController } from "./presentation/producto-ingredientes.controller";
import { ProductosController } from "./presentation/productos.controller";
import { VisitaCampoProductosRecomendadosController } from "./presentation/visita-campo-productos-recomendados.controller";
import { VisitaProductosRecomendadosController } from "./presentation/visita-productos-recomendados.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitaCampoEntity,
      VisitaProductoRecomendadoEntity,
      ProductoEntity,
      FrecuenciaAplicacionEntity,
      IngredienteActivoEntity,
      ProductoIngredienteEntity
    ])
  ],
  controllers: [
    ProductosController,
    IngredientesActivosController,
    ProductoIngredientesController,
    FrecuenciasAplicacionController,
    VisitaCampoProductosRecomendadosController,
    VisitaProductosRecomendadosController
  ],
  providers: [
    ProductCatalogsService,
    ProductosService,
    IngredientesActivosService,
    ProductoIngredientesService,
    VisitaProductosRecomendadosService
  ],
  exports: [
    TypeOrmModule,
    ProductCatalogsService,
    ProductosService,
    IngredientesActivosService,
    ProductoIngredientesService,
    VisitaProductosRecomendadosService
  ]
})
export class VisitaProductosRecomendadosModule {}
