import { getDatabase } from "../../../shared/database/connection";
import type { TipoDocumento } from "../types/tipos-documento.types";

type FilaTipoDocumento = {
  id: number;
  code: string;
  name: string;
};

const COLUMNAS_TIPO_DOCUMENTO = `
  id,
  code,
  name
`;

export const tiposDocumentoRepository = {
  obtenerTodos() {
    const db = getDatabase();
    const filas = db.getAllSync<FilaTipoDocumento>(
      `SELECT ${COLUMNAS_TIPO_DOCUMENTO}
       FROM tipos_documento
       ORDER BY id ASC`
    );

    return filas.map(mapearFilaTipoDocumento);
  },

  obtenerPorId(id: number) {
    const db = getDatabase();
    const fila = db.getFirstSync<FilaTipoDocumento>(
      `SELECT ${COLUMNAS_TIPO_DOCUMENTO}
       FROM tipos_documento
       WHERE id = ?
       LIMIT 1`,
      id
    );

    return fila ? mapearFilaTipoDocumento(fila) : null;
  },

  insertarVarios(documentos: TipoDocumento[]) {
    const db = getDatabase();
    for (const doc of documentos) {
      db.runSync(
        `INSERT OR REPLACE INTO tipos_documento (id, code, name)
         VALUES (?, ?, ?)`,
        doc.id,
        doc.code,
        doc.name
      );
    }
  }
};

function mapearFilaTipoDocumento(fila: FilaTipoDocumento): TipoDocumento {
  return {
    id: fila.id,
    code: fila.code,
    name: fila.name
  };
}
