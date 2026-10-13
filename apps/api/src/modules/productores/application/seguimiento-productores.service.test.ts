import { describe, expect, it, vi } from "vitest";
import type { DataSource } from "typeorm";

import { SeguimientoProductoresService } from "./seguimiento-productores.service";

const user = { userId: "7", roles: ["AGRONOMO"] };
const pending = [{
  productor_id: "10",
  nombre: "Ana Perez",
  fecha_base: "2026-08-01",
  fecha_vencimiento: "2026-09-15"
}];

describe("SeguimientoProductoresService", () => {
  it("lists only the overdue producers returned for the authenticated agronomist", async () => {
    const query = vi.fn().mockResolvedValue(pending);
    const service = new SeguimientoProductoresService({ query } as unknown as DataSource);

    const response = await service.findPending(user);

    expect(query).toHaveBeenCalledWith(expect.stringContaining("asignada.agronomo_usuario_id = $1"), ["7"]);
    expect(response.data).toEqual([{
      productorId: "10", name: "Ana Perez", baseDate: "2026-08-01", dueDate: "2026-09-15"
    }]);
  });

  it("records a shared yes without touching parcels", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ id: "10" }])
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce([]);
    const transaction = vi.fn(async (callback) => callback({ query }));
    const service = new SeguimientoProductoresService({ transaction } as unknown as DataSource);

    const response = await service.respond("10", "si", user);

    expect(response.data).toMatchObject({ decision: "si", deactivatedParcelIds: [] });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2][0]).toContain("ultima_confirmacion_continuidad_at = now()");
  });

  it("deactivates only assigned parcels and derives the producer state", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ id: "10" }])
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce([[{ id: "21" }], 1])
      .mockResolvedValueOnce([[{ activo: true }], 1]);
    const transaction = vi.fn(async (callback) => callback({ query }));
    const service = new SeguimientoProductoresService({ transaction } as unknown as DataSource);

    const response = await service.respond("10", "no", user);

    expect(query.mock.calls[0][0]).toContain("agronomo_usuario_id = $2");
    expect(query.mock.calls[0][1]).toEqual(["10", "7"]);
    expect(query.mock.calls[2][0]).toContain("agronomo_usuario_id = $2");
    expect(query.mock.calls[2][1]).toEqual(["10", "7"]);
    expect(response.data).toMatchObject({
      deactivatedParcelIds: ["21"], producerIsActive: true
    });
  });

  it("rejects a producer without an active assigned parcel", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ id: "10" }])
      .mockResolvedValueOnce([]);
    const transaction = vi.fn(async (callback) => callback({ query }));
    const service = new SeguimientoProductoresService({ transaction } as unknown as DataSource);

    await expect(service.respond("10", "no", user)).rejects.toThrow(
      "El aviso ya no esta pendiente"
    );
    expect(query).toHaveBeenCalledTimes(2);
  });
});
