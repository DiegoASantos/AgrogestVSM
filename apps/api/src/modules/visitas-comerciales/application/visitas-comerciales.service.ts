import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import ExcelJS from "exceljs";
import pdfmake from "pdfmake";
import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { VisitaComercialEntity } from "../infrastructure/persistence/entities/visita-comercial.entity";
import type { CreateVisitaComercialDto } from "../presentation/dto/create-visita-comercial.dto";
import type { FindVisitasComercialesQueryDto } from "../presentation/dto/find-visitas-comerciales-query.dto";
import type { ExportVisitasComercialesQueryDto } from "../presentation/dto/export-visitas-comerciales-query.dto";
import { VisitasCampoService } from "../../visitas-campo/application/visitas-campo.service";
import { ProductoresService } from "../../productores/application/productores.service";

@Injectable()
export class VisitasComercialesService {
  constructor(
    @InjectRepository(VisitaComercialEntity)
    private readonly visits: Repository<VisitaComercialEntity>,
    private readonly technicalVisits: VisitasCampoService,
    private readonly productores: ProductoresService
  ) {}

  async exportExcel(query: ExportVisitasComercialesQueryDto, user: AccessTokenPayload) {
    if (query.fecha_desde > query.fecha_hasta)
      throw new BadRequestException(
        "La fecha hasta debe ser posterior a la fecha desde."
      );
    const workbook = new ExcelJS.Workbook();
    const type = query.tipo ?? "GENERAL";
    if (type !== "COMERCIAL") {
      const technical = await this.technicalVisits.exportExcelReport(query, user);
      await workbook.xlsx.load(
        technical.content as unknown as Parameters<typeof workbook.xlsx.load>[0]
      );
      if (type === "GENERAL") workbook.worksheets[0].name = "Técnica";
    }
    if (type !== "TECNICA") {
      const qb = this.visits
        .createQueryBuilder("v")
        .leftJoinAndSelect("v.agronomoUsuario", "u")
        .where("v.activo = true")
        .andWhere("v.fecha_visita BETWEEN :desde AND :hasta", {
          desde: query.fecha_desde,
          hasta: query.fecha_hasta
        });
      if (query.agronomo_usuario_id)
        qb.andWhere("v.agronomo_usuario_id = :agronomo", {
          agronomo: query.agronomo_usuario_id
        });
      const visits = await qb
        .orderBy("v.fecha_visita", "ASC")
        .addOrderBy("v.id", "ASC")
        .getMany();
      const sheet = workbook.addWorksheet("Comercial");
      sheet.columns = [
        { header: "Fecha", key: "fecha", width: 15 },
        { header: "Tipo de productor", key: "tipo", width: 20 },
        { header: "Nombre", key: "nombre", width: 25 },
        { header: "Apellidos", key: "apellidos", width: 25 },
        { header: "Descripción", key: "descripcion", width: 65 },
        { header: "Agrónomo", key: "agronomo", width: 30 },
        { header: "Latitud", key: "latitud", width: 15 },
        { header: "Longitud", key: "longitud", width: 15 }
      ];
      for (const visit of visits)
        sheet.addRow({
          fecha: visit.fechaVisita,
          tipo: visit.tipoSujeto,
          nombre: visit.nombres,
          apellidos: visit.apellidos ?? "",
          descripcion: visit.descripcion,
          agronomo: visit.agronomoUsuario
            ? `${visit.agronomoUsuario.firstName} ${visit.agronomoUsuario.lastName}`.trim()
            : "",
          latitud: visit.ubicacionVisita?.coordinates[1] ?? "",
          longitud: visit.ubicacionVisita?.coordinates[0] ?? ""
        });
      sheet.getRow(1).font = { bold: true };
      sheet.autoFilter = { from: "A1", to: "H1" };
    }
    return {
      fileName: `visitas_${type.toLowerCase()}_${query.fecha_desde}_${query.fecha_hasta}.xlsx`,
      content: Buffer.from(await workbook.xlsx.writeBuffer())
    };
  }

  async exportPdf(publicId: string, user: AccessTokenPayload) {
    const response = await this.get(publicId, user);
    const visit = response.data;
    pdfmake.addFonts({
      Roboto: {
        normal: require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"),
        bold: require.resolve("pdfmake/fonts/Roboto/Roboto-Medium.ttf"),
        italics: require.resolve("pdfmake/fonts/Roboto/Roboto-Italic.ttf"),
        bolditalics: require.resolve("pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf")
      }
    });
    const pdf = pdfmake.createPdf({
      defaultStyle: { font: "Roboto", fontSize: 11 },
      content: [
        { text: "Visita comercial", style: "title" },
        { text: `Fecha: ${visit.fechaVisita}` },
        { text: `Tipo de productor: ${visit.tipoSujeto}` },
        { text: `Nombre: ${[visit.nombres, visit.apellidos].filter(Boolean).join(" ")}` },
        { text: `Agrónomo: ${visit.agronomoNombre ?? visit.agronomoUsuarioId}` },
        { text: "Descripción", style: "section" },
        { text: visit.descripcion },
        {
          text: visit.ubicacionVisita
            ? `Ubicación: ${visit.ubicacionVisita.coordinates[1]}, ${visit.ubicacionVisita.coordinates[0]}`
            : "Ubicación: no disponible"
        }
      ],
      styles: {
        title: { fontSize: 18, bold: true, color: "#165b40", margin: [0, 0, 0, 18] },
        section: { fontSize: 12, bold: true, margin: [0, 16, 0, 6] }
      }
    });
    return {
      fileName: `visita-comercial-${visit.fechaVisita}-${visit.publicId}.pdf`,
      content: await pdf.getBuffer()
    };
  }

  async create(dto: CreateVisitaComercialDto, user: AccessTokenPayload) {
    this.validate(dto);
    const existing = await this.visits.findOne({ where: { publicId: dto.publicId } });
    if (existing) {
      if (existing.agronomoUsuarioId !== user.userId)
        throw new ConflictException("La visita pertenece a otro usuario.");
      return createSuccessResponse(this.toResponse(existing));
    }
    if (dto.productorId) {
      const selected = (await this.productores.findById(dto.productorId, user)).data;
      const subjectType = selected.entityType === "asociacion" ? "ASOCIATIVA" : selected.entityType.toUpperCase();
      if (subjectType !== dto.tipoSujeto) {
        throw new BadRequestException("El tipo de la visita no coincide con el productor.");
      }
    }
    try {
      const saved = await this.visits.save(
        this.visits.create({
          publicId: dto.publicId,
          agronomoUsuarioId: user.userId,
          productorId: dto.productorId ?? null,
          tipoSujeto: dto.tipoSujeto,
          nombres: dto.nombres.trim(),
          apellidos:
            dto.tipoSujeto === "PERSONA" || dto.tipoSujeto === "RECORREDOR"
              ? dto.apellidos!.trim()
              : null,
          descripcion: dto.descripcion.trim(),
          fechaVisita: dto.fechaVisita,
          ubicacionVisita: dto.ubicacionVisita ?? null,
          activo: true
        })
      );
      return createSuccessResponse(this.toResponse(saved));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { driverError?: { code?: string } }).driverError
          ?.code === "23505"
      ) {
        const concurrent = await this.visits.findOne({
          where: { publicId: dto.publicId }
        });
        if (concurrent?.agronomoUsuarioId === user.userId)
          return createSuccessResponse(this.toResponse(concurrent));
      }
      throw error;
    }
  }

  async list(query: FindVisitasComercialesQueryDto, user: AccessTokenPayload) {
    if (query.fecha_desde && query.fecha_hasta && query.fecha_desde > query.fecha_hasta)
      throw new BadRequestException(
        "La fecha hasta debe ser posterior a la fecha desde."
      );
    const admin = user.roles.includes("ADMIN") || user.roles.includes("ANALISTA");
    const qb = this.visits
      .createQueryBuilder("v")
      .leftJoinAndSelect("v.agronomoUsuario", "u")
      .where("v.activo = true");
    if (!admin) qb.andWhere("v.agronomo_usuario_id = :owner", { owner: user.userId });
    if (query.agronomo_usuario_id && admin)
      qb.andWhere("v.agronomo_usuario_id = :agronomist", {
        agronomist: query.agronomo_usuario_id
      });
    if (query.fecha_desde)
      qb.andWhere("v.fecha_visita >= :from", { from: query.fecha_desde });
    if (query.fecha_hasta)
      qb.andWhere("v.fecha_visita <= :to", { to: query.fecha_hasta });
    const [items, total] = await qb
      .orderBy("v.fecha_visita", "DESC")
      .addOrderBy("v.id", "DESC")
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 20))
      .take(query.limit ?? 20)
      .getManyAndCount();
    return createSuccessResponse(
      items.map((item) => this.toResponse(item)),
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async get(publicId: string, user: AccessTokenPayload) {
    const item = await this.visits.findOne({
      where: { publicId, activo: true },
      relations: { agronomoUsuario: true }
    });
    if (
      !item ||
      (!user.roles.includes("ADMIN") &&
        !user.roles.includes("ANALISTA") &&
        item.agronomoUsuarioId !== user.userId)
    )
      throw new NotFoundException("Visita comercial no encontrada.");
    return createSuccessResponse(this.toResponse(item));
  }

  private validate(dto: CreateVisitaComercialDto) {
    if (!dto.nombres?.trim() || !dto.descripcion?.trim())
      throw new BadRequestException("Nombre y descripción son obligatorios.");
    const person = dto.tipoSujeto === "PERSONA" || dto.tipoSujeto === "RECORREDOR";
    if (person && !dto.apellidos?.trim())
      throw new BadRequestException("Ingresa apellidos para esta visita.");
    if (!person && dto.apellidos?.trim())
      throw new BadRequestException("Este tipo de sujeto se registra solo con nombre.");
    const point = dto.ubicacionVisita;
    if (
      point &&
      (point.type !== "Point" ||
        !Array.isArray(point.coordinates) ||
        point.coordinates.length !== 2 ||
        !point.coordinates.every(Number.isFinite) ||
        Math.abs(point.coordinates[0]) > 180 ||
        Math.abs(point.coordinates[1]) > 90)
    )
      throw new BadRequestException("Ubicación no válida.");
  }

  private toResponse(item: VisitaComercialEntity) {
    return {
      id: item.id,
      publicId: item.publicId,
      tipoVisita: "COMERCIAL" as const,
      tipoSujeto: item.tipoSujeto,
      nombres: item.nombres,
      apellidos: item.apellidos,
      descripcion: item.descripcion,
      fechaVisita: item.fechaVisita,
      ubicacionVisita: item.ubicacionVisita,
      agronomoUsuarioId: item.agronomoUsuarioId,
      productorId: item.productorId,
      agronomoNombre: item.agronomoUsuario
        ? `${item.agronomoUsuario.firstName} ${item.agronomoUsuario.lastName}`.trim()
        : null,
      creadoAt: item.creadoAt,
      actualizadoAt: item.actualizadoAt
    };
  }
}
