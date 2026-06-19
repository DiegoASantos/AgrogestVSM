import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { CreateVisitaRecetaDto } from "../presentation/dto/create-visita-receta.dto";
import { VisitaRecetaEntity } from "../infrastructure/persistence/entities/visita-receta.entity";
import { VisitaRecetaFitosanidadEntity } from "../infrastructure/persistence/entities/visita-receta-fitosanidad.entity";
import { VisitaRecetaFertilizacionEntity } from "../infrastructure/persistence/entities/visita-receta-fertilizacion.entity";
import { VisitaRecetaRiegoEntity } from "../infrastructure/persistence/entities/visita-receta-riego.entity";
import { VisitaRecetaLaborEntity } from "../infrastructure/persistence/entities/visita-receta-labor.entity";
import { VisitaRecetaHistorialEntity } from "../infrastructure/persistence/entities/visita-receta-historial.entity";

@Injectable()
export class VisitaRecetasService {
  constructor(
    @InjectRepository(VisitaRecetaEntity)
    private readonly recetaRepository: Repository<VisitaRecetaEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitaRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaRecetaFitosanidadEntity)
    private readonly fitosanidadRepository: Repository<VisitaRecetaFitosanidadEntity>,
    @InjectRepository(VisitaRecetaFertilizacionEntity)
    private readonly fertilizacionRepository: Repository<VisitaRecetaFertilizacionEntity>,
    @InjectRepository(VisitaRecetaRiegoEntity)
    private readonly riegoRepository: Repository<VisitaRecetaRiegoEntity>,
    @InjectRepository(VisitaRecetaLaborEntity)
    private readonly laborRepository: Repository<VisitaRecetaLaborEntity>,
    @InjectRepository(VisitaRecetaHistorialEntity)
    private readonly historialRepository: Repository<VisitaRecetaHistorialEntity>
  ) {}

  async save(visitaId: string, dto: CreateVisitaRecetaDto) {
    const visita = await this.visitaRepository.findOne({
      where: { id: visitaId }
    });

    if (!visita) {
      throw new BadRequestException("Visita de campo not found.");
    }

    let receta = await this.recetaRepository.findOne({
      where: { visitaId },
      relations: ["fitosanidad", "fertilizacion", "riego", "labores"]
    });

    if (receta) {
      receta = await this.updateReceta(receta, dto);
    } else {
      receta = await this.createReceta(visitaId, dto);
    }

    const saved = await this.recetaRepository.findOne({
      where: { id: receta.id },
      relations: ["fitosanidad", "fertilizacion", "riego", "labores"]
    });

    if (!saved) {
      throw new NotFoundException("Receta not found after save.");
    }

    return createSuccessResponse(this.toResponse(saved));
  }

  async findByVisitaId(visitaId: string) {
    const visita = await this.visitaRepository.findOne({
      where: { id: visitaId }
    });

    if (!visita) {
      throw new NotFoundException("Visita de campo not found.");
    }

    const receta = await this.recetaRepository.findOne({
      where: { visitaId },
      relations: ["fitosanidad", "fertilizacion", "riego", "labores"]
    });

    return createSuccessResponse(receta ? this.toResponse(receta) : null);
  }

  async getHistorial(visitaId: string) {
    const receta = await this.recetaRepository.findOne({
      where: { visitaId }
    });

    if (!receta) {
      return createSuccessResponse([]);
    }

    const historial = await this.historialRepository.find({
      where: { recetaId: receta.id },
      order: { version: "ASC" }
    });

    return createSuccessResponse(
      historial.map((h) => ({
        id: h.id,
        version: h.version,
        snapshot: h.snapshot,
        createdAt: h.createdAt.toISOString()
      }))
    );
  }

  private async createReceta(visitaId: string, dto: CreateVisitaRecetaDto) {
    const receta = this.recetaRepository.create({
      visitaId,
      etapaFenologica: dto.etapaFenologica ?? null,
      version: 1
    });

    const saved = await this.recetaRepository.save(receta);

    await this.createFitosanidad(saved.id, dto.fitosanidad);
    await this.createFertilizacion(saved.id, dto.fertilizacion);

    if (dto.riego) {
      await this.createRiego(saved.id, dto.riego);
    }

    await this.createLabores(saved.id, dto.labores);

    const fullReceta = await this.recetaRepository.findOne({
      where: { id: saved.id },
      relations: ["fitosanidad", "fertilizacion", "riego", "labores"]
    });

    if (fullReceta) {
      await this.saveHistorial(fullReceta);
    }

    return saved;
  }

  private async updateReceta(
    receta: VisitaRecetaEntity,
    dto: CreateVisitaRecetaDto
  ) {
    receta.etapaFenologica = dto.etapaFenologica ?? receta.etapaFenologica;
    receta.version += 1;
    const saved = await this.recetaRepository.save(receta);

    await this.fitosanidadRepository.delete({ recetaId: saved.id });
    await this.fertilizacionRepository.delete({ recetaId: saved.id });
    await this.riegoRepository.delete({ recetaId: saved.id });
    await this.laborRepository.delete({ recetaId: saved.id });

    await this.createFitosanidad(saved.id, dto.fitosanidad);
    await this.createFertilizacion(saved.id, dto.fertilizacion);

    if (dto.riego) {
      await this.createRiego(saved.id, dto.riego);
    }

    await this.createLabores(saved.id, dto.labores);

    const fullReceta = await this.recetaRepository.findOne({
      where: { id: saved.id },
      relations: ["fitosanidad", "fertilizacion", "riego", "labores"]
    });

    if (fullReceta) {
      await this.saveHistorial(fullReceta);
    }

    return saved;
  }

  private async createFitosanidad(
    recetaId: string,
    items: CreateVisitaRecetaDto["fitosanidad"]
  ) {
    if (!items.length) return;

    const entities = items.map((item) =>
      this.fitosanidadRepository.create({
        recetaId,
        numero: item.numero,
        objetivo: item.objetivo,
        objetivoNombre: item.objetivoNombre,
        tipoControlId: item.tipoControlId ? String(item.tipoControlId) : null,
        tipoProductoId: item.tipoProductoId ? String(item.tipoProductoId) : null,
        disolvente: item.disolvente ?? "Agua",
        modoAccionId: item.modoAccionId ? String(item.modoAccionId) : null,
        ingredienteActivoNombre: item.ingredienteActivoNombre ?? null,
        dosisIa: item.dosisIa ?? null,
        volumenAplicacion: item.volumenAplicacion ?? null,
        cantidadTotalIa: item.cantidadTotalIa ?? null,
        marcaProductoNombre: item.marcaProductoNombre ?? null,
        concentracionProducto: item.concentracionProducto ?? null,
        cantidadTotalProducto: item.cantidadTotalProducto ?? null,
        coadyuvantesIds: item.coadyuvantesIds ?? null,
        ordenMezcla: item.ordenMezcla ?? null
      })
    );

    await this.fitosanidadRepository.save(entities);
  }

  private async createFertilizacion(
    recetaId: string,
    items: CreateVisitaRecetaDto["fertilizacion"]
  ) {
    if (!items.length) return;

    const entities = items.map((item) =>
      this.fertilizacionRepository.create({
        recetaId,
        viaAplicacion: item.viaAplicacion,
        fertilizanteNombre: item.fertilizanteNombre ?? null,
        tipoProducto: item.tipoProducto ?? null,
        dosis: item.dosis ?? null,
        unidadDosis: item.unidadDosis ?? null,
        cantidadTotalPlantas: item.cantidadTotalPlantas ?? null,
        volumenAplicacion: item.volumenAplicacion ?? null,
        cantidadTotalFertilizante: item.cantidadTotalFertilizante ?? null
      })
    );

    await this.fertilizacionRepository.save(entities);
  }

  private async createRiego(
    recetaId: string,
    riego: NonNullable<CreateVisitaRecetaDto["riego"]>
  ) {
    const entity = this.riegoRepository.create({
      recetaId,
      tipoRecomendacion: riego.tipoRecomendacion
    });

    await this.riegoRepository.save(entity);
  }

  private async createLabores(
    recetaId: string,
    labores: CreateVisitaRecetaDto["labores"]
  ) {
    if (!labores.length) return;

    const entities = labores.map((labor) =>
      this.laborRepository.create({
        recetaId,
        labor: labor.labor
      })
    );

    await this.laborRepository.save(entities);
  }

  private async saveHistorial(receta: VisitaRecetaEntity) {
    const snapshot = this.toResponse(receta);

    const entity = this.historialRepository.create({
      recetaId: receta.id,
      version: receta.version,
      snapshot: snapshot as unknown as Record<string, unknown>
    });

    await this.historialRepository.save(entity);
  }

  private toResponse(receta: VisitaRecetaEntity) {
    return {
      id: receta.id,
      visitaId: receta.visitaId,
      etapaFenologica: receta.etapaFenologica,
      version: receta.version,
      fitosanidad: (receta.fitosanidad ?? []).map((f) => ({
        id: f.id,
        numero: f.numero,
        objetivo: f.objetivo,
        objetivoNombre: f.objetivoNombre,
        tipoControlId: f.tipoControlId,
        tipoProductoId: f.tipoProductoId,
        disolvente: f.disolvente,
        modoAccionId: f.modoAccionId,
        ingredienteActivoNombre: f.ingredienteActivoNombre,
        dosisIa: f.dosisIa,
        volumenAplicacion: f.volumenAplicacion,
        cantidadTotalIa: f.cantidadTotalIa,
        marcaProductoNombre: f.marcaProductoNombre,
        concentracionProducto: f.concentracionProducto,
        cantidadTotalProducto: f.cantidadTotalProducto,
        coadyuvantesIds: f.coadyuvantesIds,
        ordenMezcla: f.ordenMezcla
      })),
      fertilizacion: (receta.fertilizacion ?? []).map((f) => ({
        id: f.id,
        viaAplicacion: f.viaAplicacion,
        fertilizanteNombre: f.fertilizanteNombre,
        tipoProducto: f.tipoProducto,
        dosis: f.dosis,
        unidadDosis: f.unidadDosis,
        cantidadTotalPlantas: f.cantidadTotalPlantas,
        volumenAplicacion: f.volumenAplicacion,
        cantidadTotalFertilizante: f.cantidadTotalFertilizante
      })),
      riego: receta.riego
        ? {
            id: receta.riego.id,
            tipoRecomendacion: receta.riego.tipoRecomendacion
          }
        : null,
      labores: (receta.labores ?? []).map((l) => ({
        id: l.id,
        labor: l.labor
      })),
      createdAt: receta.createdAt?.toISOString(),
      updatedAt: receta.updatedAt?.toISOString()
    };
  }
}
