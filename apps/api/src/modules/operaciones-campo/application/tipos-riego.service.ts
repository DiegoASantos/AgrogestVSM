import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { TipoRiegoEntity } from "../infrastructure/persistence/entities/tipo-riego.entity";
import { OperationalCatalogService } from "./operational-catalog.service";

@Injectable()
export class TiposRiegoService extends OperationalCatalogService<TipoRiegoEntity> {
  constructor(
    @InjectRepository(TipoRiegoEntity)
    repository: Repository<TipoRiegoEntity>
  ) {
    super(repository, "Tipo riego", "tipos_riego_nombre_key");
  }
}
