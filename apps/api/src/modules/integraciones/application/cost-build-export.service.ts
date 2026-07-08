import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { CampaniaEntity } from "../../campanias/infrastructure/persistence/entities/campania.entity";
import { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import { SubsectorEntity } from "../../subsectores/infrastructure/persistence/entities/subsector.entity";
import { VariedadEntity } from "../../variedades/infrastructure/persistence/entities/variedad.entity";

const SOURCE_SYSTEM = "AGROGEST_VSM";

type BooleanLike = boolean | null;

type PublicIdRow = {
  public_id: string;
};

type CultivoExportRow = PublicIdRow & {
  codigo: string;
  nombre: string;
  activo: BooleanLike;
};

type VariedadExportRow = PublicIdRow & {
  cultivo_public_id: string;
  codigo: string | null;
  nombre: string;
  activo: BooleanLike;
};

type CampaniaExportRow = PublicIdRow & {
  cultivo_public_id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  descripcion: string | null;
  activa: BooleanLike;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProductorExportRow = PublicIdRow & {
  entidad: string;
  tipo_documento: string | null;
  tipo_documento_codigo: string | null;
  nro_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: BooleanLike;
  created_at: Date | string;
  updated_at: Date | string;
};

type SectorExportRow = PublicIdRow & {
  distrito_id: string;
  nombre: string;
  descripcion: string | null;
  activo: BooleanLike;
  created_at: Date | string;
  updated_at: Date | string;
};

type SubsectorExportRow = PublicIdRow & {
  sector_public_id: string;
  nombre: string;
  descripcion: string | null;
  activo: BooleanLike;
  created_at: Date | string;
  updated_at: Date | string;
};

type ParcelaExportRow = PublicIdRow & {
  productor_public_id: string;
  subsector_public_id: string;
  sector_public_id: string;
  codigo: string;
  nombre: string | null;
  area_ha: string | null;
  descripcion: string | null;
  punto_referencia: string | null;
  geometria: string | null;
  activo: BooleanLike;
  created_at: Date | string;
  updated_at: Date | string;
};

@Injectable()
export class CostBuildExportService {
  constructor(
    @InjectRepository(CultivoEntity)
    private readonly cultivosRepository: Repository<CultivoEntity>,
    @InjectRepository(VariedadEntity)
    private readonly variedadesRepository: Repository<VariedadEntity>,
    @InjectRepository(CampaniaEntity)
    private readonly campaniasRepository: Repository<CampaniaEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>,
    @InjectRepository(SectorEntity)
    private readonly sectoresRepository: Repository<SectorEntity>,
    @InjectRepository(SubsectorEntity)
    private readonly subsectoresRepository: Repository<SubsectorEntity>,
    @InjectRepository(ParcelaEntity)
    private readonly parcelasRepository: Repository<ParcelaEntity>
  ) {}

  async exportAll() {
    const [
      cultivos,
      variedades,
      campanias,
      productores,
      sectores,
      subsectores,
      parcelas
    ] = await Promise.all([
      this.findCultivos(),
      this.findVariedades(),
      this.findCampanias(),
      this.findProductores(),
      this.findSectores(),
      this.findSubsectores(),
      this.findParcelas()
    ]);

    const data = {
      sistema_origen: SOURCE_SYSTEM,
      generado_at: new Date().toISOString(),
      cultivos: cultivos.map(toCultivoExport),
      variedades: variedades.map(toVariedadExport),
      campanias: campanias.map(toCampaniaExport),
      productores: productores.map(toProductorExport),
      sectores: sectores.map(toSectorExport),
      subsectores: subsectores.map(toSubsectorExport),
      parcelas: parcelas.map(toParcelaExport)
    };

    return createSuccessResponse(data, {
      counts: {
        cultivos: data.cultivos.length,
        variedades: data.variedades.length,
        campanias: data.campanias.length,
        productores: data.productores.length,
        sectores: data.sectores.length,
        subsectores: data.subsectores.length,
        parcelas: data.parcelas.length
      }
    });
  }

  private findCultivos(): Promise<CultivoExportRow[]> {
    return this.cultivosRepository.query(`
      SELECT
        public_id::text AS public_id,
        codigo,
        nombre,
        activo
      FROM cultivos
      ORDER BY nombre ASC, id ASC
    `);
  }

  private findVariedades(): Promise<VariedadExportRow[]> {
    return this.variedadesRepository.query(`
      SELECT
        variedad.public_id::text AS public_id,
        cultivo.public_id::text AS cultivo_public_id,
        variedad.codigo,
        variedad.nombre,
        variedad.activo
      FROM variedades variedad
      INNER JOIN cultivos cultivo ON cultivo.id = variedad.cultivo_id
      ORDER BY cultivo.nombre ASC, variedad.nombre ASC, variedad.id ASC
    `);
  }

  private findCampanias(): Promise<CampaniaExportRow[]> {
    return this.campaniasRepository.query(`
      SELECT
        campania.public_id::text AS public_id,
        cultivo.public_id::text AS cultivo_public_id,
        campania.nombre,
        campania.fecha_inicio,
        campania.fecha_fin,
        campania.descripcion,
        campania.activa,
        campania.creado_at AS created_at,
        campania.actualizado_at AS updated_at
      FROM campanias campania
      INNER JOIN cultivos cultivo ON cultivo.id = campania.cultivo_id
      ORDER BY campania.fecha_inicio DESC, campania.nombre ASC, campania.id ASC
    `);
  }

  private findProductores(): Promise<ProductorExportRow[]> {
    return this.productoresRepository.query(`
      SELECT
        productor.public_id::text AS public_id,
        productor.entidad,
        tipo_documento.nombre AS tipo_documento,
        tipo_documento.codigo AS tipo_documento_codigo,
        productor.nro_documento,
        productor.nombres,
        productor.apellidos,
        productor.telefono,
        productor.email,
        productor.direccion,
        productor.activo,
        productor.creado_at AS created_at,
        productor.actualizado_at AS updated_at
      FROM productores productor
      LEFT JOIN tipos_documento tipo_documento
        ON tipo_documento.id = productor.tipo_documento_id
      ORDER BY productor.nombres ASC, productor.apellidos ASC, productor.id ASC
    `);
  }

  private findSectores(): Promise<SectorExportRow[]> {
    return this.sectoresRepository.query(`
      SELECT
        public_id::text AS public_id,
        distrito_id::text AS distrito_id,
        nombre,
        descripcion,
        activo,
        creado_at AS created_at,
        actualizado_at AS updated_at
      FROM sectores
      ORDER BY distrito_id ASC, nombre ASC, id ASC
    `);
  }

  private findSubsectores(): Promise<SubsectorExportRow[]> {
    return this.subsectoresRepository.query(`
      SELECT
        subsector.public_id::text AS public_id,
        sector.public_id::text AS sector_public_id,
        subsector.nombre,
        subsector.descripcion,
        subsector.activo,
        subsector.creado_at AS created_at,
        subsector.actualizado_at AS updated_at
      FROM subsectores subsector
      INNER JOIN sectores sector ON sector.id = subsector.sector_id
      ORDER BY sector.nombre ASC, subsector.nombre ASC, subsector.id ASC
    `);
  }

  private findParcelas(): Promise<ParcelaExportRow[]> {
    return this.parcelasRepository.query(`
      SELECT
        parcela.public_id::text AS public_id,
        productor.public_id::text AS productor_public_id,
        subsector.public_id::text AS subsector_public_id,
        sector.public_id::text AS sector_public_id,
        parcela.codigo,
        parcela.nombre,
        parcela.area_ha::text AS area_ha,
        parcela.descripcion,
        ST_AsGeoJSON(parcela.punto_referencia) AS punto_referencia,
        ST_AsGeoJSON(parcela.geometria) AS geometria,
        parcela.activo,
        parcela.creado_at AS created_at,
        parcela.actualizado_at AS updated_at
      FROM parcelas parcela
      INNER JOIN productores productor ON productor.id = parcela.productor_id
      INNER JOIN subsectores subsector ON subsector.id = parcela.subsector_id
      INNER JOIN sectores sector ON sector.id = subsector.sector_id
      ORDER BY productor.nombres ASC, parcela.codigo ASC, parcela.id ASC
    `);
  }
}

function toCultivoExport(row: CultivoExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    nombre: row.nombre,
    codigo: row.codigo,
    estado: toEstado(row.activo)
  });
}

function toVariedadExport(row: VariedadExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    cultivo_id_origen: row.cultivo_public_id,
    nombre: row.nombre,
    codigo: row.codigo,
    estado: toEstado(row.activo)
  });
}

function toCampaniaExport(row: CampaniaExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    cultivo_id_origen: row.cultivo_public_id,
    nombre: row.nombre,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    descripcion: row.descripcion,
    estado: toEstado(row.activa),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  });
}

function toProductorExport(row: ProductorExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    entidad: row.entidad,
    tipo_documento: row.tipo_documento,
    tipo_documento_codigo: row.tipo_documento_codigo,
    numero_documento: row.nro_documento,
    nombres: row.nombres,
    apellidos: row.apellidos,
    telefono: row.telefono,
    email: row.email,
    direccion: row.direccion,
    estado: toEstado(row.activo),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  });
}

function toSectorExport(row: SectorExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    distrito_id: row.distrito_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    estado: toEstado(row.activo),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  });
}

function toSubsectorExport(row: SubsectorExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    sector_id_origen: row.sector_public_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    estado: toEstado(row.activo),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  });
}

function toParcelaExport(row: ParcelaExportRow) {
  return withOrigin(row.public_id, {
    public_id: row.public_id,
    productor_id_origen: row.productor_public_id,
    subsector_id_origen: row.subsector_public_id,
    sector_id_origen: row.sector_public_id,
    codigo: row.codigo,
    nombre: row.nombre,
    area_ha: row.area_ha,
    descripcion: row.descripcion,
    punto_referencia: parseGeoJson(row.punto_referencia),
    geometria: parseGeoJson(row.geometria),
    estado: toEstado(row.activo),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  });
}

function withOrigin<T extends Record<string, unknown>>(publicId: string, data: T) {
  return {
    sistema_origen: SOURCE_SYSTEM,
    id_origen: publicId,
    ...data
  };
}

function toEstado(value: BooleanLike) {
  return value === false ? "INACTIVO" : "ACTIVO";
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function parseGeoJson(value: string | null) {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as unknown;
}
