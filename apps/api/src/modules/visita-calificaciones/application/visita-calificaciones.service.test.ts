import { describe, expect, it } from "vitest";

import { VisitaCalificacionesService } from "./visita-calificaciones.service";

function visit(id: string, productorId: string, firstName: string) {
  return {
    id,
    campaniaId: "7",
    parcelaId: `${id}-parcela`,
    etapaFenologica: { name: "Poda" },
    parcela: {
      productorId,
      product: null,
      productor: { id: productorId, firstName, lastName: null }
    }
  };
}

describe("VisitaCalificacionesService", () => {
  it("ordena productores por el score ponderado de las visitas de sus parcelas", async () => {
    const visits = [visit("1", "10", "Ana"), visit("2", "20", "Bruno")];
    const queryBuilder = {
      innerJoinAndSelect: () => queryBuilder,
      leftJoinAndSelect: () => queryBuilder,
      where: () => queryBuilder,
      andWhere: () => queryBuilder,
      getMany: async () => visits
    };
    const calificaciones = [
      ...["plagas", "enfermedades", "nutricion", "riego", "labores"].map((modulo) => ({
        visitaId: "1",
        modulo,
        puntaje: 3
      })),
      ...["plagas", "enfermedades", "nutricion", "riego", "labores"].map((modulo) => ({
        visitaId: "2",
        modulo,
        puntaje: 1
      }))
    ];
    const service = new VisitaCalificacionesService(
      { find: async () => calificaciones } as never,
      { createQueryBuilder: () => queryBuilder } as never,
      {} as never,
      {} as never,
      {} as never
    );

    await expect(service.getProductorRanking({ campaniaId: "7" })).resolves.toEqual([
      expect.objectContaining({
        productorId: "10",
        productorNombre: "Ana",
        score: 100,
        parcelasEvaluadas: 1,
        visitasCalificadas: 1
      }),
      expect.objectContaining({
        productorId: "20",
        productorNombre: "Bruno",
        score: 33.33,
        parcelasEvaluadas: 1,
        visitasCalificadas: 1
      })
    ]);
  });
});
