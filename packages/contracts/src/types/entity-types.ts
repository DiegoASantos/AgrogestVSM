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
  publicId: string;
  entityType: "persona" | "fundo" | "cooperativa";
  documentTypeId: number | null;
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Sector {
  id: EntityId;
  distritoId: EntityId;
  nombre: string;
  descripcion?: string;
}

export interface Departamento {
  id: EntityId;
  codigo: string;
  nombre: string;
}

export interface Provincia {
  id: EntityId;
  departamentoId: EntityId;
  codigo: string;
  nombre: string;
}

export interface Distrito {
  id: EntityId;
  provinciaId: EntityId;
  ubigeo: string;
  nombre: string;
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
