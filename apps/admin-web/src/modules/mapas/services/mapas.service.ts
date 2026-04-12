import type { AuthSession } from "../../auth/types/auth.types";
import type { CampaniaCatalogItem } from "../../mantenimiento/types/agricultural-catalogs.types";
import type { ProductorListItem } from "../../productores/types/productores.types";
import type { SecurityUserItem } from "../../seguridad/types/security.types";
import type { SectorListItem } from "../../sectores/types/sectores.types";
import {
  apiRequest,
  createAuthHeaders,
  fetchAllPaginated
} from "../../../shared/services";
import type {
  MapasOverviewData,
  ParcelaMapApiItem,
  ParcelaMapItem,
  VisitaMapApiItem,
  VisitaMapItem
} from "../types/mapas.types";

type AuthSessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const mapasService = {
  async getOverview(session: AuthSessionInput): Promise<MapasOverviewData> {
    const headers = createAuthHeaders(session.accessToken, session.tokenType);
    // Paginated endpoints must be walked page-by-page so the map view sees
    // every record; catalog endpoints are capped server-side.
    const [parcelas, visitas, sectores, productores, campanias, usuarios] =
      await Promise.all([
        fetchAllPaginated<ParcelaMapApiItem>("/parcelas?activo=true", { headers }),
        fetchAllPaginated<VisitaMapApiItem>("/visitas-campo?activo=true", { headers }),
        safeFetchAllPages<SectorListItem>("/sectores", headers),
        safeFetchAllPages<ProductorListItem>("/productores", headers),
        safeRequestList<CampaniaCatalogItem>("/campanias", headers),
        safeRequestList<SecurityUserItem>("/usuarios", headers)
      ]);

    const sectoresById = new Map(sectores.map((sector) => [sector.id, sector]));
    const productoresById = new Map(
      productores.map((productor) => [productor.id, productor])
    );
    const campaniasById = new Map(
      campanias.map((campania) => [campania.id, campania])
    );
    const usuariosById = new Map(usuarios.map((usuario) => [usuario.id, usuario]));

    const parcelaItems = parcelas
      .map((parcela) =>
        normalizeParcelaMapItem(parcela, sectoresById, productoresById)
      )
      .sort((leftItem, rightItem) => leftItem.code.localeCompare(rightItem.code, "es"));
    const parcelasById = new Map(parcelaItems.map((parcela) => [parcela.id, parcela]));

    const visitaItems = visitas
      .map((visita) =>
        normalizeVisitaMapItem(visita, parcelasById, campaniasById, usuariosById)
      )
      .sort((leftItem, rightItem) =>
        rightItem.visitDate.localeCompare(leftItem.visitDate, "es")
      );

    const mappableParcelas = parcelaItems.filter((item) => item.hasGeodata);
    const missingParcelas = parcelaItems.filter((item) => !item.hasGeodata);
    const mappableVisitas = visitaItems.filter((item) => item.hasGeodata);
    const missingVisitas = visitaItems.filter((item) => !item.hasGeodata);

    return {
      parcelas: {
        items: parcelaItems,
        mappableItems: mappableParcelas,
        missingGeodataItems: missingParcelas,
        totals: {
          activeParcelasCount: parcelaItems.length,
          mappedParcelasCount: mappableParcelas.length,
          polygonParcelasCount: parcelaItems.filter((item) => item.hasPolygon).length,
          pointOnlyParcelasCount: parcelaItems.filter(
            (item) => item.hasPoint && !item.hasPolygon
          ).length,
          missingGeodataCount: missingParcelas.length
        }
      },
      visitas: {
        items: visitaItems,
        mappableItems: mappableVisitas,
        missingGeodataItems: missingVisitas,
        totals: {
          activeVisitasCount: visitaItems.length,
          mappedVisitasCount: mappableVisitas.length,
          missingGeodataCount: missingVisitas.length
        }
      }
    };
  }
};

function normalizeParcelaMapItem(
  parcela: ParcelaMapApiItem,
  sectoresById: Map<string, SectorListItem>,
  productoresById: Map<string, ProductorListItem>
): ParcelaMapItem {
  const sector = sectoresById.get(parcela.sectorId) ?? null;
  const productor = sector ? productoresById.get(sector.productorId) ?? null : null;
  const referencePoint = normalizePointGeometry(
    parcela.geo?.point ?? parcela.referencePoint ?? null
  );
  const geometry = normalizeMultiPolygonGeometry(
    parcela.geo?.polygon ?? parcela.geometry ?? null
  );
  const hasPoint = referencePoint !== null;
  const hasPolygon = geometry !== null;

  return {
    id: parcela.id,
    publicId: parcela.publicId,
    productorId: sector?.productorId ?? null,
    sectorId: parcela.sectorId,
    sectorName: sector?.name ?? null,
    productorLabel: productor ? buildProductorLabel(productor) : null,
    code: parcela.code,
    name: parcela.name,
    areaHectares: parcela.areaHectares,
    description: parcela.description,
    referencePoint,
    geometry,
    hasPoint,
    hasPolygon,
    hasGeodata: hasPoint || hasPolygon
  };
}

function normalizeVisitaMapItem(
  visita: VisitaMapApiItem,
  parcelasById: Map<string, ParcelaMapItem>,
  campaniasById: Map<string, CampaniaCatalogItem>,
  usuariosById: Map<string, SecurityUserItem>
): VisitaMapItem {
  const parcela = parcelasById.get(visita.parcelaId) ?? null;
  const campania = campaniasById.get(visita.campaignId) ?? null;
  const agronomist = usuariosById.get(visita.agronomistUserId) ?? null;
  const visitLocation = normalizePointGeometry(
    visita.geo?.point ?? visita.visitLocation ?? null
  );

  return {
    id: visita.id,
    publicId: visita.publicId,
    nroFicha: visita.nroFicha,
    productorId: parcela?.productorId ?? null,
    sectorId: parcela?.sectorId ?? null,
    parcelaId: visita.parcelaId,
    parcelaLabel: parcela ? buildParcelaTitle(parcela) : `Parcela #${visita.parcelaId}`,
    campaignId: visita.campaignId,
    campaignName: campania?.name ?? null,
    agronomistUserId: visita.agronomistUserId,
    agronomistName: agronomist?.displayName ?? null,
    productorLabel: parcela?.productorLabel ?? null,
    visitDate: visita.visitDate,
    visitLocation,
    isActive: visita.isActive,
    hasGeodata: visitLocation !== null
  };
}

function buildProductorLabel(productor: ProductorListItem) {
  return productor.documentNumber || productor.publicId;
}

function buildParcelaTitle(parcela: ParcelaMapItem) {
  if (parcela.name) {
    return `${parcela.code} - ${parcela.name}`;
  }

  return parcela.code;
}

async function safeRequestList<T>(
  path: string,
  headers: Record<string, string>
): Promise<T[]> {
  try {
    return await apiRequest<T[]>(path, { headers });
  } catch {
    return [];
  }
}

async function safeFetchAllPages<T>(
  path: string,
  headers: Record<string, string>
): Promise<T[]> {
  try {
    return await fetchAllPaginated<T>(path, { headers });
  } catch {
    return [];
  }
}

function normalizePointGeometry(
  value: unknown
): ParcelaMapItem["referencePoint"] | VisitaMapItem["visitLocation"] {
  if (!isRecord(value) || value.type !== "Point" || !isCoordinatePair(value.coordinates)) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [value.coordinates[0], value.coordinates[1]]
  };
}

function normalizeMultiPolygonGeometry(value: unknown): ParcelaMapItem["geometry"] {
  if (
    !isRecord(value) ||
    value.type !== "MultiPolygon" ||
    !Array.isArray(value.coordinates) ||
    !value.coordinates.every(isPolygonCoordinates)
  ) {
    return null;
  }

  return {
    type: "MultiPolygon",
    coordinates: value.coordinates
  };
}

function isPolygonCoordinates(value: unknown): value is number[][][] {
  return Array.isArray(value) && value.every((ring) => isLinearRing(ring));
}

function isLinearRing(value: unknown): value is [number, number][] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isCoordinatePair)) {
    return false;
  }

  const firstCoordinate = value[0];
  const lastCoordinate = value[value.length - 1];

  if (!firstCoordinate || !lastCoordinate) {
    return false;
  }

  return (
    firstCoordinate[0] === lastCoordinate[0] &&
    firstCoordinate[1] === lastCoordinate[1]
  );
}

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isLongitude(value[0]) &&
    isLatitude(value[1])
  );
}

function isLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
