import { getDatabase } from "../../../shared/database/connection";

type FilaIngredienteActivo = {
  id: string;
  public_id: string;
  name: string;
  description: string | null;
  server_id: string | null;
  sync_status: string;
  sync_error_message: string | null;
};

type FilaFertilizante = {
  id: string;
  public_id: string;
  name: string;
  type: string;
  concentracion: string | null;
  unidad_medida: string | null;
  server_id: string | null;
  sync_status: string;
  sync_error_message: string | null;
};

type FilaMarcaProducto = {
  id: string;
  public_id: string;
  name: string;
  tipo_producto_id: string | null;
  ingrediente_activo_id: string | null;
  ingrediente_activo_nombre: string | null;
  concentracion: string | null;
  unidad_medida: string | null;
  server_id: string | null;
  sync_status: string;
  sync_error_message: string | null;
};

type ParcheCatalogo = {
  serverId?: string | null;
  syncStatus?: string;
  syncErrorMessage?: string | null;
};

export const catalogoIngredientesActivosRepo = {
  insertar(item: {
    id: string; publicId: string; name: string; description: string | null;
    serverId: string | null; syncStatus: string; syncErrorMessage: string | null;
  }) {
    getDatabase().runSync(
      "INSERT INTO ingredientes_activos (id, public_id, name, description, server_id, sync_status, sync_error_message) VALUES (?, ?, ?, ?, ?, ?, ?)",
      item.id, item.publicId, item.name, item.description, item.serverId, item.syncStatus, item.syncErrorMessage
    );
  },

  actualizar(id: string, parche: ParcheCatalogo) {
    const db = getDatabase();
    if (parche.serverId !== undefined) db.runSync("UPDATE ingredientes_activos SET server_id = ? WHERE id = ?", parche.serverId, id);
    if (parche.syncStatus !== undefined) db.runSync("UPDATE ingredientes_activos SET sync_status = ? WHERE id = ?", parche.syncStatus, id);
    if (parche.syncErrorMessage !== undefined) db.runSync("UPDATE ingredientes_activos SET sync_error_message = ? WHERE id = ?", parche.syncErrorMessage, id);
  },

  obtenerPorId(id: string) {
    const fila = getDatabase().getFirstSync<FilaIngredienteActivo>(
      "SELECT id, public_id, name, description, server_id, sync_status, sync_error_message FROM ingredientes_activos WHERE id = ? LIMIT 1", id
    );
    return fila ? {
      id: fila.id, publicId: fila.public_id, name: fila.name, description: fila.description,
      serverId: fila.server_id, syncStatus: fila.sync_status as "pending" | "synced" | "error", syncErrorMessage: fila.sync_error_message
    } : null;
  }
};

export const catalogoFertilizantesRepo = {
  insertar(item: {
    id: string; publicId: string; name: string; type: string;
    concentracion: string | null; unidadMedida: string | null;
    serverId: string | null; syncStatus: string; syncErrorMessage: string | null;
  }) {
    getDatabase().runSync(
      "INSERT INTO fertilizantes (id, public_id, name, type, concentracion, unidad_medida, server_id, sync_status, sync_error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      item.id, item.publicId, item.name, item.type, item.concentracion, item.unidadMedida, item.serverId, item.syncStatus, item.syncErrorMessage
    );
  },

  actualizar(id: string, parche: ParcheCatalogo) {
    const db = getDatabase();
    if (parche.serverId !== undefined) db.runSync("UPDATE fertilizantes SET server_id = ? WHERE id = ?", parche.serverId, id);
    if (parche.syncStatus !== undefined) db.runSync("UPDATE fertilizantes SET sync_status = ? WHERE id = ?", parche.syncStatus, id);
    if (parche.syncErrorMessage !== undefined) db.runSync("UPDATE fertilizantes SET sync_error_message = ? WHERE id = ?", parche.syncErrorMessage, id);
  },

  obtenerPorId(id: string) {
    const fila = getDatabase().getFirstSync<FilaFertilizante>(
      "SELECT id, public_id, name, type, concentracion, unidad_medida, server_id, sync_status, sync_error_message FROM fertilizantes WHERE id = ? LIMIT 1", id
    );
    return fila ? {
      id: fila.id, publicId: fila.public_id, name: fila.name, type: fila.type,
      concentracion: fila.concentracion, unidadMedida: fila.unidad_medida,
      serverId: fila.server_id, syncStatus: fila.sync_status as "pending" | "synced" | "error", syncErrorMessage: fila.sync_error_message
    } : null;
  }
};

export const catalogoMarcasRepo = {
  insertar(item: {
    id: string; publicId: string; name: string; tipoProductoId: string | null;
    ingredienteActivoId: string | null; ingredienteActivoNombre: string | null;
    concentracion: string | null; unidadMedida: string | null;
    serverId: string | null; syncStatus: string; syncErrorMessage: string | null;
  }) {
    getDatabase().runSync(
      "INSERT INTO marcas_producto (id, public_id, name, tipo_producto_id, ingrediente_activo_id, ingrediente_activo_nombre, concentracion, unidad_medida, server_id, sync_status, sync_error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      item.id, item.publicId, item.name, item.tipoProductoId, item.ingredienteActivoId, item.ingredienteActivoNombre, item.concentracion, item.unidadMedida, item.serverId, item.syncStatus, item.syncErrorMessage
    );
  },

  actualizar(id: string, parche: ParcheCatalogo) {
    const db = getDatabase();
    if (parche.serverId !== undefined) db.runSync("UPDATE marcas_producto SET server_id = ? WHERE id = ?", parche.serverId, id);
    if (parche.syncStatus !== undefined) db.runSync("UPDATE marcas_producto SET sync_status = ? WHERE id = ?", parche.syncStatus, id);
    if (parche.syncErrorMessage !== undefined) db.runSync("UPDATE marcas_producto SET sync_error_message = ? WHERE id = ?", parche.syncErrorMessage, id);
  },

  obtenerPorId(id: string) {
    const fila = getDatabase().getFirstSync<FilaMarcaProducto>(
      "SELECT id, public_id, name, tipo_producto_id, ingrediente_activo_id, ingrediente_activo_nombre, concentracion, unidad_medida, server_id, sync_status, sync_error_message FROM marcas_producto WHERE id = ? LIMIT 1", id
    );
    return fila ? {
      id: fila.id, publicId: fila.public_id, name: fila.name,
      tipoProductoId: fila.tipo_producto_id, ingredienteActivoId: fila.ingrediente_activo_id, ingredienteActivoNombre: fila.ingrediente_activo_nombre,
      concentracion: fila.concentracion, unidadMedida: fila.unidad_medida,
      serverId: fila.server_id, syncStatus: fila.sync_status as "pending" | "synced" | "error", syncErrorMessage: fila.sync_error_message
    } : null;
  }
};
