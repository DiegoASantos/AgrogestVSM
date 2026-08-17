import { runWithSyncMutationLock } from "../../../shared/sync/sync-mutation-lock";
import { visitasCampoRepository } from "../repositories/visitas-campo.repository";
import { visitasCampoRemote } from "./visitas-campo.remote";

type DeleteVisitaOptions = {
  canDeleteVisits: boolean;
  currentUserId: string;
  ensureOnlineSession: () => Promise<
    "valid" | "temporarily_unavailable" | "reauth_required" | "unauthenticated"
  >;
  isOnline: boolean;
};

export const visitaDeletionService = {
  async remove(localId: string, options: DeleteVisitaOptions) {
    if (!options.canDeleteVisits) {
      throw new Error("No tiene permiso para eliminar visitas.");
    }

    return runWithSyncMutationLock(async () => {
      const visita = visitasCampoRepository.getById(localId);

      if (!visita) {
        throw new Error("No se encontro la visita solicitada.");
      }

      if (visita.agronomistUserId !== options.currentUserId) {
        throw new Error("No se encontro la visita solicitada.");
      }

      if (visita.serverId) {
        if (!options.isOnline) {
          throw new Error(
            "Conectate a internet para eliminar una visita ya sincronizada."
          );
        }

        const onlineSession = await options.ensureOnlineSession();

        if (onlineSession !== "valid") {
          throw new Error(
            onlineSession === "reauth_required" || onlineSession === "unauthenticated"
              ? "Tu sesion debe renovarse antes de eliminar esta visita."
              : "No se pudo validar la sesion por la calidad de la red."
          );
        }

        await visitasCampoRemote.remove(visita.serverId);
      }

      visitasCampoRepository.deleteLocalAggregateById(localId);
    });
  }
};
