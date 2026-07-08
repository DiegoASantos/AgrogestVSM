import type { ObjectLiteral, Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { CampaniaEntity } from "../../campanias/infrastructure/persistence/entities/campania.entity";
import { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import { SubsectorEntity } from "../../subsectores/infrastructure/persistence/entities/subsector.entity";
import { VariedadEntity } from "../../variedades/infrastructure/persistence/entities/variedad.entity";
import { CostBuildExportService } from "./cost-build-export.service";

describe("CostBuildExportService", () => {
  it("exports Cost-Build records with origin metadata and document type text", async () => {
    const service = new CostBuildExportService(
      makeRepository<CultivoEntity>([
        {
          public_id: "cultivo-public-1",
          codigo: "MNG",
          nombre: "Mango",
          activo: true
        }
      ]),
      makeRepository<VariedadEntity>([
        {
          public_id: "variedad-public-1",
          cultivo_public_id: "cultivo-public-1",
          codigo: "KNT",
          nombre: "Kent",
          activo: true
        }
      ]),
      makeRepository<CampaniaEntity>([
        {
          public_id: "campania-public-1",
          cultivo_public_id: "cultivo-public-1",
          nombre: "Campania 2026",
          fecha_inicio: "2026-01-01",
          fecha_fin: null,
          descripcion: null,
          activa: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]),
      makeRepository<ProductorEntity>([
        {
          public_id: "productor-public-1",
          entidad: "persona",
          tipo_documento: "DNI",
          tipo_documento_codigo: "DNI",
          nro_documento: "12345678",
          nombres: "Ana",
          apellidos: "Ramos",
          telefono: "999999999",
          email: "ana@example.test",
          direccion: "Calle 1",
          activo: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]),
      makeRepository<SectorEntity>([
        {
          public_id: "sector-public-1",
          distrito_id: "1",
          nombre: "Sector Norte",
          descripcion: null,
          activo: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]),
      makeRepository<SubsectorEntity>([
        {
          public_id: "subsector-public-1",
          sector_public_id: "sector-public-1",
          nombre: "Subsector A",
          descripcion: null,
          activo: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ]),
      makeRepository<ParcelaEntity>([
        {
          public_id: "parcela-public-1",
          productor_public_id: "productor-public-1",
          subsector_public_id: "subsector-public-1",
          sector_public_id: "sector-public-1",
          codigo: "PAR-001",
          nombre: "Parcela 1",
          area_ha: "1.5000",
          descripcion: null,
          punto_referencia: '{"type":"Point","coordinates":[-80,-5]}',
          geometria: null,
          activo: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z"
        }
      ])
    );

    const response = await service.exportAll();

    expect(response.success).toBe(true);
    expect(response.data.sistema_origen).toBe("AGROGEST_VSM");
    expect(response.data.cultivos[0]).toMatchObject({
      sistema_origen: "AGROGEST_VSM",
      id_origen: "cultivo-public-1",
      codigo: "MNG",
      estado: "ACTIVO"
    });
    expect(response.data.productores[0]).toMatchObject({
      id_origen: "productor-public-1",
      tipo_documento: "DNI",
      numero_documento: "12345678",
      nombres: "Ana",
      telefono: "999999999",
      email: "ana@example.test",
      direccion: "Calle 1"
    });
    expect(response.data.parcelas[0]).toMatchObject({
      productor_id_origen: "productor-public-1",
      subsector_id_origen: "subsector-public-1",
      sector_id_origen: "sector-public-1",
      punto_referencia: { type: "Point", coordinates: [-80, -5] }
    });
    expect(response.meta?.counts).toMatchObject({
      cultivos: 1,
      productores: 1,
      parcelas: 1
    });
  });
});

function makeRepository<T extends ObjectLiteral>(rows: unknown[]): Repository<T> {
  return {
    query: vi.fn().mockResolvedValue(rows)
  } as unknown as Repository<T>;
}
