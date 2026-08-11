import { describe, expect, it, vi } from "vitest";

import { validateHistoricPayload } from "../infrastructure/weatherlink/weatherlink.client";

import {
  isoDayRange,
  WeatherLinkSyncService,
  weatherLinkDayContext,
  zonedMidnightEpochSeconds
} from "./weatherlink-sync.service";

describe("WeatherLink daily windows", () => {
  it("does not run before 08:00 in Lima and targets yesterday afterwards", () => {
    expect(
      weatherLinkDayContext(new Date("2026-08-11T12:59:59Z"), "America/Lima", 8)
    ).toMatchObject({
      today: "2026-08-11",
      targetDay: "2026-08-10",
      afterSyncHour: false
    });
    expect(
      weatherLinkDayContext(new Date("2026-08-11T13:00:00Z"), "America/Lima", 8)
    ).toMatchObject({ targetDay: "2026-08-10", afterSyncHour: true });
  });

  it("builds exact Lima midnight boundaries and caps catch-up", () => {
    expect(zonedMidnightEpochSeconds("2026-08-10", "America/Lima")).toBe(
      Date.parse("2026-08-10T05:00:00Z") / 1000
    );
    expect(isoDayRange("2026-07-01", "2026-08-10", 30)).toHaveLength(30);
    expect(isoDayRange("2026-08-08", "2026-08-10", 30)).toEqual([
      "2026-08-08",
      "2026-08-09",
      "2026-08-10"
    ]);
  });
});

describe("WeatherLinkSyncService orchestration", () => {
  it("isolates a failed station, preserves its cursor and continues the others", async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const runner = {
      connect: vi.fn(),
      release: vi.fn(),
      query: vi.fn(async (sql: string, params: unknown[] = []) => {
        calls.push({ sql, params });
        if (sql.includes("pg_try_advisory_lock")) return [{ locked: true }];
        if (sql.includes("SELECT id FROM clima.fuentes_datos")) return [{ id: "source" }];
        if (sql.includes("INSERT INTO clima.ejecuciones_sincronizacion")) {
          return [{ id: "execution" }];
        }
        if (sql.includes("SELECT e.id, e.public_id")) {
          return [
            { id: "station-a", publicId: "a", externalId: "a", isActive: true },
            { id: "station-b", publicId: "b", externalId: "b", isActive: true }
          ];
        }
        if (
          sql.includes("INSERT INTO clima.estaciones_estado_sincronizacion") &&
          sql.includes("'PENDIENTE'")
        ) {
          return [{ lastCompleteDay: null }];
        }
        if (sql.includes("SELECT count(*)::int AS count")) return [{ count: 1 }];
        return [];
      })
    };
    const dataSource = { createQueryRunner: () => runner };
    const client = {
      config: {
        enabled: true,
        dailySyncHour: 8,
        timeZone: "America/Lima",
        catchupMaxDays: 1
      },
      stations: vi.fn(async () => [
        { station_id_uuid: "a", station_name: "A", latitude: -4, longitude: -80 },
        { station_id_uuid: "b", station_name: "B", latitude: -5, longitude: -81 }
      ]),
      historic: vi.fn(async (stationId: string) => {
        if (stationId === "a") {
          return validateHistoricPayload({ sensors: [{ data: [{}] }] });
        }
        return {
          sensors: [
            {
              data: [
                { ts: 1_723_500_000, temp_out: 80 },
                { ts: 1_723_400_000, hum_out: 70 }
              ]
            }
          ]
        };
      })
    };
    const service = new WeatherLinkSyncService(dataSource as never, client as never);

    await (service as unknown as { runIfDue(force: boolean): Promise<void> }).runIfDue(
      true
    );

    expect(client.historic).toHaveBeenCalledTimes(2);
    const completed = calls.filter((call) =>
      call.sql.includes("estado='COMPLETADA',ultimo_dia_completo")
    );
    expect(completed).toHaveLength(1);
    expect(completed[0]?.params[1]).toBe("station-b");
    expect(
      calls.some(
        (call) =>
          call.sql.includes("VALUES($1,$2,'ERROR'") &&
          call.params[1] === "station-a" &&
          call.params[2] === "WeatherLink devolvio datos historicos incompletos."
      )
    ).toBe(true);
    expect(
      calls.some(
        (call) =>
          call.sql.includes("UPDATE clima.fuentes_datos SET estado=$2") &&
          call.params[1] === "DEGRADADA"
      )
    ).toBe(true);
    expect(
      calls.some(
        (call) =>
          call.sql.includes("UPDATE clima.ejecuciones_sincronizacion") &&
          call.params[1] === "PARCIAL"
      )
    ).toBe(true);
    const stationCommunication = calls.find((call) =>
      call.sql.includes("ultima_comunicacion_at=COALESCE")
    );
    expect(stationCommunication?.params[2]).toBe(
      new Date(1_723_500_000 * 1000).toISOString()
    );
    expect(runner.release).toHaveBeenCalledOnce();
  });
});
