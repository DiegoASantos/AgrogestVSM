import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { DepartamentoEntity } from "../infrastructure/persistence/entities/departamento.entity";
import { DistritoEntity } from "../infrastructure/persistence/entities/distrito.entity";
import { ProvinciaEntity } from "../infrastructure/persistence/entities/provincia.entity";

@Injectable()
export class GeografiasService {
  constructor(
    @InjectRepository(DepartamentoEntity)
    private readonly departamentosRepository: Repository<DepartamentoEntity>,
    @InjectRepository(ProvinciaEntity)
    private readonly provinciasRepository: Repository<ProvinciaEntity>,
    @InjectRepository(DistritoEntity)
    private readonly distritosRepository: Repository<DistritoEntity>
  ) {}

  async findDepartamentos() {
    const items = await this.departamentosRepository.find({ order: { name: "ASC" } });
    return createSuccessResponse(items.map(toDepartamentoResponse), { count: items.length });
  }

  async findProvinciasByDepartamentoId(departamentoId: string) {
    await this.ensureDepartamentoExists(departamentoId);
    const items = await this.provinciasRepository.find({
      where: { departamentoId },
      order: { name: "ASC" }
    });
    return createSuccessResponse(items.map(toProvinciaResponse), { count: items.length });
  }

  async findDistritosByProvinciaId(provinciaId: string) {
    await this.ensureProvinciaExists(provinciaId);
    const items = await this.distritosRepository.find({
      where: { provinciaId },
      order: { name: "ASC" }
    });
    return createSuccessResponse(items.map(toDistritoResponse), { count: items.length });
  }

  async findDistritos() {
    const items = await this.distritosRepository.find({
      relations: { provincia: { departamento: true } },
      order: { name: "ASC" }
    });
    return createSuccessResponse(items.map(toDistritoDetailResponse), {
      count: items.length
    });
  }

  private async ensureDepartamentoExists(id: string) {
    if (!(await this.departamentosRepository.exist({ where: { id } }))) {
      throw new NotFoundException("Departamento not found.");
    }
  }

  private async ensureProvinciaExists(id: string) {
    if (!(await this.provinciasRepository.exist({ where: { id } }))) {
      throw new NotFoundException("Provincia not found.");
    }
  }
}

function toDepartamentoResponse(item: DepartamentoEntity) {
  return { id: item.id, code: item.code, name: item.name };
}

function toProvinciaResponse(item: ProvinciaEntity) {
  return {
    id: item.id,
    departamentoId: item.departamentoId,
    code: item.code,
    name: item.name
  };
}

function toDistritoResponse(item: DistritoEntity) {
  return { id: item.id, provinciaId: item.provinciaId, ubigeo: item.ubigeo, name: item.name };
}

function toDistritoDetailResponse(item: DistritoEntity) {
  return {
    ...toDistritoResponse(item),
    provincia: {
      ...toProvinciaResponse(item.provincia),
      departamento: toDepartamentoResponse(item.provincia.departamento)
    }
  };
}
