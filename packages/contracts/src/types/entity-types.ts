import type {
  EntityId,
  ISODateString,
  UserRole,
  VisitFieldStatus
} from "./domain-types.js";

export interface Usuario {
  id: EntityId;
  nombres: string;
  apellidos: string;
  email: string;
  rol: UserRole;
  activo: boolean;
}

export interface Productor {
  id: EntityId;
  codigo: string;
  nombres: string;
  apellidos: string;
  documento?: string;
  telefono?: string;
  activo: boolean;
}

export interface Sector {
  id: EntityId;
  productorId: EntityId;
  nombre: string;
  descripcion?: string;
}

export interface Parcela {
  id: EntityId;
  productorId: EntityId;
  sectorId: EntityId;
  nombre: string;
  areaHectareas?: number;
}

export interface VisitaCampo {
  id: EntityId;
  productorId: EntityId;
  parcelaId: EntityId;
  tecnicoId: EntityId;
  fechaProgramada: ISODateString;
  estado: VisitFieldStatus;
  observaciones?: string;
}
