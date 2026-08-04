import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import {
  CreateVisitaRecetaDto,
  type FitosanidadProductoDto,
  type MezclaDto
} from "../presentation/dto/create-visita-receta.dto";
import { VisitaRecetaEntity } from "../infrastructure/persistence/entities/visita-receta.entity";
import { VisitaRecetaFitosanidadEntity } from "../infrastructure/persistence/entities/visita-receta-fitosanidad.entity";
import { VisitaRecetaFertilizacionEntity } from "../infrastructure/persistence/entities/visita-receta-fertilizacion.entity";
import { VisitaRecetaRiegoEntity } from "../infrastructure/persistence/entities/visita-receta-riego.entity";
import { VisitaRecetaLaborEntity } from "../infrastructure/persistence/entities/visita-receta-labor.entity";
import { VisitaRecetaHistorialEntity } from "../infrastructure/persistence/entities/visita-receta-historial.entity";
import { VisitaRecetaMezclaEntity } from "../infrastructure/persistence/entities/visita-receta-mezcla.entity";

type NormalizedProducto = FitosanidadProductoDto & { preserveLegacyTotal?: boolean };
type NormalizedMezcla = Omit<MezclaDto, "productos"> & {
  productos: NormalizedProducto[];
};

const RECETA_RELATIONS = [
  "mezclas",
  "mezclas.productos",
  "fitosanidad",
  "fertilizacion",
  "riego",
  "labores"
] as const;

@Injectable()
export class VisitaRecetasService {
  constructor(
    @InjectRepository(VisitaRecetaEntity)
    private readonly recetaRepository: Repository<VisitaRecetaEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitaRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaRecetaFitosanidadEntity)
    private readonly fitosanidadRepository: Repository<VisitaRecetaFitosanidadEntity>,
    @InjectRepository(VisitaRecetaMezclaEntity)
    private readonly mezclaRepository: Repository<VisitaRecetaMezclaEntity>,
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
    const mezclas = this.normalizeMezclas(dto);

    let receta = await this.recetaRepository.findOne({
      where: { visitaId },
      relations: [...RECETA_RELATIONS]
    });

    if (receta) {
      receta = await this.updateReceta(receta, dto, mezclas);
    } else {
      receta = await this.createReceta(visitaId, dto, mezclas);
    }

    const saved = await this.recetaRepository.findOne({
      where: { id: receta.id },
      relations: [...RECETA_RELATIONS]
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
      relations: [...RECETA_RELATIONS]
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

  private async createReceta(
    visitaId: string,
    dto: CreateVisitaRecetaDto,
    mezclas: NormalizedMezcla[]
  ) {
    const receta = this.recetaRepository.create({
      visitaId,
      etapaFenologica: dto.etapaFenologica ?? null,
      version: 1
    });

    const saved = await this.recetaRepository.save(receta);

    await this.createMezclas(saved.id, mezclas);
    await this.createFertilizacion(saved.id, dto.fertilizacion);

    if (dto.riego) {
      await this.createRiego(saved.id, dto.riego);
    }

    await this.createLabores(saved.id, dto.labores);

    const fullReceta = await this.recetaRepository.findOne({
      where: { id: saved.id },
      relations: [...RECETA_RELATIONS]
    });

    if (fullReceta) {
      await this.saveHistorial(fullReceta);
    }

    return saved;
  }

  private async updateReceta(
    receta: VisitaRecetaEntity,
    dto: CreateVisitaRecetaDto,
    mezclas: NormalizedMezcla[]
  ) {
    receta.etapaFenologica = dto.etapaFenologica ?? receta.etapaFenologica;
    receta.version += 1;
    const saved = await this.recetaRepository.save(receta);

    await this.fitosanidadRepository.delete({ recetaId: saved.id });
    await this.mezclaRepository.delete({ recetaId: saved.id });
    await this.fertilizacionRepository.delete({ recetaId: saved.id });
    await this.riegoRepository.delete({ recetaId: saved.id });
    await this.laborRepository.delete({ recetaId: saved.id });

    await this.createMezclas(saved.id, mezclas);
    await this.createFertilizacion(saved.id, dto.fertilizacion);

    if (dto.riego) {
      await this.createRiego(saved.id, dto.riego);
    }

    await this.createLabores(saved.id, dto.labores);

    const fullReceta = await this.recetaRepository.findOne({
      where: { id: saved.id },
      relations: [...RECETA_RELATIONS]
    });

    if (fullReceta) {
      await this.saveHistorial(fullReceta);
    }

    return saved;
  }

  private async createMezclas(recetaId: string, mezclas: NormalizedMezcla[]) {
    for (const mezcla of mezclas) {
      const savedMezcla = await this.mezclaRepository.save(
        this.mezclaRepository.create({
          recetaId,
          numero: mezcla.numero,
          coadyuvantesIds: mezcla.coadyuvantesIds ?? null,
          ordenMezcla: mezcla.ordenMezcla ?? null,
          volumenAplicacion: mezcla.volumenAplicacion ?? null,
          factor: mezcla.factor,
          factorEditable: mezcla.factorEditable,
          cantidadTotalProducto: mezcla.cantidadTotalProducto ?? null
        })
      );

      const productos = mezcla.productos.map((item) => {
        const calculatedTotal = calculateTotal(
          item.dosisProducto,
          mezcla.volumenAplicacion,
          mezcla.factor
        );

        return this.fitosanidadRepository.create({
          recetaId,
          mezclaId: savedMezcla.id,
          numero: mezcla.numero,
          objetivo: item.objetivo,
          objetivoNombre: item.objetivoNombre,
          tipoControlId: item.tipoControlId ? String(item.tipoControlId) : null,
          tipoProductoId: item.tipoProductoId ? String(item.tipoProductoId) : null,
          disolvente: item.disolvente ?? "Agua",
          modoAccionId: item.modoAccionId ? String(item.modoAccionId) : null,
          ingredienteActivoNombre: item.ingredienteActivoNombre ?? null,
          dosisProducto: item.dosisProducto ?? null,
          marcaProductoNombre: item.marcaProductoNombre ?? null,
          concentracionProducto: item.concentracionProducto ?? null,
          cantidadTotalProducto:
            item.preserveLegacyTotal && item.cantidadTotalProducto !== undefined
              ? item.cantidadTotalProducto
              : calculatedTotal,
          // Columnas legacy conservadas durante la ventana de compatibilidad.
          dosisIa: item.dosisProducto ?? null,
          volumenAplicacion: mezcla.volumenAplicacion ?? null,
          cantidadTotalIa: null,
          coadyuvantesIds: mezcla.coadyuvantesIds ?? null,
          ordenMezcla: mezcla.ordenMezcla ?? null
        });
      });

      if (productos.length > 0) {
        await this.fitosanidadRepository.save(productos);
      }
    }
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
        factor: item.factor ?? 1,
        cantidadTotalFertilizante:
          calculateTotal(
            item.dosis,
            item.viaAplicacion === "edafica"
              ? item.cantidadTotalPlantas
              : item.volumenAplicacion,
            item.factor ?? 1
          ) ??
          item.cantidadTotalFertilizante ??
          null
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
      mezclas: (receta.mezclas ?? [])
        .sort((a, b) => a.numero - b.numero)
        .map((mezcla) => ({
          id: mezcla.id,
          numero: mezcla.numero,
          coadyuvantesIds: mezcla.coadyuvantesIds,
          ordenMezcla: mezcla.ordenMezcla,
          volumenAplicacion: mezcla.volumenAplicacion,
          factor: mezcla.factor,
          factorEditable: mezcla.factorEditable,
          cantidadTotalProducto: mezcla.cantidadTotalProducto,
          productos: (mezcla.productos ?? []).map((producto) => ({
            id: producto.id,
            objetivo: producto.objetivo,
            objetivoNombre: producto.objetivoNombre,
            tipoControlId: producto.tipoControlId,
            tipoProductoId: producto.tipoProductoId,
            disolvente: producto.disolvente,
            modoAccionId: producto.modoAccionId,
            ingredienteActivoNombre: producto.ingredienteActivoNombre,
            dosisProducto: producto.dosisProducto,
            marcaProductoNombre: producto.marcaProductoNombre,
            concentracionProducto: producto.concentracionProducto,
            cantidadTotalProducto: producto.cantidadTotalProducto
          }))
        })),
      // Respuesta temporal para clientes instalados antes de la Spec 029.
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
        cantidadTotalFertilizante: f.cantidadTotalFertilizante,
        factor: f.factor
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

  private normalizeMezclas(dto: CreateVisitaRecetaDto): NormalizedMezcla[] {
    if (dto.mezclas) {
      const numeros = new Set<number>();
      for (const mezcla of dto.mezclas) {
        if (numeros.has(mezcla.numero)) {
          throw new BadRequestException(
            `El numero de mezcla ${mezcla.numero} esta duplicado.`
          );
        }
        numeros.add(mezcla.numero);
        assertSerializedArray(mezcla.coadyuvantesIds, "coadyuvantesIds");
        assertSerializedArray(mezcla.ordenMezcla, "ordenMezcla");
      }
      return dto.mezclas;
    }

    const grouped = new Map<string, NormalizedMezcla>();

    for (const item of dto.fitosanidad ?? []) {
      assertSerializedArray(item.coadyuvantesIds, "coadyuvantesIds");
      assertSerializedArray(item.ordenMezcla, "ordenMezcla");
      const key = `${item.numero}::${item.objetivo}::${item.objetivoNombre}`;
      const current = grouped.get(key) ?? {
        numero: item.numero,
        coadyuvantesIds: item.coadyuvantesIds,
        ordenMezcla: item.ordenMezcla,
        volumenAplicacion: item.volumenAplicacion,
        factor: 1,
        factorEditable: false,
        productos: []
      };

      current.productos.push({
        ...item,
        dosisProducto: item.dosisIa,
        preserveLegacyTotal: true
      });
      grouped.set(key, current);
    }

    return [...grouped.values()];
  }
}

function calculateTotal(
  dosis: number | null | undefined,
  volumen: number | null | undefined,
  factor: number
) {
  return dosis !== null &&
    dosis !== undefined &&
    volumen !== null &&
    volumen !== undefined
    ? dosis * volumen * factor
    : null;
}

function assertSerializedArray(value: string | undefined, field: string) {
  if (value === undefined) return;

  try {
    if (!Array.isArray(JSON.parse(value))) {
      throw new Error("not-array");
    }
  } catch {
    throw new BadRequestException(`${field} debe contener un arreglo JSON valido.`);
  }
}
