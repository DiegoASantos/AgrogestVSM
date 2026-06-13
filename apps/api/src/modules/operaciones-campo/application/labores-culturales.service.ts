import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { LaborCulturalEntity } from "../infrastructure/persistence/entities/labor-cultural.entity";
import { OperationalCatalogService } from "./operational-catalog.service";

@Injectable()
export class LaboresCulturalesService extends OperationalCatalogService<LaborCulturalEntity> {
  constructor(
    @InjectRepository(LaborCulturalEntity)
    repository: Repository<LaborCulturalEntity>
  ) {
    super(repository, "Labor cultural", "labores_culturales_nombre_key");
  }
}
