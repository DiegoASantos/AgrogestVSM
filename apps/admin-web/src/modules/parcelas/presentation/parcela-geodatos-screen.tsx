"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { sectoresService } from "../../sectores/services/sectores.service";
import type { SectorListItem } from "../../sectores/types/sectores.types";
import { ErrorState } from "../../../shared/components/error-state";
import { FeedbackBanner } from "../../../shared/components/feedback-banner";
import { LoadingState } from "../../../shared/components/loading-state";
import { ToolbarActions } from "../../../shared/components/toolbar-actions";
import { ConfirmDialog } from "../../../shared/components/confirm-dialog";
import { adminRoutes } from "../../../shared/constants/site";
import { toApiError } from "../../../shared/services";
import { parcelasService } from "../services/parcelas.service";
import type {
  GeoJsonMultiPolygon,
  GeoJsonPoint,
  ParcelaListItem
} from "../types/parcelas.types";
import {
  ParcelaGeodatosMap,
  type GeoEditorActionKind,
  type GeoEditorMode
} from "./parcela-geodatos-map";
import {
  areGeodataEqual,
  calculatePolygonAreaHectares,
  cloneGeodata,
  validateParcelaGeodata
} from "../utils/geo-editor";

type ParcelaGeodatosScreenProps = {
  parcelaId: string;
};

type EditorState = {
  referencePoint: GeoJsonPoint | null;
  geometry: GeoJsonMultiPolygon | null;
};

type EditorHistory = {
  past: EditorState[];
  future: EditorState[];
};

const MAX_HISTORY_STEPS = 30;

export function ParcelaGeodatosScreen({ parcelaId }: ParcelaGeodatosScreenProps) {
  const { session, logout } = useAuthSession();
  const [parcela, setParcela] = useState<ParcelaListItem | null>(null);
  const [sector, setSector] = useState<SectorListItem | null>(null);
  const [neighbors, setNeighbors] = useState<ParcelaListItem[]>([]);
  const [originalState, setOriginalState] = useState<EditorState>({
    referencePoint: null,
    geometry: null
  });
  const [editorState, setEditorState] = useState<EditorState>({
    referencePoint: null,
    geometry: null
  });
  const editorStateRef = useRef(editorState);
  const [editorAction, setEditorAction] = useState<{
    kind: GeoEditorActionKind;
    nonce: number;
  } | null>(null);
  const [editorMode, setEditorMode] = useState<GeoEditorMode>("idle");
  const [history, setHistory] = useState<EditorHistory>({
    past: [],
    future: []
  });
  const [pendingConfirmation, setPendingConfirmation] =
    useState<GeoEditorActionKind | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadData();
  }, [parcelaId, session]);

  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  const validation = useMemo(
    () =>
      validateParcelaGeodata({
        referencePoint: editorState.referencePoint,
        geometry: editorState.geometry,
        neighbors
      }),
    [editorState.geometry, editorState.referencePoint, neighbors]
  );
  const calculatedArea = useMemo(
    () => calculatePolygonAreaHectares(editorState.geometry),
    [editorState.geometry]
  );
  const hasChanges =
    !areGeodataEqual(originalState.referencePoint, editorState.referencePoint) ||
    !areGeodataEqual(originalState.geometry, editorState.geometry);
  const canUndo = history.past.length > 0 && !isSaving;
  const canRedo = history.future.length > 0 && !isSaving;

  if (isLoading) {
    return <LoadingState description="Cargando editor de geodatos de la parcela." />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        action={
          <button
            className={`ui-button ui-button--secondary${
              editorMode === "placing-point" ? " ui-button--active" : ""
            }`}
            onClick={() => void loadData()}
            type="button"
          >
            Reintentar
          </button>
        }
        description={errorMessage}
      />
    );
  }

  if (!parcela) {
    return null;
  }

  return (
    <section className="geo-editor-layout">
      <aside className="panel geo-editor-panel">
        <ToolbarActions
          actions={
            <Link
              className="ui-button ui-button--secondary"
              href={adminRoutes.mantenimientoItems.parcelas}
            >
              Volver
            </Link>
          }
          description="Registra punto, polígono y valida cruces con parcelas vecinas del mismo sector."
          eyebrow="Mantenimiento"
          title="Geodatos de parcela"
        />

        <div className="geo-editor-summary">
          <div>
            <span>Parcela</span>
            <strong>{buildParcelaLabel(parcela)}</strong>
          </div>
          <div>
            <span>Sector</span>
            <strong>{sector?.name ?? `Sector ${parcela.sectorId}`}</strong>
          </div>
          <div>
            <span>Estado geográfico</span>
            <strong>{buildGeodataStatus(editorState)}</strong>
          </div>
          <div>
            <span>Área registrada</span>
            <strong>
              {parcela.areaHectares ? `${parcela.areaHectares} ha` : "Sin área"}
            </strong>
          </div>
          <div>
            <span>Área calculada</span>
            <strong>
              {calculatedArea ? `${calculatedArea.toFixed(4)} ha` : "Sin polígono"}
            </strong>
          </div>
          <div>
            <span>Parcelas vecinas</span>
            <strong>{neighbors.filter((item) => item.geometry).length}</strong>
          </div>
        </div>

        <section
          className={`geo-editor-mode geo-editor-mode--${editorMode}${
            hasChanges ? " geo-editor-mode--dirty" : ""
          }`}
        >
          <strong>{buildModeLabel(editorMode)}</strong>
          <p>{buildModeHelp(editorMode, hasChanges)}</p>
        </section>

        <div className="geo-editor-actions">
          <button
            className={`ui-button ui-button--secondary${
              editorMode === "placing-point" ? " ui-button--active" : ""
            }`}
            onClick={() => runEditorAction("place-point")}
            type="button"
          >
            Colocar punto
          </button>
          <button
            className={`ui-button ui-button--secondary${
              editorMode === "drawing-polygon" ? " ui-button--active" : ""
            }`}
            onClick={() => runEditorAction("draw-polygon")}
            type="button"
          >
            Dibujar polígono
          </button>
          <button
            className={`ui-button ui-button--ghost${
              editorMode === "editing" ? " ui-button--active" : ""
            }`}
            disabled={!editorState.referencePoint && !editorState.geometry}
            onClick={() => runEditorAction("edit")}
            type="button"
          >
            Editar vértices
          </button>
          <button
            className="ui-button ui-button--ghost"
            onClick={() => runEditorAction("center")}
            type="button"
          >
            Centrar mapa
          </button>
          <button
            className={`ui-button ui-button--ghost${
              editorMode === "moving" ? " ui-button--active" : ""
            }`}
            disabled={!editorState.referencePoint && !editorState.geometry}
            onClick={() => runEditorAction("move")}
            type="button"
          >
            Mover geometrÃ­a
          </button>
          <button
            className="ui-button ui-button--ghost"
            disabled={!editorState.referencePoint}
            onClick={() => runEditorAction("delete-point")}
            type="button"
          >
            Eliminar punto
          </button>
          <button
            className="ui-button ui-button--ghost"
            disabled={!editorState.geometry}
            onClick={() => runEditorAction("delete-polygon")}
            type="button"
          >
            Eliminar polígono
          </button>
          <button
            className="ui-button ui-button--ghost"
            disabled={!canUndo}
            onClick={handleUndo}
            type="button"
          >
            Deshacer
          </button>
          <button
            className="ui-button ui-button--ghost"
            disabled={!canRedo}
            onClick={handleRedo}
            type="button"
          >
            Rehacer
          </button>
          <button
            className="ui-button ui-button--ghost"
            disabled={editorMode === "idle"}
            onClick={() => runEditorAction("stop")}
            type="button"
          >
            Finalizar modo
          </button>
        </div>

        {validation.issues.length > 0 ? (
          <div className="geo-editor-issues">
            {validation.issues.map((issue) => (
              <section
                className={`geo-editor-issue geo-editor-issue--${issue.severity}`}
                key={issue.code}
              >
                <p>{issue.message}</p>
              </section>
            ))}
          </div>
        ) : (
          <FeedbackBanner
            kind="success"
            message="Los geodatos actuales no presentan conflictos detectados."
          />
        )}

        {successMessage ? (
          <FeedbackBanner kind="success" message={successMessage} />
        ) : null}

        <div className="geo-editor-savebar">
          <button
            className="ui-button ui-button--ghost"
            disabled={!hasChanges || isSaving}
            onClick={handleCancelChanges}
            type="button"
          >
            Cancelar cambios
          </button>
          <button
            className="ui-button ui-button--primary"
            disabled={!hasChanges || !validation.canSave || isSaving}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? "Guardando..." : "Guardar geodatos"}
          </button>
        </div>
      </aside>

      <article className="panel geo-editor-map-panel">
        <ParcelaGeodatosMap
          action={editorAction}
          geometry={editorState.geometry}
          hasUnsavedChanges={hasChanges}
          neighbors={neighbors}
          onChange={updateEditorState}
          onModeChange={setEditorMode}
          referencePoint={editorState.referencePoint}
          resetKey={resetKey}
        />
      </article>
      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Reemplazar"
        description="Ya existe un polígono para esta parcela. Si continúas, el nuevo dibujo reemplazará el polígono actual cuando termines de dibujar."
        isLoading={false}
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={handleConfirmedAction}
        open={pendingConfirmation !== null}
        title="Reemplazar polígono"
        variant="warning"
      />
    </section>
  );

  async function loadData() {
    if (!session) {
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const nextParcela = await parcelasService.getById(session, parcelaId);
      const [nextNeighbors, nextSector] = await Promise.all([
        parcelasService.getValidationContext(session, nextParcela),
        sectoresService.getById(session, nextParcela.sectorId).catch(() => null)
      ]);
      const nextState = {
        referencePoint: cloneGeodata(nextParcela.geo?.point ?? nextParcela.referencePoint),
        geometry: cloneGeodata(nextParcela.geo?.polygon ?? nextParcela.geometry)
      };

      setParcela(nextParcela);
      setSector(nextSector);
      setNeighbors(nextNeighbors);
      setOriginalState(nextState);
      setEditorState(cloneEditorState(nextState));
      setHistory({ past: [], future: [] });
      setEditorMode("idle");
      setResetKey((currentKey) => currentKey + 1);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setErrorMessage(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  function runEditorAction(kind: GeoEditorActionKind) {
    if (kind === "draw-polygon" && editorState.geometry) {
      setPendingConfirmation(kind);
      return;
    }

    if (kind === "stop") {
      setEditorMode("idle");
    }

    setEditorAction({
      kind,
      nonce: Date.now()
    });
  }

  function handleConfirmedAction() {
    if (!pendingConfirmation) {
      return;
    }

    const actionToRun = pendingConfirmation;
    setPendingConfirmation(null);
    setEditorAction({
      kind: actionToRun,
      nonce: Date.now()
    });
  }

  function updateEditorState(nextState: EditorState) {
    setSuccessMessage(null);
    setEditorState((currentState) => {
      if (sameEditorState(currentState, nextState)) {
        return currentState;
      }

      setHistory((currentHistory) => ({
        past: [...currentHistory.past, cloneEditorState(currentState)].slice(
          -MAX_HISTORY_STEPS
        ),
        future: []
      }));

      return cloneEditorState(nextState);
    });
  }

  function handleUndo() {
    setHistory((currentHistory) => {
      const previousState = currentHistory.past[currentHistory.past.length - 1];

      if (!previousState) {
        return currentHistory;
      }

      setEditorState(() => {
        setResetKey((currentKey) => currentKey + 1);
        return cloneEditorState(previousState);
      });
      setEditorMode("idle");

      return {
        past: currentHistory.past.slice(0, -1),
        future: [
          cloneEditorState(editorStateRef.current),
          ...currentHistory.future
        ].slice(
          0,
          MAX_HISTORY_STEPS
        )
      };
    });
  }

  function handleRedo() {
    setHistory((currentHistory) => {
      const nextState = currentHistory.future[0];

      if (!nextState) {
        return currentHistory;
      }

      setEditorState(() => {
        setResetKey((currentKey) => currentKey + 1);
        return cloneEditorState(nextState);
      });
      setEditorMode("idle");

      return {
        past: [...currentHistory.past, cloneEditorState(editorStateRef.current)].slice(
          -MAX_HISTORY_STEPS
        ),
        future: currentHistory.future.slice(1)
      };
    });
  }

  function handleCancelChanges() {
    setSuccessMessage(null);
    setEditorState(cloneEditorState(originalState));
    setHistory({ past: [], future: [] });
    setEditorMode("idle");
    setResetKey((currentKey) => currentKey + 1);
  }

  async function handleSave() {
    if (!session || !parcela || !validation.canSave) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const updatedParcela = await parcelasService.update(session, parcela.id, {
        referencePoint: editorState.referencePoint,
        geometry: editorState.geometry
      });
      const nextState = {
        referencePoint: cloneGeodata(updatedParcela.geo?.point ?? updatedParcela.referencePoint),
        geometry: cloneGeodata(updatedParcela.geo?.polygon ?? updatedParcela.geometry)
      };

      setParcela(updatedParcela);
      setOriginalState(nextState);
      setEditorState(cloneEditorState(nextState));
      setHistory({ past: [], future: [] });
      setEditorMode("idle");
      setResetKey((currentKey) => currentKey + 1);
      setSuccessMessage("Geodatos guardados correctamente.");
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.statusCode === 401) {
        logout();
        return;
      }

      setErrorMessage(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }
}

function cloneEditorState(state: EditorState): EditorState {
  return {
    referencePoint: cloneGeodata(state.referencePoint),
    geometry: cloneGeodata(state.geometry)
  };
}

function sameEditorState(leftState: EditorState, rightState: EditorState) {
  return (
    areGeodataEqual(leftState.referencePoint, rightState.referencePoint) &&
    areGeodataEqual(leftState.geometry, rightState.geometry)
  );
}

function buildParcelaLabel(parcela: ParcelaListItem) {
  return parcela.name ? `${parcela.code} - ${parcela.name}` : parcela.code;
}

function buildGeodataStatus(state: EditorState) {
  if (state.referencePoint && state.geometry) {
    return "Completo";
  }

  if (state.referencePoint) {
    return "Solo punto";
  }

  if (state.geometry) {
    return "Solo polígono";
  }

  return "Sin geodatos";
}

function buildModeLabel(mode: GeoEditorMode) {
  const labels: Record<GeoEditorMode, string> = {
    idle: "Modo consulta",
    "placing-point": "Colocando punto",
    "drawing-polygon": "Dibujando polígono",
    editing: "Editando vértices",
    moving: "Moviendo geometría"
  };

  return labels[mode];
}

function buildModeHelp(mode: GeoEditorMode, hasChanges: boolean) {
  if (mode === "placing-point") {
    return "Haz click en el mapa para ubicar el punto de referencia. Puedes arrastrarlo después.";
  }

  if (mode === "drawing-polygon") {
    return "Haz click para agregar vértices y doble click para cerrar el polígono. El snapping se activa cerca de parcelas vecinas.";
  }

  if (mode === "editing") {
    return "Arrastra los vértices del punto o polígono. Usa Finalizar modo cuando termines.";
  }

  if (mode === "moving") {
    return "Arrastra el punto o el polígono completo para reposicionarlo. Usa Finalizar modo para bloquear la edición.";
  }

  return hasChanges
    ? "Hay cambios sin guardar. Puedes guardar, cancelar, deshacer o rehacer antes de salir."
    : "Selecciona una acción para editar los geodatos de la parcela.";
}
