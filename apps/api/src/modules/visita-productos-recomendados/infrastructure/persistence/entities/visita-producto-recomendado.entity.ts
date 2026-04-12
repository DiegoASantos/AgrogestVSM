import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { FrecuenciaAplicacionEntity } from "./frecuencia-aplicacion.entity";
import { ProductoEntity } from "./producto.entity";

@Entity({ name: "visita_productos_recomendados" })
export class VisitaProductoRecomendadoEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "visita_id",
    type: "bigint"
  })
  visitaId!: string;

  @Column({
    name: "producto_id",
    type: "bigint"
  })
  productoId!: string;

  @Column({
    name: "dosis",
    type: "varchar",
    length: 50
  })
  dose!: string;

  @Column({
    name: "frecuencia_aplicacion_id",
    type: "bigint",
    nullable: true
  })
  frecuenciaAplicacionId!: string | null;

  @Column({
    name: "instrucciones",
    type: "text",
    nullable: true
  })
  instructions!: string | null;

  @ManyToOne(
    () => VisitaCampoEntity,
    (visitaCampo) => visitaCampo.productosRecomendados,
    {
      onDelete: "CASCADE",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "visita_id",
    referencedColumnName: "id"
  })
  visita!: VisitaCampoEntity;

  @ManyToOne(
    () => ProductoEntity,
    (producto) => producto.visitaProductosRecomendados,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "producto_id",
    referencedColumnName: "id"
  })
  producto!: ProductoEntity;

  @ManyToOne(
    () => FrecuenciaAplicacionEntity,
    (frecuenciaAplicacion) =>
      frecuenciaAplicacion.visitaProductosRecomendados,
    {
      nullable: true,
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "frecuencia_aplicacion_id",
    referencedColumnName: "id"
  })
  frecuenciaAplicacion!: FrecuenciaAplicacionEntity | null;
}
