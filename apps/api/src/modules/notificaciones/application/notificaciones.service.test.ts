import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { NotificacionesService } from "./notificaciones.service";

const duplicate = { productorId: "10", fechaVisita: "2026-10-13" };

describe("NotificacionesService", () => {
  it("lists historical duplicates and overdue active person producers for the reader", async () => {
    const query = vi.fn().mockResolvedValue([{
      items: [{ kind: "VISITAS_DUPLICADAS", key: "10:2026-10-13" }],
      unread_count: "2"
    }]);
    const service = new NotificacionesService({ query } as unknown as DataSource);

    const result = await service.list("31", undefined, undefined, "VISITAS_DUPLICADAS");

    expect(query.mock.calls[0][1]).toEqual(["31", 50, 0, "VISITAS_DUPLICADAS"]);
    expect(query.mock.calls[0][0]).toContain("GROUP BY parcela.productor_id, visita.fecha_visita");
    expect(query.mock.calls[0][0]).toContain("jsonb_agg(DISTINCT");
    expect(query.mock.calls[0][0]).toContain("productor.entidad = 'persona' AND productor.activo = true");
    expect(query.mock.calls[0][0]).toContain("notificaciones_visitas_productor_leidas leida");
    expect(result.data).toMatchObject({ unreadCount: 2, nextCursor: "1" });
  });

  it("caps and validates pagination before querying", async () => {
    const query = vi.fn();
    const service = new NotificacionesService({ query } as unknown as DataSource);

    await expect(service.list("31", "51")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list("31", "1", "-1")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.list("31", undefined, undefined, "OTRO")).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it("records a read for the authenticated user only when the group still has two visits", async () => {
    const query = vi.fn().mockResolvedValue([{ usuario_id: "31" }]);
    const service = new NotificacionesService({ query } as unknown as DataSource);

    const result = await service.markRead("31", duplicate);

    expect(query.mock.calls[0][1]).toEqual(["31", "10", "2026-10-13"]);
    expect(query.mock.calls[0][0]).toContain("(SELECT COUNT(*) FROM grupo) >= 2");
    expect(query.mock.calls[0][0]).toContain("notificaciones_visitas_leidas");
    expect(query.mock.calls[0][0]).toContain("ON CONFLICT");
    expect(result.data).toEqual({ read: true });
  });

  it("rejects nonexistent groups and invalid calendar dates", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new NotificacionesService({ query } as unknown as DataSource);

    await expect(service.markRead("31", duplicate)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.markRead("31", { ...duplicate, fechaVisita: "2026-02-30" }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.markRead("31", { ...duplicate, productorId: "9223372036854775808" }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
