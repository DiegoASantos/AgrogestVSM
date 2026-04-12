import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "tipos_documento" })
export class TipoDocumentoEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "smallint"
  })
  id!: number;

  @Column({
    name: "codigo",
    type: "varchar",
    length: 10
  })
  code!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 50
  })
  name!: string;
}
