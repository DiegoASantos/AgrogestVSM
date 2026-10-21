import type { FastifyReply } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { VisitasCampoController } from "./visitas-campo.controller";

describe("VisitasCampoController PBI Excel download", () => {
  it("returns the XLSX attachment with the agreed filename and MIME type", async () => {
    const content = Buffer.from("xlsx-content");
    const service = {
      exportPbiExcelReport: vi.fn().mockResolvedValue({
        content,
        fileName: "visitas pbi.xlsx"
      })
    };
    const reply = {
      header: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnValue("sent")
    };
    const controller = new VisitasCampoController(service as never);

    const result = await controller.exportVisitaPbiExcel(
      "15",
      reply as unknown as FastifyReply
    );

    expect(service.exportPbiExcelReport).toHaveBeenCalledWith("15");
    expect(reply.header).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="visitas pbi.xlsx"'
    );
    expect(reply.type).toHaveBeenCalledWith(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(reply.send).toHaveBeenCalledWith(content);
    expect(result).toBe("sent");
  });
});
