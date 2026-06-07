import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";

import { EtapaFenologicaEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/etapa-fenologica.entity";
import { NivelIncidenciaEntity } from "./nivel-incidencia.entity";
import { PlagaEnfermedadEntity } from "./plaga-enfermedad.entity";

@Entity({ name: "plagas_enfermedades_etapas_niveles" })
export class PlagaEnfermedadEtapaNivelEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "plaga_enfermedad_id",
    type: "bigint"
  })
  plagaEnfermedadId!: string;

  @Column({
    name: "etapa_fenologica_id",
    type: "bigint"
  })
  etapaFenologicaId!: string;

  @Column({
    name: "nivel_incidencia_severidad_id",
    type: "smallint"
  })
  nivelIncidenciaSeveridadId!: number;

  @Column({
    name: "descripcion",
    type: "text",
    nullable: true
  })
  description!: string | null;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @ManyToOne(
    () => PlagaEnfermedadEntity,
    (plagaEnfermedad) => plagaEnfermedad.etapasNiveles,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "plaga_enfermedad_id",
    referencedColumnName: "id"
  })
  plagaEnfermedad!: PlagaEnfermedadEntity;

  @ManyToOne(
    () => EtapaFenologicaEntity,
    (etapaFenologica) => etapaFenologica.plagasEnfermedadesNiveles,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "etapa_fenologica_id",
    referencedColumnName: "id"
  })
  etapaFenologica!: EtapaFenologicaEntity;

  @ManyToOne(
    () => NivelIncidenciaEntity,
    (nivelIncidencia) => nivelIncidencia.plagasEnfermedadesEtapas,
    {
      onDelete: "RESTRICT",
      onUpdate: "NO ACTION"
    }
  )
  @JoinColumn({
    name: "nivel_incidencia_severidad_id",
    referencedColumnName: "id"
  })
  nivelIncidenciaSeveridad!: NivelIncidenciaEntity;
}
