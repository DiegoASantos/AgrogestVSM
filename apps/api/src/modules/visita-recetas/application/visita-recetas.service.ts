import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { PlagaEnfermedadEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/plaga-enfermedad.entity";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { NutrienteEntity } from "../../nutricion/infrastructure/persistence/entities/nutriente.entity";
import {
  CreateVisitaRecetaDto,
  type FitosanidadProductoDto,
  type MezclaDto
} from "../presentation/dto/create-visita-receta.dto";
import { FinalizarVisitaRecetaDto } from "../presentation/dto/finalizar-visita-receta.dto";
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
    @InjectRepository(PlagaEnfermedadEntity)
    private readonly plagaEnfermedadRepository: Repository<PlagaEnfermedadEntity>,
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observacionSanitariaRepository: Repository<VisitaObservacionSanitariaEntity>,
    @InjectRepository(VisitaEvaluacionEntity)
    private readonly evaluacionRepository: Repository<VisitaEvaluacionEntity>,
    @InjectRepository(NutrienteEntity)
    private readonly nutrienteRepository: Repository<NutrienteEntity>,
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
    await this.assertRecommendationApproaches(visita, mezclas, dto.fertilizacion);

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

  async finalize(visitaId: string, dto: FinalizarVisitaRecetaDto) {
    const visita = await this.visitaRepository.findOne({ where: { id: visitaId } });
    if (!visita) {
      throw new BadRequestException("Visita de campo not found.");
    }

    const normalizedEnd = dto.endVisitTime.slice(0, 5);
    const normalizedStart = visita.horaVisitaInicio.slice(0, 5);
    if (normalizedEnd < normalizedStart) {
      throw new BadRequestException(
        "La hora de fin debe ser mayor o igual a la hora de inicio."
      );
    }

    assertFinalMixtures(dto);
    const result = await this.save(visitaId, dto);
    visita.horaVisitaFin = normalizedEnd;
    await this.visitaRepository.save(visita);
    return result;
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

    const mezclaIds = await this.createMezclas(saved.id, mezclas);
    await this.createFertilizacion(saved.id, dto.fertilizacion, mezclaIds);

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
    await this.fertilizacionRepository.delete({ recetaId: saved.id });
    await this.mezclaRepository.delete({ recetaId: saved.id });
    await this.riegoRepository.delete({ recetaId: saved.id });
    await this.laborRepository.delete({ recetaId: saved.id });

    const mezclaIds = await this.createMezclas(saved.id, mezclas);
    await this.createFertilizacion(saved.id, dto.fertilizacion, mezclaIds);

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
    const mezclaIds = new Map<number, string>();
    for (const mezcla of mezclas) {
      const savedMezcla = await this.mezclaRepository.save(
        this.mezclaRepository.create({
          recetaId,
          numero: mezcla.numero,
          coadyuvantesIds: mezcla.coadyuvantesIds ?? null,
          coadyuvantesDosis: mezcla.coadyuvantesDosis ?? null,
          ordenMezcla: mezcla.ordenMezcla ?? null,
          volumenAplicacion: mezcla.volumenAplicacion ?? null,
          factor: mezcla.factor,
          factorEditable: mezcla.factorEditable,
          cantidadTotalProducto: mezcla.cantidadTotalProducto ?? null
        })
      );
      mezclaIds.set(mezcla.numero, savedMezcla.id);

      const productos = mezcla.productos.map((item) => {
        const calculatedTotal = calculateTotal(
          item.dosisProducto,
          mezcla.volumenAplicacion,
          mezcla.factor
        );

        return this.fitosanidadRepository.create({
          recetaId,
          mezclaId: savedMezcla.id,
          productoRef:
            item.productoRef ??
            `legacy-${mezcla.numero}-${item.objetivo}-${item.objetivoNombre}-${item.marcaProductoNombre ?? item.ingredienteActivoNombre ?? "producto"}`.slice(
              0,
              100
            ),
          numero: mezcla.numero,
          objetivo: item.objetivo,
          objetivoNombre: item.objetivoNombre,
          enfoque: item.enfoque ?? "reactivo",
          objetivoId: item.objetivoId ? String(item.objetivoId) : null,
          incidenciaGrado: item.incidenciaGrado ?? null,
          severidadGrado: item.severidadGrado ?? null,
          tipoControlId: item.tipoControlId ? String(item.tipoControlId) : null,
          tipoProductoId: item.tipoProductoId ? String(item.tipoProductoId) : null,
          disolvente: item.disolvente ?? "Agua",
          modoAccionId: item.modoAccionId ? String(item.modoAccionId) : null,
          ingredienteActivoNombre: item.ingredienteActivoNombre ?? null,
          dosisProducto: item.dosisProducto ?? null,
          unidadDosis: item.unidadDosis ?? null,
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
    return mezclaIds;
  }

  private async createFertilizacion(
    recetaId: string,
    items: CreateVisitaRecetaDto["fertilizacion"],
    mezclaIds: Map<number, string>
  ) {
    if (!items.length) return;

    const entities = items.map((item) => {
      assertFertilizacionDoseUnit(item);
      return this.fertilizacionRepository.create({
        recetaId,
        mezclaId: item.mezclaNumero ? (mezclaIds.get(item.mezclaNumero) ?? null) : null,
        productoRef:
          item.productoRef ??
          `legacy-fert-${item.fertilizanteNombre ?? "producto"}`.slice(0, 100),
        enfoque: item.enfoque ?? "reactivo",
        nutrienteId: item.nutrienteId ?? null,
        nutrienteNombre:
          (item as typeof item & { nutrienteNombre?: string }).nutrienteNombre ?? null,
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
      });
    });

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
          coadyuvantesDosis: mezcla.coadyuvantesDosis,
          ordenMezcla: mezcla.ordenMezcla,
          volumenAplicacion: mezcla.volumenAplicacion,
          factor: mezcla.factor,
          factorEditable: mezcla.factorEditable,
          cantidadTotalProducto: mezcla.cantidadTotalProducto,
          productos: (mezcla.productos ?? []).map((producto) => ({
            id: producto.id,
            productoRef: producto.productoRef,
            objetivo: producto.objetivo,
            objetivoNombre: producto.objetivoNombre,
            enfoque: producto.enfoque,
            objetivoId: producto.objetivoId,
            incidenciaGrado: producto.incidenciaGrado,
            severidadGrado: producto.severidadGrado,
            tipoControlId: producto.tipoControlId,
            tipoProductoId: producto.tipoProductoId,
            disolvente: producto.disolvente,
            modoAccionId: producto.modoAccionId,
            ingredienteActivoNombre: producto.ingredienteActivoNombre,
            dosisProducto: producto.dosisProducto,
            unidadDosis: producto.unidadDosis,
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
        enfoque: f.enfoque,
        objetivoId: f.objetivoId,
        incidenciaGrado: f.incidenciaGrado,
        severidadGrado: f.severidadGrado,
        tipoControlId: f.tipoControlId,
        tipoProductoId: f.tipoProductoId,
        disolvente: f.disolvente,
        modoAccionId: f.modoAccionId,
        ingredienteActivoNombre: f.ingredienteActivoNombre,
        dosisIa: f.dosisIa,
        unidadDosis: f.unidadDosis,
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
        productoRef: f.productoRef,
        mezclaNumero:
          (receta.mezclas ?? []).find((mezcla) => mezcla.id === f.mezclaId)?.numero ??
          null,
        enfoque: f.enfoque,
        nutrienteId: f.nutrienteId,
        nutrienteNombre: f.nutrienteNombre,
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
        assertSerializedObject(mezcla.coadyuvantesDosis, "coadyuvantesDosis");
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
        unidadDosis: undefined,
        preserveLegacyTotal: true
      });
      grouped.set(key, current);
    }

    return [...grouped.values()];
  }

  private async assertRecommendationApproaches(
    visita: VisitaCampoEntity,
    mezclas: NormalizedMezcla[],
    fertilizacion: CreateVisitaRecetaDto["fertilizacion"]
  ) {
    const products = mezclas.flatMap((mezcla) => mezcla.productos);
    const reactiveTargetIds = new Set(
      products
        .filter((item) => (item.enfoque ?? "reactivo") === "reactivo" && item.objetivoId)
        .map((item) => String(item.objetivoId))
    );
    const reactiveTargetNames = new Set(
      products
        .filter((item) => (item.enfoque ?? "reactivo") === "reactivo")
        .map(
          (item) =>
            `${item.objetivo}::${item.objetivoNombre.trim().toLocaleLowerCase("es")}`
        )
    );
    const targetCache = new Map<string, PlagaEnfermedadEntity>();
    const positiveDiagnosisCache = new Map<string, boolean>();

    for (const mezcla of mezclas) {
      const preventiveProducts = mezcla.productos.filter(
        (item) => item.enfoque === "preventivo"
      );

      if (
        preventiveProducts.length === mezcla.productos.length &&
        (mezcla.factor !== 1 || mezcla.factorEditable)
      ) {
        throw new BadRequestException(
          "Una mezcla exclusivamente preventiva debe usar factor 1 y no ser editable."
        );
      }

      for (const item of preventiveProducts) {
        if (!item.objetivoId || item.incidenciaGrado !== 0 || item.severidadGrado !== 0) {
          throw new BadRequestException(
            "Una recomendacion fitosanitaria preventiva requiere objetivo e incidencia y severidad grado 0."
          );
        }

        const id = String(item.objetivoId);
        let target = targetCache.get(id);
        if (!target) {
          const found = await this.plagaEnfermedadRepository.findOne({
            where: { id, isActive: true }
          });
          if (!found) {
            throw new BadRequestException(
              "La plaga o enfermedad seleccionada para prevencion no esta disponible."
            );
          }
          target = found;
          targetCache.set(id, found);
        }

        if (target.type !== item.objetivo) {
          throw new BadRequestException(
            "El objetivo preventivo no corresponde al tipo de plaga o enfermedad."
          );
        }

        item.objetivoNombre = target.name;
        const targetNameKey = `${target.type}::${target.name.trim().toLocaleLowerCase("es")}`;
        if (reactiveTargetIds.has(id) || reactiveTargetNames.has(targetNameKey)) {
          throw new BadRequestException(
            "Un mismo objetivo no puede recomendarse como reactivo y preventivo en la receta."
          );
        }

        let hasPositiveDiagnosis = positiveDiagnosisCache.get(id);
        if (hasPositiveDiagnosis === undefined) {
          const observation = await this.observacionSanitariaRepository.findOne({
            where: { visitaId: visita.id, plagaEnfermedadId: id },
            relations: ["nivelIncidencia"]
          });
          hasPositiveDiagnosis = Boolean(
            observation &&
            (Number(observation.incidencePercentage ?? 0) > 0 ||
              (observation.nivelIncidencia?.grade ?? 0) > 0)
          );
          positiveDiagnosisCache.set(id, hasPositiveDiagnosis);
        }

        if (hasPositiveDiagnosis) {
          throw new BadRequestException(
            "No se puede registrar como preventivo un objetivo diagnosticado positivamente."
          );
        }
      }
    }

    const approachByNutrient = new Map<string, "reactivo" | "preventivo">();
    const factorByNutrient = new Map<string, number>();
    for (const item of fertilizacion) {
      if (item.enfoque === "preventivo" && (item.factor ?? 1) !== 1) {
        throw new BadRequestException(
          "Una recomendacion de fertilizacion preventiva debe usar factor 1."
        );
      }

      if (!item.nutrienteId) continue;

      const nutrient = await this.nutrienteRepository.findOne({
        where: { id: item.nutrienteId, isActive: true }
      });
      if (!nutrient || nutrient.cultivoId !== visita.cultivoId) {
        throw new BadRequestException(
          "El nutriente seleccionado no esta disponible para el cultivo de la visita."
        );
      }

      const evaluation = await this.evaluacionRepository.findOne({
        where: { visitaId: visita.id, nutrientId: item.nutrienteId }
      });
      const expectedApproach = evaluation ? "reactivo" : "preventivo";
      if ((item.enfoque ?? "reactivo") !== expectedApproach) {
        throw new BadRequestException(
          evaluation
            ? "Un nutriente evaluado en la visita debe recomendarse como curativo."
            : "Un nutriente no evaluado debe recomendarse como preventivo."
        );
      }

      const factor = item.factor ?? 1;
      if (evaluation) {
        const grade = resolveNutritionGrade(Number(evaluation.incidencePercentage ?? 0));
        const expectedFactor = grade >= 3 ? null : grade === 2 ? 1.2 : 1;
        if (expectedFactor !== null && factor !== expectedFactor) {
          throw new BadRequestException(
            "El factor curativo no corresponde a la incidencia nutricional evaluada."
          );
        }
      }

      const previousApproach = approachByNutrient.get(item.nutrienteId);
      if (previousApproach && previousApproach !== expectedApproach) {
        throw new BadRequestException(
          "Un nutriente no puede mezclar enfoques curativo y preventivo."
        );
      }
      approachByNutrient.set(item.nutrienteId, expectedApproach);
      const previousFactor = factorByNutrient.get(item.nutrienteId);
      if (previousFactor !== undefined && previousFactor !== factor) {
        throw new BadRequestException(
          "Los productos de una misma deficiencia deben compartir el factor."
        );
      }
      factorByNutrient.set(item.nutrienteId, factor);
      (item as typeof item & { nutrienteNombre?: string }).nutrienteNombre =
        nutrient.name;
    }
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

function resolveNutritionGrade(percentage: number) {
  if (percentage <= 0) return 0;
  if (percentage <= 5) return 1;
  if (percentage <= 20) return 2;
  return 3;
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

function assertSerializedObject(value: string | undefined, field: string) {
  if (value === undefined) return;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("not-object");
    }
  } catch {
    throw new BadRequestException(`${field} debe contener un objeto JSON valido.`);
  }
}

function assertFertilizacionDoseUnit(
  item: CreateVisitaRecetaDto["fertilizacion"][number]
) {
  if (!item.unidadDosis || !item.tipoProducto) return;

  const [rawUnit, denominator] = item.unidadDosis.split("/");
  const unit = rawUnit?.toLowerCase();
  const allowedUnits = item.tipoProducto === "liquido" ? ["ml", "l"] : ["mg", "g", "kg"];
  const expectedDenominator = item.viaAplicacion === "edafica" ? "planta" : "cilindro";

  if (!unit || !allowedUnits.includes(unit) || denominator !== expectedDenominator) {
    throw new BadRequestException(
      "La unidad de dosis no corresponde al tipo de producto y via de fertilizacion."
    );
  }
}

function assertFinalMixtures(dto: FinalizarVisitaRecetaDto) {
  const mezclas = dto.mezclas ?? [];
  const fitosanidadCount = mezclas.reduce(
    (total, mezcla) => total + mezcla.productos.length,
    0
  );
  const fertilizacionCount = dto.fertilizacion.filter((item) =>
    Boolean(item.fertilizanteNombre?.trim())
  ).length;
  const productCount = fitosanidadCount + fertilizacionCount;

  if (productCount > 0 && mezclas.length === 0) {
    throw new BadRequestException(
      "Registra al menos una mezcla cuando la receta contiene productos."
    );
  }

  const fertilizerCountByMixture = new Map<number, number>();
  for (const item of dto.fertilizacion) {
    if (!item.fertilizanteNombre?.trim()) continue;
    if (!item.mezclaNumero) {
      throw new BadRequestException(
        "Todos los fertilizantes deben estar asignados a una mezcla."
      );
    }
    fertilizerCountByMixture.set(
      item.mezclaNumero,
      (fertilizerCountByMixture.get(item.mezclaNumero) ?? 0) + 1
    );
  }

  for (const mezcla of mezclas) {
    if (
      mezcla.productos.length === 0 &&
      (fertilizerCountByMixture.get(mezcla.numero) ?? 0) === 0
    ) {
      throw new BadRequestException(`La mezcla ${mezcla.numero} no puede quedar vacia.`);
    }

    const refs = [
      ...mezcla.productos.map((item, index) => item.productoRef ?? `fito-${index}`),
      ...dto.fertilizacion
        .filter((item) => item.mezclaNumero === mezcla.numero)
        .map((item, index) => item.productoRef ?? `fert-${index}`)
    ];
    if (new Set(refs).size !== refs.length) {
      throw new BadRequestException(
        `Un producto no puede repetirse dentro de la mezcla ${mezcla.numero}.`
      );
    }

    assertRequiredCoadjuvantDoses(mezcla);
  }
}

function assertRequiredCoadjuvantDoses(mezcla: MezclaDto) {
  const ids = parseStringArray(mezcla.coadyuvantesIds);
  if (ids.length === 0) return;

  const doses = parseStringRecord(mezcla.coadyuvantesDosis);
  const missing = ids.find((id) => !doses[id]?.trim());
  if (missing) {
    throw new BadRequestException(
      `Completa la dosis de todos los coadyuvantes de la mezcla ${mezcla.numero}.`
    );
  }
}

function parseStringArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is string | number =>
              typeof item === "string" || typeof item === "number"
          )
          .map(String)
      : [];
  } catch {
    return [];
  }
}

function parseStringRecord(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}
