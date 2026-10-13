import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";

export type OperationalNotice = {
  kind: "VISITAS_DUPLICADAS" | "PRODUCTOR_SIN_VISITA";
  key: string;
  productorId: string;
  productorNombre: string;
  agronomoUsuarioId: string | null;
  agronomoNombre: string | null;
  fechaVisita: string | null;
  cantidadVisitas: number | null;
  fechaBase: string | null;
  fechaVencimiento: string | null;
  sortDate: string;
};

export type OperationalNoticesPage = {
  items: OperationalNotice[];
  unreadCount: number;
  nextCursor: string | null;
};

type SessionInput = Pick<AuthSession, "accessToken" | "tokenType">;

export const notificacionesService = {
  list(session: SessionInput, cursor?: string) {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<OperationalNoticesPage>(`/notificaciones/operativas?${query}`, {
      headers: createAuthHeaders(session.accessToken, session.tokenType)
    });
  },

  markRead(session: SessionInput, notice: OperationalNotice) {
    if (!notice.agronomoUsuarioId || !notice.fechaVisita) {
      throw new Error("El aviso no corresponde a visitas repetidas.");
    }
    return apiRequest<{ read: boolean }>("/notificaciones/visitas-duplicadas/lectura", {
      method: "POST",
      headers: createAuthHeaders(session.accessToken, session.tokenType),
      body: {
        productorId: notice.productorId,
        agronomoUsuarioId: notice.agronomoUsuarioId,
        fechaVisita: notice.fechaVisita
      }
    });
  }
};
