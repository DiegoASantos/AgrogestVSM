import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { VisitasCampoService } from "../../visitas-campo/application/visitas-campo.service";
import { VisitaPasoObservacionesService } from "../../visitas-campo/application/visita-paso-observaciones.service";
import { VisitasComercialesService } from "../../visitas-comerciales/application/visitas-comerciales.service";
import { VisitaRecetasService } from "../../visita-recetas/application/visita-recetas.service";
import { PagoCosechaEntity } from "../../comercial/infrastructure/persistence/entities/pago-cosecha.entity";
import { RegistroCosechaEntity } from "../../comercial/infrastructure/persistence/entities/registro-cosecha.entity";
import { AcreedorCosechaEntity } from "../../comercial/infrastructure/persistence/entities/acreedor-cosecha.entity";

const PAGE_SIZE = 50;
type ActivityType = "visita_tecnica" | "visita_comercial" | "pago_cosecha" | "registro_cosecha";
type CursorState = { userId: string; offset: number; snapshot: string; from: string; to: string };
type PageKey = { type: ActivityType; id: string; publicId: string };

@Injectable()
export class MobileRecoveryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly technicalVisits: VisitasCampoService,
    private readonly stepNotes: VisitaPasoObservacionesService,
    private readonly commercialVisits: VisitasComercialesService,
    private readonly recipes: VisitaRecetasService,
    @InjectRepository(PagoCosechaEntity) private readonly payments: Repository<PagoCosechaEntity>,
    @InjectRepository(RegistroCosechaEntity) private readonly harvests: Repository<RegistroCosechaEntity>,
    @InjectRepository(AcreedorCosechaEntity) private readonly creditors: Repository<AcreedorCosechaEntity>
  ) {}

  async getPage(user: AccessTokenPayload, rawCursor?: string) {
    const state = rawCursor ? await this.decodeCursor(rawCursor, user.userId) : this.newState(user.userId);
    const fromAt = `${state.from} 00:00:00-05:00`;
    const untilAt = `${state.to} 23:59:59.999-05:00`;
    const counts = await this.getCounts(user.userId, state, fromAt, untilAt);
    const keys = await this.dataSource.query<PageKey[]>(`
      SELECT tipo AS "type", id::text AS id, public_id AS "publicId" FROM (
        SELECT 'visita_tecnica' AS tipo, id, public_id, fecha_visita::text AS fecha FROM visitas_campo
          WHERE agronomo_usuario_id = $1 AND activo = true AND fecha_visita BETWEEN $2 AND $3 AND creado_at <= $8::timestamptz AND actualizado_at <= $8::timestamptz
        UNION ALL
        SELECT 'visita_comercial', id, public_id, fecha_visita::text FROM visitas_comerciales
          WHERE agronomo_usuario_id = $1 AND activo = true AND fecha_visita BETWEEN $2 AND $3 AND creado_at <= $8::timestamptz AND actualizado_at <= $8::timestamptz
        UNION ALL
        SELECT 'pago_cosecha', id, public_id, creado_at::text FROM pagos_cosecha
          WHERE creado_por_usuario_id = $1 AND creado_at BETWEEN $4::timestamptz AND $5::timestamptz AND creado_at <= $8::timestamptz AND actualizado_at <= $8::timestamptz
        UNION ALL
        SELECT 'registro_cosecha', id, public_id, fecha_registro::text FROM registros_cosecha
          WHERE creado_por_usuario_id = $1 AND fecha_registro BETWEEN $2 AND $3 AND creado_at <= $8::timestamptz AND actualizado_at <= $8::timestamptz
      ) actividad
      ORDER BY tipo ASC, fecha DESC, id DESC
      OFFSET $6 LIMIT $7`,
    [user.userId, state.from, state.to, fromAt, untilAt, state.offset, PAGE_SIZE + 1, state.snapshot]);

    const hasMore = keys.length > PAGE_SIZE;
    const selected = keys.slice(0, PAGE_SIZE);
    const items = await Promise.all(selected.map((key) => this.loadAggregate(key, user)));
    const nextOffset = state.offset + selected.length;
    return {
      window: { from: state.from, to: state.to, timeZone: "America/Lima" },
      counts,
      snapshot: state.snapshot,
      items,
      nextCursor: hasMore ? await this.encodeCursor({ ...state, offset: nextOffset }) : null
    };
  }

  private async getCounts(userId: string, state: CursorState, fromAt: string, untilAt: string) {
    const rows = await this.dataSource.query<Record<string, string>[]>(`
      SELECT
        (SELECT count(*) FROM visitas_campo WHERE agronomo_usuario_id=$1 AND activo=true AND fecha_visita BETWEEN $2 AND $3 AND creado_at <= $6::timestamptz AND actualizado_at <= $6::timestamptz) AS visita_tecnica,
        (SELECT count(*) FROM visitas_comerciales WHERE agronomo_usuario_id=$1 AND activo=true AND fecha_visita BETWEEN $2 AND $3 AND creado_at <= $6::timestamptz AND actualizado_at <= $6::timestamptz) AS visita_comercial,
        (SELECT count(*) FROM pagos_cosecha WHERE creado_por_usuario_id=$1 AND creado_at BETWEEN $4::timestamptz AND $5::timestamptz AND creado_at <= $6::timestamptz AND actualizado_at <= $6::timestamptz) AS pago_cosecha,
        (SELECT count(*) FROM registros_cosecha WHERE creado_por_usuario_id=$1 AND fecha_registro BETWEEN $2 AND $3 AND creado_at <= $6::timestamptz AND actualizado_at <= $6::timestamptz) AS registro_cosecha`,
    [userId, state.from, state.to, fromAt, untilAt, state.snapshot]);
    const row = rows[0];
    return Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, Number(value)]));
  }

  private async loadAggregate(key: PageKey, user: AccessTokenPayload) {
    switch (key.type) {
      case "visita_tecnica": {
        const detail = await this.technicalVisits.getFullDetail(key.id);
        const recipe = await this.recipes.findByVisitaId(key.id);
        const notes = await this.stepNotes.findByVisitaId(key.id);
        return {
          type: key.type,
          id: key.id,
          data: { ...detail.data, stepNotes: notes.data, receta: recipe.data }
        };
      }
      case "visita_comercial":
        return { type: key.type, id: key.id, data: (await this.commercialVisits.get(key.publicId, user)).data };
      case "pago_cosecha":
        return { type: key.type, id: key.id, data: await this.payments.findOneByOrFail({ id: key.id, createdByUserId: user.userId }) };
      case "registro_cosecha": {
        const record = await this.harvests.findOneByOrFail({ id: key.id, createdByUserId: user.userId });
        const creditor = await this.creditors.findOneBy({ id: record.creditorId });
        return { type: key.type, id: key.id, data: { ...record, creditor } };
      }
    }
  }

  private newState(userId: string): CursorState {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
    const today = `${part("year")}-${part("month")}-${part("day")}`;
    const start = new Date(`${today}T12:00:00Z`);
    start.setUTCDate(start.getUTCDate() - 29);
    return { userId, offset: 0, snapshot: new Date().toISOString(), from: start.toISOString().slice(0, 10), to: today };
  }

  private encodeCursor(state: CursorState) {
    return this.jwt.signAsync(state, { expiresIn: "24h", audience: "mobile-recovery" });
  }

  private async decodeCursor(value: string, userId: string): Promise<CursorState> {
    try {
      if (value.length > 2048) throw new Error();
      const parsed = await this.jwt.verifyAsync<CursorState>(value, { audience: "mobile-recovery" });
      if (parsed.userId !== userId || !Number.isSafeInteger(parsed.offset) || parsed.offset < 0 ||
          !Number.isFinite(Date.parse(parsed.snapshot)) || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.from) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(parsed.to)) throw new Error();
      return parsed;
    } catch {
      throw new BadRequestException("El cursor de recuperación no es válido para esta sesión.");
    }
  }
}
