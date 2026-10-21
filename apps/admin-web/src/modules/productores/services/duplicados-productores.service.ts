import type { AuthSession } from "../../auth/types/auth.types";
import { apiRequest, createAuthHeaders } from "../../../shared/services";

type Session = Pick<AuthSession, "accessToken" | "tokenType">;
const route = "/mantenimiento/productores-duplicados";

export type DuplicateCase = {
  id: string;
  lesserId: string;
  greaterId: string;
  lesserName: string;
  greaterName: string;
  lesserRecordedBy: string | null;
  greaterRecordedBy: string | null;
  reasons: string[];
  createdAt: string;
};

export type DuplicatePreview = {
  principal: { id: string; firstName: string | null; lastName: string | null; documentNumber: string | null };
  secondary: { id: string; firstName: string | null; lastName: string | null; documentNumber: string | null };
  sourceParcels: Array<{ id: string; name: string | null; code: string }>;
  targetParcels: Array<{ id: string; name: string | null; code: string }>;
  possibleSameParcels: Array<{ sourceParcelId: string; targetParcelId: string; name: string }>;
  possibleSameCreditors: Array<{ sourceCreditorId: string; targetCreditorId: string; bank: string; accountLast4: string }>;
  conflicts: string[];
  relations: Record<string, number>;
  fingerprint: string;
};

const headers = (session: Session) => createAuthHeaders(session.accessToken, session.tokenType);

export const duplicadosProductoresService = {
  list(session: Session) {
    return apiRequest<DuplicateCase[]>(route, { headers: headers(session) });
  },
  scan(session: Session) {
    return apiRequest<{ candidates: number }>(`${route}/escanear`, {
      method: "POST", headers: headers(session)
    });
  },
  propose(session: Session, firstId: string, secondId: string) {
    return apiRequest<{ proposed: boolean }>(`${route}/proponer`, {
      method: "POST", headers: headers(session), body: { firstId, secondId }
    });
  },
  preview(session: Session, caseId: string, principalId: string) {
    return apiRequest<DuplicatePreview>(
      `${route}/${caseId}/previa?principalId=${encodeURIComponent(principalId)}`,
      { headers: headers(session) }
    );
  },
  dismiss(session: Session, caseId: string) {
    return apiRequest<{ dismissed: boolean }>(`${route}/${caseId}/descartar`, {
      method: "POST", headers: headers(session)
    });
  },
  merge(session: Session, caseId: string, preview: DuplicatePreview,
    parcelMappings: Array<{ sourceParcelId: string; targetParcelId: string }>,
    creditorMappings: Array<{ sourceCreditorId: string; targetCreditorId: string }>) {
    return apiRequest<{ principalId: string; secondaryId: string }>(`${route}/${caseId}/unificar`, {
      method: "POST", headers: headers(session), body: {
        principalId: preview.principal.id, fingerprint: preview.fingerprint,
        parcelMappings, creditorMappings
      }
    });
  }
};
