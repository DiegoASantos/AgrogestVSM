import { Injectable, NotFoundException } from "@nestjs/common";
import type { QueryRunner } from "typeorm";
import { DataSource } from "typeorm";

import {
  WeatherLinkClient,
  WeatherLinkRequestError
} from "../infrastructure/weatherlink/weatherlink.client";
import { normalizeWeatherLinkPayload } from "../infrastructure/weatherlink/weatherlink.mapper";
import type { WeatherLinkStation } from "../infrastructure/weatherlink/weatherlink.types";

const ADVISORY_LOCK_ID = 330_033;

type StoredStation = {
  id: string;
  publicId: string;
  externalId: string;
  isActive: boolean;
};

@Injectable()
export class WeatherLinkSyncService {
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly client: WeatherLinkClient
  ) {}

  triggerIfDue(force = false): boolean {
    if (!this.client.config.enabled || this.running) return false;
    this.running = true;
    void this.runIfDue(force)
      .catch(() => undefined)
      .finally(() => {
        this.running = false;
      });
    return true;
  }

  async status() {
    const rows = await this.dataSource.query(
      `SELECT
        e.public_id AS "stationId",
        e.nombre AS "stationName",
        e.activo AS "isActive",
        s.estado AS status,
        s.ultimo_dia_completo AS "lastCompleteDay",
        s.ultimo_intento_at AS "lastAttemptAt",
        s.ultimo_exito_at AS "lastSuccessAt",
        s.detalle AS detail
       FROM clima.estaciones_meteorologicas e
       JOIN clima.fuentes_datos f ON f.id = e.fuente_id AND f.codigo = 'weatherlink'
       LEFT JOIN clima.estaciones_estado_sincronizacion s
         ON s.estacion_id = e.id AND s.fuente_id = f.id
       ORDER BY e.nombre`
    );
    return {
      enabled: this.client.config.enabled,
      running: this.running,
      syncHour: this.client.config.dailySyncHour,
      timeZone: this.client.config.timeZone,
      stations: rows
    };
  }

  async setStationActive(publicId: string, isActive: boolean) {
    const rows = await this.dataSource.query(
      `UPDATE clima.estaciones_meteorologicas e
       SET activo = $2, actualizado_at = now()
       FROM clima.fuentes_datos f
       WHERE e.fuente_id = f.id
         AND f.codigo = 'weatherlink'
         AND e.public_id = $1
       RETURNING e.public_id AS "publicId", e.activo AS "isActive"`,
      [publicId, isActive]
    );
    if (!rows[0]) throw new NotFoundException("Estacion WeatherLink no encontrada.");
    return rows[0];
  }

  private async runIfDue(force: boolean): Promise<void> {
    const context = weatherLinkDayContext(
      new Date(),
      this.client.config.timeZone,
      this.client.config.dailySyncHour
    );
    if (!force && !context.afterSyncHour) return;

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    let locked = false;
    try {
      const lockRows = await runner.query("SELECT pg_try_advisory_lock($1) AS locked", [
        ADVISORY_LOCK_ID
      ]);
      locked = lockRows[0]?.locked === true;
      if (!locked) return;
      if (!force && !(await this.needsSync(runner, context.today, context.targetDay))) {
        return;
      }
      await this.sync(runner, context.targetDay);
    } finally {
      if (locked) {
        await runner.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_ID]);
      }
      await runner.release();
    }
  }

  private async needsSync(
    runner: QueryRunner,
    today: string,
    targetDay: string
  ): Promise<boolean> {
    const source = await runner.query(
      "SELECT ultima_consulta_exitosa_at AS latest FROM clima.fuentes_datos WHERE codigo='weatherlink'"
    );
    if (
      !source[0]?.latest ||
      zonedDateKey(new Date(source[0].latest), this.client.config.timeZone) !== today
    ) {
      return true;
    }
    const pending = await runner.query(
      `SELECT count(*)::int AS count
       FROM clima.estaciones_meteorologicas e
       JOIN clima.fuentes_datos f ON f.id=e.fuente_id AND f.codigo='weatherlink'
       LEFT JOIN clima.estaciones_estado_sincronizacion s
         ON s.estacion_id=e.id AND s.fuente_id=f.id
       WHERE e.activo=true AND (s.ultimo_dia_completo IS NULL OR s.ultimo_dia_completo < $1::date)`,
      [targetDay]
    );
    return Number(pending[0]?.count ?? 0) > 0;
  }

  private async sync(runner: QueryRunner, targetDay: string): Promise<void> {
    const startedAt = Date.now();
    const [source] = await runner.query(
      "SELECT id FROM clima.fuentes_datos WHERE codigo='weatherlink'"
    );
    if (!source) return;
    const execution = await runner.query(
      `INSERT INTO clima.ejecuciones_sincronizacion(fuente_id,tipo,estado,detalle)
       VALUES($1,'HISTORICO','EJECUTANDO','Sincronizacion diaria oportunista') RETURNING id`,
      [source.id]
    );
    try {
      const remoteStations = await this.client.stations();
      for (const remote of remoteStations) {
        await this.upsertStation(runner, source.id, remote);
      }
      const stations = (await runner.query(
        `SELECT e.id, e.public_id AS "publicId",
          substring(e.codigo from 13) AS "externalId", e.activo AS "isActive"
         FROM clima.estaciones_meteorologicas e
         WHERE e.fuente_id=$1 ORDER BY e.id`,
        [source.id]
      )) as StoredStation[];

      let stationFailures = 0;
      for (const station of stations.filter((item) => item.isActive)) {
        try {
          await this.syncStation(runner, source.id, station, targetDay);
        } catch (error) {
          stationFailures += 1;
          await this.markStationError(
            runner,
            source.id,
            station.id,
            safeWeatherLinkError(error)
          );
        }
      }

      const pending = await runner.query(
        `SELECT count(*)::int AS count
         FROM clima.estaciones_meteorologicas e
         LEFT JOIN clima.estaciones_estado_sincronizacion s
           ON s.estacion_id=e.id AND s.fuente_id=$1
         WHERE e.fuente_id=$1 AND e.activo=true
           AND (s.ultimo_dia_completo IS NULL OR s.ultimo_dia_completo < $2::date)`,
        [source.id, targetDay]
      );
      const hasPending = Number(pending[0]?.count ?? 0) > 0;
      const isPartial = hasPending || stationFailures > 0;
      await runner.query(
        `UPDATE clima.fuentes_datos SET estado=$2,
          ultima_consulta_exitosa_at=CASE WHEN $3=false THEN now() ELSE ultima_consulta_exitosa_at END,
          ultimo_error=CASE WHEN $3=false THEN NULL ELSE $5 END,
          respuesta_promedio_ms=$4, actualizado_at=now() WHERE id=$1`,
        [
          source.id,
          isPartial ? "DEGRADADA" : "OPERATIVA",
          isPartial,
          Date.now() - startedAt,
          stationFailures > 0
            ? `${stationFailures} estacion(es) con error; se reintentaran`
            : "Recuperacion historica pendiente"
        ]
      );
      await this.finishExecution(
        runner,
        execution[0]?.id,
        isPartial ? "PARCIAL" : "COMPLETADA",
        isPartial
          ? stationFailures > 0
            ? `${stationFailures} estacion(es) fallaron; las demas continuaron`
            : "Quedan dias pendientes para una siguiente apertura"
          : "Datos diarios actualizados"
      );
    } catch (error) {
      const detail = safeWeatherLinkError(error);
      await runner.query(
        "UPDATE clima.fuentes_datos SET estado='DEGRADADA',ultimo_error=$2,actualizado_at=now() WHERE id=$1",
        [source.id, detail]
      );
      await this.finishExecution(runner, execution[0]?.id, "ERROR", detail);
    }
  }

  private async upsertStation(
    runner: QueryRunner,
    sourceId: string,
    remote: WeatherLinkStation
  ): Promise<void> {
    const externalId = String(remote.station_id_uuid ?? remote.station_id ?? "").trim();
    const latitude = finite(remote.latitude);
    const longitude = finite(remote.longitude);
    if (!externalId || latitude === null || longitude === null) return;
    const name = String(remote.station_name ?? `Davis ${externalId}`)
      .trim()
      .slice(0, 150);
    await runner.query(
      `INSERT INTO clima.estaciones_meteorologicas(
        nombre,codigo,tipo,fuente_id,latitud,longitud,altitud_m,estado,activo
      ) VALUES($1,$2,'PROPIA',$3,$4,$5,$6,'OPERATIVA',true)
      ON CONFLICT(codigo) DO UPDATE SET
        nombre=EXCLUDED.nombre, fuente_id=EXCLUDED.fuente_id,
        latitud=EXCLUDED.latitud, longitud=EXCLUDED.longitud,
        altitud_m=EXCLUDED.altitud_m, estado='OPERATIVA', actualizado_at=now()`,
      [
        name,
        `weatherlink:${externalId}`,
        sourceId,
        latitude,
        longitude,
        finite(remote.elevation)
      ]
    );
  }

  private async syncStation(
    runner: QueryRunner,
    sourceId: string,
    station: StoredStation,
    targetDay: string
  ): Promise<void> {
    const state = await runner.query(
      `INSERT INTO clima.estaciones_estado_sincronizacion(fuente_id,estacion_id,estado)
       VALUES($1,$2,'PENDIENTE')
       ON CONFLICT(fuente_id,estacion_id) DO UPDATE SET ultimo_intento_at=now(),actualizado_at=now()
       RETURNING ultimo_dia_completo AS "lastCompleteDay"`,
      [sourceId, station.id]
    );
    const firstDay = state[0]?.lastCompleteDay
      ? addIsoDays(String(state[0].lastCompleteDay).slice(0, 10), 1)
      : addIsoDays(targetDay, -(this.client.config.catchupMaxDays - 1));
    const days = isoDayRange(firstDay, targetDay, this.client.config.catchupMaxDays);
    if (days.length === 0) return;
    await runner.query(
      "UPDATE clima.estaciones_estado_sincronizacion SET estado='SINCRONIZANDO',ultimo_intento_at=now(),detalle=NULL,actualizado_at=now() WHERE fuente_id=$1 AND estacion_id=$2",
      [sourceId, station.id]
    );

    for (const day of days) {
      const nextDay = addIsoDays(day, 1);
      const payload = await this.client.historic(
        station.externalId,
        zonedMidnightEpochSeconds(day, this.client.config.timeZone),
        zonedMidnightEpochSeconds(nextDay, this.client.config.timeZone)
      );
      const readings = normalizeWeatherLinkPayload(payload);
      for (const reading of readings) {
        await runner.query(
          `INSERT INTO clima.lecturas(
            fuente_id,estacion_id,variable,valor,unidad,tipo,dato_at,calidad,modelo
          ) VALUES($1,$2,$3,$4,$5,'OBSERVADO',$6,'VALIDO','WeatherLink v2')
          ON CONFLICT DO NOTHING`,
          [
            sourceId,
            station.id,
            reading.variable,
            reading.value,
            reading.unit,
            reading.dataAt
          ]
        );
      }
      const variables = [...new Set(readings.map((reading) => reading.variable))];
      const lastDataAt = readings.reduce<string | null>(
        (latest, reading) =>
          !latest || reading.dataAt > latest ? reading.dataAt : latest,
        null
      );
      await runner.query(
        `UPDATE clima.estaciones_meteorologicas SET
          variables_json=COALESCE((SELECT jsonb_agg(DISTINCT value ORDER BY value)
            FROM jsonb_array_elements_text(COALESCE(variables_json,'[]'::jsonb) || $2::jsonb)
            AS value),'[]'::jsonb),
          ultima_comunicacion_at=COALESCE(GREATEST(ultima_comunicacion_at,$3::timestamptz),$3::timestamptz),
          actualizado_at=now() WHERE id=$1`,
        [station.id, JSON.stringify(variables), lastDataAt]
      );
      await runner.query(
        `UPDATE clima.estaciones_estado_sincronizacion SET
          estado='COMPLETADA',ultimo_dia_completo=$3::date,ultimo_exito_at=now(),
          detalle=NULL,actualizado_at=now() WHERE fuente_id=$1 AND estacion_id=$2`,
        [sourceId, station.id, day]
      );
    }
  }

  private markStationError(
    runner: QueryRunner,
    sourceId: string,
    stationId: string,
    detail: string
  ) {
    return runner.query(
      `INSERT INTO clima.estaciones_estado_sincronizacion(
        fuente_id,estacion_id,estado,ultimo_intento_at,detalle
       ) VALUES($1,$2,'ERROR',now(),$3)
       ON CONFLICT(fuente_id,estacion_id) DO UPDATE SET
        estado='ERROR',ultimo_intento_at=now(),detalle=EXCLUDED.detalle,
        actualizado_at=now()`,
      [sourceId, stationId, detail]
    );
  }

  private finishExecution(
    runner: QueryRunner,
    id: string | undefined,
    status: string,
    detail: string
  ) {
    if (!id) return Promise.resolve();
    return runner.query(
      "UPDATE clima.ejecuciones_sincronizacion SET estado=$2,detalle=$3,fin_at=now() WHERE id=$1",
      [id, status, detail]
    );
  }
}

export function weatherLinkDayContext(now: Date, timeZone: string, syncHour: number) {
  const parts = zonedParts(now, timeZone);
  const today = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  return {
    today,
    targetDay: addIsoDays(today, -1),
    afterSyncHour: parts.hour >= syncHour
  };
}

export function zonedMidnightEpochSeconds(day: string, timeZone: string): number {
  const [year, month, date] = day.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, date);
  let candidate = guess;
  for (let index = 0; index < 2; index += 1) {
    const parts = zonedParts(new Date(candidate), timeZone);
    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    candidate += guess - represented;
  }
  return Math.floor(candidate / 1000);
}

export function isoDayRange(start: string, end: string, maximum: number): string[] {
  const result: string[] = [];
  let current = start;
  while (current <= end && result.length < maximum) {
    result.push(current);
    current = addIsoDays(current, 1);
  }
  return result;
}

function addIsoDays(day: string, amount: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  return next.toISOString().slice(0, 10);
}

function zonedDateKey(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

function safeWeatherLinkError(error: unknown): string {
  if (error instanceof WeatherLinkRequestError) return error.message.slice(0, 500);
  return "Fallo interno durante la sincronizacion WeatherLink.";
}

function finite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
