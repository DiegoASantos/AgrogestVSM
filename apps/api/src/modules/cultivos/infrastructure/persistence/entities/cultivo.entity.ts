import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

import { CampaniaEntity } from "../../../../campanias/infrastructure/persistence/entities/campania.entity";
import { VariedadEntity } from "../../../../variedades/infrastructure/persistence/entities/variedad.entity";
import { NutrienteEntity } from "../../../../nutricion/infrastructure/persistence/entities/nutriente.entity";
import { EtapaFenologicaEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/etapa-fenologica.entity";
import { VisitaCampoEntity } from "../../../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";

@Entity({ name: "cultivos" })
export class CultivoEntity {
  @PrimaryGeneratedColumn({
    name: "id",
    type: "bigint"
  })
  id!: string;

  @Column({
    name: "codigo",
    type: "varchar",
    length: 20
  })
  code!: string;

  @Column({
    name: "nombre",
    type: "varchar",
    length: 100
  })
  name!: string;

  @Column({
    name: "activo",
    type: "boolean",
    default: () => "true"
  })
  isActive!: boolean;

  @OneToMany(() => VariedadEntity, (variedad) => variedad.cultivo)
  varieties!: VariedadEntity[];

  @OneToMany(() => CampaniaEntity, (campania) => campania.cultivo)
  campaigns!: CampaniaEntity[];

  @OneToMany(() => EtapaFenologicaEntity, (etapaFenologica) => etapaFenologica.cultivo)
  etapasFenologicas!: EtapaFenologicaEntity[];

  @OneToMany(() => VisitaCampoEntity, (visitaCampo) => visitaCampo.cultivo)
  visitasCampo!: VisitaCampoEntity[];

  @OneToMany(() => NutrienteEntity, (nutriente) => nutriente.cultivo)
  nutrients!: NutrienteEntity[];
}
