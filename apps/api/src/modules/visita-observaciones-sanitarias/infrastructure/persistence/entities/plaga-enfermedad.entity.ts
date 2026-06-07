import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";

import { EtapaFenologicaEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/etapa-fenologica.entity";
import { VisitaObservacionSanitariaEntity } from "./visita-observacion-sanitaria.entity";

@Entity({ name: "plagas_enfermedades" })
export class PlagaEnfermedadEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "nombre_cientifico",
    type: "varchar",
    length: 160,
    nullable: true
  })
  scientificName!: string | null;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 120
  })
  name!: string;

  @Column({
    name: "tipo",
    type: "varchar",
    length: 20
  })
  type!: string;

  @Column({
    name: "etapa_fenologica_id",
    type: "bigint",
    nullable: true
  })
  etapaFenologicaId!: string | null;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @ManyToOne(
    () => EtapaFenologicaEntity,
    {
      nullable: true,
      onDelete: "SET NULL",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "etapa_fenologica_id",
    referencedColumnName: "id"
  })
  etapaFenologica!: EtapaFenologicaEntity | null;

  @OneToMany(
    () => VisitaObservacionSanitariaEntity,
    (visitaObservacionSanitaria) => visitaObservacionSanitaria.plagaEnfermedad
  )
  visitaObservacionesSanitarias!: VisitaObservacionSanitariaEntity[];
}
