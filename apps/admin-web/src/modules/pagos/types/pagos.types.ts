export type PagoProductorStatus =
  | "BORRADOR"
  | "OBSERVADO"
  | "PENDIENTE"
  | "PAGADO"
  | "ANULADO";

export type PagoProductor = {
  id: string;
  publicId: string;
  productorId: string;
  productorNombre: string;
  sistemaOrigen: string;
  nroGuia: string;
  lote: string;
  protocolo: string;
  variedad: string;
  tipoCultivo: string;
  categoria: string;
  destino: string;
  fechaCosecha: string;
  fechaRecepcion: string;
  jabas: number;
  pesoBruto: string;
  pesoTara: string;
  pesoNeto: string;
  pesoPromedio: string;
  exportador: string;
  codigoProductorOrigen: string;
  nombreProductorOrigen: string;
  estado: PagoProductorStatus;
  creadoAt: string;
  actualizadoAt: string;
  detalles?: DetallePagoProductor[];
};

export type PagoProductorPayload = Omit<
  PagoProductor,
  | "id"
  | "publicId"
  | "productorNombre"
  | "estado"
  | "creadoAt"
  | "actualizadoAt"
  | "detalles"
>;

export type DetallePagoProductor = {
  id: string;
  publicId: string;
  acreedorId: string;
  acreedorNombre: string;
  tipoDocumentoProductor: string;
  nroDocumentoProductor: string;
  tipoDocumentoAcreedor?: string;
  nroDocumentoAcreedor?: string;
  cantidadJabas: number;
  precioJaba: string;
  precioKilo: string;
  porcentajePeso: string;
  aplicaFairtrade: boolean;
  supervisorId: string;
  supervisorNombre: string;
  subTotal: string;
  tipoDescuento: string;
  montoDescuento: string;
  totalPostDescuento: string;
  detraccion: string;
  totalPostDetraccion: string;
  nroLiquidacion: string | null;
  observacion: string;
  estado: PagoProductorStatus;
  creadoAt: string;
  actualizadoAt: string;
};

export type DetallePagoProductorPayload = Omit<
  DetallePagoProductor,
  | "id"
  | "publicId"
  | "acreedorNombre"
  | "supervisorNombre"
  | "estado"
  | "creadoAt"
  | "actualizadoAt"
>;

export type PagoCatalogs = {
  productores: Array<{ id: string; nombre: string; activo: boolean }>;
  supervisores: Array<{ id: string; nombre: string }>;
  tiposDocumento: Array<{ codigo: string; nombre: string }>;
};

export type AcreedorPago = {
  id: string;
  nombre: string;
  tipoDocumento: string;
  nroDocumento: string;
};
export type AcreedorPagoPayload = Pick<
  AcreedorCosechaPayload,
  "nombres" | "apellidos" | "tipoDocumento" | "nroDocumento" | "banco" | "nroCuenta"
>;

export type AcreedorCosecha = {
  id: string;
  publicId: string;
  productorId: string;
  productorNombre: string;
  nombres: string;
  apellidos: string;
  tipoDocumento: "DNI" | "RUC";
  nroDocumento: string;
  banco: "INTERBANK" | "BCP" | "CAJA_PIURA" | "BBVA";
  nroCuenta: string;
  estadoAprobacion: "PENDING" | "APPROVED" | "OBSERVED";
  origen: "PRODUCTOR" | "MOBILE" | "ADMIN_WEB";
  observacionRevision: string | null;
  creadoAt: string;
  actualizadoAt: string;
};

export type AcreedorCosechaPayload = Omit<
  AcreedorCosecha,
  | "id"
  | "publicId"
  | "productorNombre"
  | "estadoAprobacion"
  | "origen"
  | "observacionRevision"
  | "creadoAt"
  | "actualizadoAt"
>;
