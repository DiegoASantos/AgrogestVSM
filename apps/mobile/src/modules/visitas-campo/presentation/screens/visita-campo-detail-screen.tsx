import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppMap,
  AppButton,
  AppCard,
  AppDetailRow,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import {
  buildVisitDraftScopeKey,
  readVisitFormDraft
} from "../../../../shared/database/visit-form-drafts";
import { useConnectivity } from "../../../../shared/connectivity/use-connectivity";
import { toApiError } from "../../../../shared/services";
import { retryTransientSyncFailures, scheduleSync } from "../../../../shared/sync";
import { observacionesSanitariasService } from "../../../observaciones-sanitarias/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseCatalogItem
} from "../../../observaciones-sanitarias/types";
import {
  hasLegacyTechnicalDeleteForVisit,
  localTechnicalScoresService,
  pickMobileTechnicalScoreDetails,
  shouldConfirmTechnicalScoresFromServer,
  visitaDeletionService,
  visitaCampoCatalogsService,
  visitasCampoRemote,
  visitasCampoService
} from "../../services";
import {
  isReportActionActive,
  useReportSharing,
  type ActiveReportAction,
  type ReportKind
} from "../hooks/use-report-sharing";
import type {
  CampaniaCatalogItem,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  MobileTechnicalScoreView,
  VariedadCatalogItem,
  VisitaCampoFull,
  VisitaSyncSummary
} from "../../types";
import { canUserDeleteVisit } from "../../domain/visit-deletion-policy";
import { visitaRecetasService } from "../../../visita-recetas/services/visita-recetas.service";
import {
  buildProducerMixtureRows,
  type ProducerMixtureRow
} from "../../../visita-recetas/services/producer-recipe-mixture-plan";

type DetailCatalogs = {
  cultivos: CultivoCatalogItem[];
  variedades: VariedadCatalogItem[];
  campanias: CampaniaCatalogItem[];
  etapasFenologicas: EtapaFenologicaCatalogItem[];
  pestDiseases: PestDiseaseCatalogItem[];
  incidenceLevels: IncidenceLevelCatalogItem[];
};

const EMPTY_CATALOGS: DetailCatalogs = {
  cultivos: [],
  variedades: [],
  campanias: [],
  etapasFenologicas: [],
  pestDiseases: [],
  incidenceLevels: []
};

export function VisitaCampoDetailScreen() {
  const router = useRouter();
  const { ensureOnlineSession, session } = useAuthSession();
  const { isOnline } = useConnectivity();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const technicalScoreRequestId = useRef(0);

  const [detail, setDetail] = useState<VisitaCampoFull | null>(null);
  const [catalogs, setCatalogs] = useState<DetailCatalogs>(EMPTY_CATALOGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [mixtureRows, setMixtureRows] = useState<ProducerMixtureRow[]>([]);
  const [mixtureError, setMixtureError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<VisitaSyncSummary | null>(null);
  const [technicalScores, setTechnicalScores] = useState<MobileTechnicalScoreView | null>(
    null
  );
  const {
    activeAction: activeReportAction,
    captureHost,
    previewReport,
    promptShareReport
  } = useReportSharing({ onError: setReportError });

  useEffect(() => {
    if (!visitaId) {
      setCatalogs(EMPTY_CATALOGS);
      return;
    }

    void loadCatalogs();
  }, [visitaId]);

  useFocusEffect(
    useCallback(() => {
      if (!visitaId) {
        setIsLoading(false);
        setError("No se recibio una visita valida.");
        return undefined;
      }

      const requestId = ++technicalScoreRequestId.current;
      void loadVisita(visitaId, requestId);
      return () => {
        technicalScoreRequestId.current += 1;
      };
    }, [visitaId])
  );

  const visita = detail?.visita ?? null;
  const canDeleteVisit = visita
    ? canUserDeleteVisit({
        agronomistUserId: visita.agronomistUserId,
        canDeleteVisits: session.user?.canDeleteVisits,
        currentUserId: session.user?.userId
      })
    : false;
  const resumeModule = useMemo(() => {
    if (!visitaId || !session.user?.publicId) return null;
    const base = {
      ownerUserId: session.user.publicId,
      scopeKey: buildVisitDraftScopeKey(visitaId)
    };
    if (readVisitFormDraft({ ...base, moduleKey: "mezclas" })) return "mezclas";
    if (readVisitFormDraft({ ...base, moduleKey: "receta" })) return "receta";
    return null;
  }, [detail, session.user?.publicId, visitaId]);
  const visitMapPoints = useMemo(() => {
    if (!visita?.visitLocation) {
      return [];
    }

    const campaignLabel = getCatalogNameById(
      visita.campaignId,
      catalogs.campanias,
      "Sin campaña"
    );

    return [
      {
        id: `visita-location-${visita.id}`,
        geometry: visita.visitLocation,
        title: visita.nroFicha || `Visita ${visita.publicId}`,
        description: buildVisitMapDescription(visita, campaignLabel),
        pinColor: "#c77700"
      }
    ];
  }, [catalogs.campanias, visita]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando detalle de la visita...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error" subtitle={error} />
            <AppButton label="Volver" onPress={() => router.back()} />
          </AppCard>
        ) : null}

        {!isLoading && !error && visita && detail ? (
          <>
            <VisitDossier
              activeReportAction={activeReportAction}
              catalogs={catalogs}
              detail={detail}
              isRetrying={isRetrying}
              mixtureRows={mixtureRows}
              mixtureError={mixtureError}
              onPreviewReport={(action) => {
                setReportError(null);
                void previewReport(visita.id, action);
              }}
              onShareReport={(action) => {
                setReportError(null);
                promptShareReport(visita.id, action);
              }}
              onRetrySync={() => {
                void handleRetrySync();
              }}
              reportError={reportError}
              router={router}
              syncSummary={syncSummary}
              technicalScores={technicalScores}
              visitMapPoints={visitMapPoints}
            />

            {/*
              <>
                <AppCard>
                  <View style={styles.headerRow}>
                    <AppHeader
                      title={visita.nroFicha || `Visita #${visita.publicId.slice(0, 8)}`}
                      style={styles.headerText}
                    />
                    <AppStatusBadge
                      label={visita.isActive ? "Activa" : "Inactiva"}
                      variant={visita.isActive ? "success" : "neutral"}
                    />
                  </View>

                  <SyncStatusRow
                    syncSummary={syncSummary}
                    syncErrorMessage={detail.visita.syncErrorMessage}
                    isRetrying={isRetrying}
                    onRetry={() => {
                      void handleRetrySync();
                    }}
                  />

                  <View style={styles.details}>
                    <AppDetailRow label="Fecha visita" value={visita.visitDate} />
                    <AppDetailRow
                      label="Horario"
                      value={formatTimeRange(visita.startVisitTime, visita.endVisitTime)}
                    />
                    <AppDetailRow
                      label="Ubicacion"
                      value={visita.visitLocation ? "Punto registrado" : "Sin ubicacion"}
                    />
                    <AppDetailRow
                      label="Cultivo"
                      value={getCatalogNameById(visita.cropId, catalogs.cultivos)}
                    />
                    <AppDetailRow
                      label="Variedad"
                      value={getCatalogNameById(visita.varietyId, catalogs.variedades)}
                    />
                    <AppDetailRow
                      label="Campaña"
                      value={getCatalogNameById(visita.campaignId, catalogs.campanias)}
                    />
                    <AppDetailRow
                      label="Plantas"
                      value={formatNullableNumber(visita.plantsCount)}
                    />
                    <AppDetailRow
                      label="Fecha siembra"
                      value={visita.sowingDate || "No registrada"}
                    />
                    <AppDetailRow
                      label="Etapa fenol."
                      value={getCatalogNameById(
                        visita.phenologicalStageId,
                        catalogs.etapasFenologicas
                      )}
                    />
                    {visita.generalObservation ? (
                      <AppDetailRow
                        label="Observacion"
                        value={visita.generalObservation}
                        layout="stacked"
                      />
                    ) : null}
                  </View>
                </AppCard>

                <AppCard>
                  <AppHeader
                    title="Ubicacion de la visita"
                    subtitle={
                      visita.visitLocation
                        ? "Punto georreferenciado registrado para la visita."
                        : "La visita aun no tiene ubicacion registrada."
                    }
                  />
                  <AppMap
                    emptyMessage="La visita no tiene ubicacion disponible todavia."
                    points={visitMapPoints}
                  />
                </AppCard>

                <View style={styles.navGrid}>
                  <View style={styles.navRow}>
                    <NavCard
                      title="Nutricion"
                      count={detail.evaluaciones.length}
                      onPress={() =>
                        router.push({
                          pathname: "/visitas-campo/[id]/nutricion",
                          params: { id: visita.id }
                        })
                      }
                    />
                    <NavCard
                      title="Plagas y enfermedades"
                      count={detail.observacionesSanitarias.length}
                      onPress={() =>
                        router.push({
                          pathname: "/visitas-campo/[id]/observaciones-sanitarias",
                          params: { id: visita.id }
                        })
                      }
                    />
                  </View>

                  <View style={styles.navRow}>
                    <NavCard
                      title="Riego"
                      count={detail.riego ? 1 : 0}
                      onPress={() =>
                        router.push({
                          pathname: "/visitas-campo/[id]/riego",
                          params: { id: visita.id }
                        })
                      }
                    />
                    <NavCard
                      title="Labores culturales"
                      count={detail.laboresCulturales.length}
                      onPress={() =>
                        router.push({
                          pathname: "/visitas-campo/[id]/labores-culturales",
                          params: { id: visita.id }
                        })
                      }
                    />
                  </View>
                </View>

                <SectionCard
                  title="Nutricion"
                  subtitle={`${detail.evaluaciones.length} registradas`}
                >
                  {detail.evaluaciones.length === 0 ? (
                    <AppText variant="muted">No hay nutricion registrada.</AppText>
                  ) : (
                    detail.evaluaciones.map((evaluacion) => (
                      <DetailItemCard
                        key={evaluacion.id}
                        eyebrow={`Orden ${evaluacion.order}`}
                        subtitle={formatPercentage(evaluacion.percentage)}
                        title={evaluacion.description}
                      />
                    ))
                  )}
                </SectionCard>

                <SectionCard
                  title="Plagas y enfermedades"
                  subtitle={`${detail.observacionesSanitarias.length} registradas`}
                >
                  {detail.observacionesSanitarias.length === 0 ? (
                    <AppText variant="muted">
                      No hay observaciones sanitarias registradas.
                    </AppText>
                  ) : (
                    detail.observacionesSanitarias.map((observacion) => (
                      <DetailItemCard
                        key={observacion.id}
                        eyebrow={getPestDiseaseLabel(
                          observacion.pestDiseaseId,
                          catalogs.pestDiseases
                        )}
                        subtitle={formatSanitaryObservationSubtitle(
                          observacion,
                          catalogs.incidenceLevels
                        )}
                        title={observacion.observation || "Sin observacion detallada"}
                      />
                    ))
                  )}
                </SectionCard>
              </>
            */}

            <View style={styles.bottomActions}>
              {resumeModule && visitaId ? (
                <AppButton
                  icon="play-circle-outline"
                  label={
                    resumeModule === "mezclas" ? "Continuar mezclas" : "Continuar receta"
                  }
                  onPress={() =>
                    router.push({
                      pathname:
                        resumeModule === "mezclas"
                          ? "/visitas-campo/[id]/mezclas"
                          : "/visitas-campo/[id]/receta",
                      params: { id: visitaId }
                    })
                  }
                />
              ) : null}
              {canDeleteVisit ? (
                <AppButton
                  disabled={isDeleting}
                  icon="trash-outline"
                  label={isDeleting ? "Eliminando..." : "Eliminar visita"}
                  loading={isDeleting}
                  onPress={confirmDeleteVisit}
                  variant="danger"
                />
              ) : null}
              <AppButton label="Volver" onPress={() => router.back()} variant="outline" />
              <AppButton
                label="Ir al inicio"
                onPress={() => router.replace("/home")}
                variant="secondary"
              />
            </View>
          </>
        ) : null}
      </ScrollView>
      {captureHost}
    </ScreenContainer>
  );

  async function loadVisita(id: string, requestId: number) {
    setIsLoading(true);
    setError(null);

    try {
      const nextDetail = await visitasCampoService.getFullDetail(id);
      if (requestId !== technicalScoreRequestId.current) return;
      setDetail(nextDetail);
      loadMixtures(id);
      setSyncSummary(visitasCampoService.getVisitaSyncSummary(id));
      const localResult = localTechnicalScoresService.calculate(nextDetail);
      setTechnicalScores({
        ...localResult.scores,
        source: "local",
        pendingSync: localResult.pendingSync
      });
      setIsLoading(false);

      await loadVisitReferenceCatalogs(nextDetail.visita.cropId);

      if (
        shouldConfirmTechnicalScoresFromServer(
          nextDetail.visita.serverId,
          localResult.pendingSync
        )
      ) {
        try {
          const hasLegacyDelete = await hasLegacyTechnicalDeleteForVisit(
            nextDetail.visita.serverId!,
            localResult.legacyDeletes
          );
          if (requestId !== technicalScoreRequestId.current) return;
          if (hasLegacyDelete) {
            setTechnicalScores((current) =>
              current?.source === "local" ? { ...current, pendingSync: true } : current
            );
            return;
          }
          const serverScores = await visitasCampoRemote.getTechnicalScores(
            nextDetail.visita.serverId!
          );
          if (requestId === technicalScoreRequestId.current) {
            setTechnicalScores({
              ...pickMobileTechnicalScoreDetails(serverScores),
              source: "server",
              pendingSync: false
            });
          }
        } catch {
          // Se conserva el calculo local si la confirmacion remota no esta disponible.
        }
      }
    } catch (nextError) {
      if (requestId !== technicalScoreRequestId.current) return;
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el detalle.");
      setSyncSummary(null);
    } finally {
      if (requestId === technicalScoreRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  function loadMixtures(id: string) {
    try {
      const recipe = visitaRecetasService.getByVisitaId(id);
      const rows = recipe
        ? buildProducerMixtureRows(
            recipe,
            visitaRecetasService.getCatalogos().coadyuvantes
          )
        : [];
      setMixtureRows(rows);
      setMixtureError(null);
    } catch {
      setMixtureRows([]);
      setMixtureError("No se pudieron cargar las mezclas guardadas en el dispositivo.");
    }
  }

  async function loadCatalogs() {
    const results = await Promise.allSettled([
      observacionesSanitariasService.getPestDiseases(),
      observacionesSanitariasService.getIncidenceLevels()
    ]);

    setCatalogs((currentCatalogs) => ({
      ...currentCatalogs,
      pestDiseases: results[0].status === "fulfilled" ? results[0].value : [],
      incidenceLevels: results[1].status === "fulfilled" ? results[1].value : []
    }));
  }

  async function loadVisitReferenceCatalogs(cultivoId: string) {
    const results = await Promise.allSettled([
      visitaCampoCatalogsService.getCultivos(),
      visitaCampoCatalogsService.getVariedadesByCultivo(cultivoId),
      visitaCampoCatalogsService.getCampaniasByCultivo(cultivoId),
      visitaCampoCatalogsService.getEtapasFenologicasByCultivo(cultivoId)
    ]);

    setCatalogs((currentCatalogs) => ({
      ...currentCatalogs,
      cultivos: results[0].status === "fulfilled" ? results[0].value : [],
      variedades: results[1].status === "fulfilled" ? results[1].value : [],
      campanias: results[2].status === "fulfilled" ? results[2].value : [],
      etapasFenologicas: results[3].status === "fulfilled" ? results[3].value : []
    }));
  }

  async function handleRetrySync() {
    if (!visitaId || isRetrying) {
      return;
    }

    setIsRetrying(true);
    const requestId = ++technicalScoreRequestId.current;

    try {
      const requeued = retryTransientSyncFailures();

      if (requeued === 0) {
        visitasCampoService.retrySyncForVisita(visitaId);
      }
      await scheduleSync({
        bypassBackoff: true,
        immediate: true,
        manual: true
      });

      const updated = await visitasCampoService.getFullDetail(visitaId);
      if (requestId !== technicalScoreRequestId.current) return;
      setDetail(updated);
      loadMixtures(visitaId);
      const updatedSummary = visitasCampoService.getVisitaSyncSummary(visitaId);
      setSyncSummary(updatedSummary);
      const localResult = localTechnicalScoresService.calculate(updated);
      setTechnicalScores({
        ...localResult.scores,
        source: "local",
        pendingSync: localResult.pendingSync
      });

      if (
        shouldConfirmTechnicalScoresFromServer(
          updated.visita.serverId,
          localResult.pendingSync
        )
      ) {
        try {
          const hasLegacyDelete = await hasLegacyTechnicalDeleteForVisit(
            updated.visita.serverId!,
            localResult.legacyDeletes
          );
          if (requestId !== technicalScoreRequestId.current) return;
          if (hasLegacyDelete) {
            setTechnicalScores((current) =>
              current?.source === "local" ? { ...current, pendingSync: true } : current
            );
            return;
          }
          const serverScores = await visitasCampoRemote.getTechnicalScores(
            updated.visita.serverId!
          );
          if (requestId === technicalScoreRequestId.current) {
            setTechnicalScores({
              ...pickMobileTechnicalScoreDetails(serverScores),
              source: "server",
              pendingSync: false
            });
          }
        } catch {
          // Se conserva el calculo local si la confirmacion remota no esta disponible.
        }
      }
    } catch {
      // silencioso: el estado se actualiza en el siguiente ciclo
    } finally {
      setIsRetrying(false);
    }
  }

  function confirmDeleteVisit() {
    if (!visita || isDeleting) {
      return;
    }

    Alert.alert(
      "Eliminar visita",
      visita.serverId
        ? "La visita se desactivara en el servidor y se eliminara de este dispositivo."
        : "La visita aun no se sincronizo y se eliminara definitivamente de este dispositivo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => void handleDeleteVisit()
        }
      ]
    );
  }

  async function handleDeleteVisit() {
    if (!visita || !session.user || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await visitaDeletionService.remove(visita.id, {
        canDeleteVisits: session.user.canDeleteVisits,
        currentUserId: session.user.userId,
        ensureOnlineSession,
        isOnline
      });
      router.replace("/visitas-campo/historial");
    } catch (nextError) {
      const apiError = toApiError(nextError);
      Alert.alert(
        "No se pudo eliminar la visita",
        apiError.message || "La visita permanece guardada en el dispositivo."
      );
    } finally {
      setIsDeleting(false);
    }
  }
}

type VisitMapPoint = {
  id: string;
  geometry: NonNullable<VisitaCampoFull["visita"]["visitLocation"]>;
  title: string;
  description: string;
  pinColor: string;
};

type VisitDossierProps = {
  activeReportAction: ActiveReportAction | null;
  catalogs: DetailCatalogs;
  detail: VisitaCampoFull;
  isRetrying: boolean;
  mixtureRows: ProducerMixtureRow[];
  mixtureError: string | null;
  onPreviewReport: (action: ReportKind) => void;
  onShareReport: (action: ReportKind) => void;
  onRetrySync: () => void;
  reportError: string | null;
  router: ReturnType<typeof useRouter>;
  syncSummary: VisitaSyncSummary | null;
  technicalScores: MobileTechnicalScoreView | null;
  visitMapPoints: VisitMapPoint[];
};

function VisitDossier({
  activeReportAction,
  catalogs,
  detail,
  isRetrying,
  mixtureRows,
  mixtureError,
  onPreviewReport,
  onShareReport,
  onRetrySync,
  reportError,
  router,
  syncSummary,
  technicalScores,
  visitMapPoints
}: VisitDossierProps) {
  const { visita } = detail;
  const recordItems = buildRecordItems(detail, catalogs);

  return (
    <AppCard style={styles.dossierCard}>
      <View style={styles.dossierHeader}>
        <View style={styles.dossierIcon}>
          <Ionicons color={theme.colors.primaryDark} name="clipboard-outline" size={28} />
        </View>
        <View style={styles.headerText}>
          <AppText style={styles.dossierEyebrow} variant="eyebrow">
            Detalle de visita
          </AppText>
          <AppText style={styles.dossierTitle} variant="heading">
            {visita.nroFicha || `Visita #${visita.publicId.slice(0, 8)}`}
          </AppText>
          <AppText style={styles.dossierSubtitle} variant="caption">
            {getCatalogNameById(visita.cropId, catalogs.cultivos)} ·{" "}
            {getCatalogNameById(visita.varietyId, catalogs.variedades)}
          </AppText>
        </View>
        <AppStatusBadge
          label={visita.isActive ? "Activa" : "Inactiva"}
          variant={visita.isActive ? "success" : "neutral"}
        />
      </View>

      <SyncStatusRow
        syncSummary={syncSummary}
        syncErrorMessage={detail.visita.syncErrorMessage}
        isRetrying={isRetrying}
        onRetry={onRetrySync}
      />

      <View style={styles.visitFacts}>
        <View style={styles.factGrid}>
          <FactPill icon="calendar-outline" label="Fecha" value={visita.visitDate} />
          <FactPill
            icon="resize-outline"
            label="Área"
            value={visita.areaHectares ? `${visita.areaHectares} ha` : "No registrada"}
          />
        </View>
        <View style={styles.stagePanel}>
          <View style={styles.factLabelRow}>
            <Ionicons color={theme.colors.primary} name="leaf-outline" size={16} />
            <AppText style={styles.factLabel} variant="caption">
              Etapa
            </AppText>
          </View>
          <AppText style={styles.stageName} variant="label">
            {getCatalogNameById(visita.phenologicalStageId, catalogs.etapasFenologicas)}
          </AppText>
          <View style={styles.stageProgressHeading}>
            <AppText style={styles.factLabel} variant="caption">
              Avance de etapa
            </AppText>
            <AppText style={styles.stagePercentage} variant="label">
              {visita.subEtapaPercentage == null
                ? "---"
                : `${visita.subEtapaPercentage}%`}
            </AppText>
          </View>
          <View
            accessible
            accessibilityRole={visita.subEtapaPercentage == null ? "text" : "progressbar"}
            accessibilityLabel={
              visita.subEtapaPercentage == null
                ? "Avance de etapa no registrado"
                : "Avance de etapa"
            }
            accessibilityValue={
              visita.subEtapaPercentage == null
                ? undefined
                : { min: 0, max: 100, now: visita.subEtapaPercentage }
            }
            style={styles.stageProgressTrack}
          >
            {visita.subEtapaPercentage != null ? (
              <View
                style={[
                  styles.stageProgressFill,
                  { width: `${Math.min(100, Math.max(0, visita.subEtapaPercentage))}%` }
                ]}
              />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.recordPanel}>
        <View style={styles.inlineHeader}>
          <View style={styles.inlineHeaderCopy}>
            <AppText style={styles.sectionTitle} variant="label">
              Registros principales
            </AppText>
            <AppText style={styles.inlineSubtitle} variant="caption">
              Nutrición, plagas y enfermedades.
            </AppText>
          </View>
          <AppText
            style={styles.sectionCount}
            variant="label"
            accessibilityLabel={`${recordItems.length} registros`}
          >
            {recordItems.length}
          </AppText>
        </View>
        <View style={styles.recordFeed}>
          {recordItems.length === 0 ? (
            <AppText style={styles.sectionEmpty} variant="muted">
              Aun no hay evaluaciones ni observaciones sanitarias registradas.
            </AppText>
          ) : (
            recordItems.map((item) => (
              <RecordFeedItem
                key={item.id}
                eyebrow={item.eyebrow}
                icon={item.icon}
                metrics={item.metrics}
                title={item.title}
                observation={item.observation}
              />
            ))
          )}
        </View>
      </View>

      <VisitMixturesPanel rows={mixtureRows} error={mixtureError} />

      <View style={styles.pdfPanel}>
        <View style={styles.pdfPanelCopy}>
          <AppText style={styles.pdfPanelTitle} variant="label">
            Reportes de la visita
          </AppText>
          <AppText style={styles.pdfPanelSubtitle} variant="caption">
            Puedes abrir el PDF o compartir cada reporte como PDF o imagen.
          </AppText>
        </View>
        <View style={styles.pdfActions}>
          <AppButton
            disabled={activeReportAction !== null}
            icon="eye-outline"
            label="Ver diagnostico"
            loading={isReportActionActive(
              activeReportAction,
              visita.id,
              "diagnostico",
              "preview"
            )}
            onPress={() => onPreviewReport("diagnostico")}
            size="small"
            variant="outline"
          />
          <AppButton
            disabled={activeReportAction !== null}
            icon="share-outline"
            label="Compartir diagnostico"
            loading={
              isReportActionActive(activeReportAction, visita.id, "diagnostico") &&
              activeReportAction?.operation !== "preview"
            }
            onPress={() => onShareReport("diagnostico")}
            size="small"
          />
        </View>
        <View style={styles.pdfActions}>
          <AppButton
            disabled={activeReportAction !== null}
            icon="eye-outline"
            label="Ver receta"
            loading={isReportActionActive(
              activeReportAction,
              visita.id,
              "receta",
              "preview"
            )}
            onPress={() => onPreviewReport("receta")}
            size="small"
            variant="outline"
          />
          <AppButton
            disabled={activeReportAction !== null}
            icon="share-outline"
            label="Compartir receta"
            loading={
              isReportActionActive(activeReportAction, visita.id, "receta") &&
              activeReportAction?.operation !== "preview"
            }
            onPress={() => onShareReport("receta")}
            size="small"
          />
          <AppButton
            icon="create-outline"
            label="Editar receta"
            onPress={() =>
              router.push({
                pathname: "/visitas-campo/[id]/receta",
                params: { id: visita.id }
              })
            }
            size="small"
            variant="outline"
          />
        </View>
      </View>

      {reportError ? (
        <View style={styles.pdfErrorBanner}>
          <Ionicons color={theme.colors.error} name="warning-outline" size={18} />
          <AppText style={styles.pdfErrorText} variant="caption">
            {reportError}
          </AppText>
        </View>
      ) : null}

      {technicalScores ? (
        <>
          <View style={styles.technicalSourceNotice}>
            <Ionicons
              color={theme.colors.textMuted}
              name={
                technicalScores.source === "local"
                  ? "phone-portrait-outline"
                  : "cloud-done-outline"
              }
              size={16}
            />
            <AppText style={styles.technicalSourceText} variant="caption">
              {technicalScores.source === "local"
                ? technicalScores.pendingSync
                  ? "Calculado localmente · pendiente de sincronización."
                  : "Calculado con datos guardados en el dispositivo."
                : "Confirmado con los datos sincronizados."}
            </AppText>
          </View>
          <PestTechnicalScorePanel detail={technicalScores.detallePlagas} />
          <DiseaseTechnicalScorePanel detail={technicalScores.detalleEnfermedades} />
          <NutritionTechnicalScorePanel detail={technicalScores.detalleNutricion} />
          <RiegoTechnicalScorePanel detail={technicalScores.detalleRiego} />
          <LaborTechnicalScorePanel detail={technicalScores.detalleLabores} />
        </>
      ) : null}

      <View style={styles.unifiedDetails}>
        <AppDetailRow
          label="Campaña"
          value={getCatalogNameById(visita.campaignId, catalogs.campanias)}
        />
        <AppDetailRow
          label="Ubicacion"
          value={visita.visitLocation ? "Punto registrado" : "Sin ubicacion"}
        />
        {visita.generalObservation ? (
          <AppDetailRow
            label="Observacion"
            value={visita.generalObservation}
            layout="stacked"
          />
        ) : null}
      </View>

      <View style={styles.mapPanel}>
        <View style={styles.inlineHeader}>
          <View style={styles.inlineHeaderCopy}>
            <AppText style={styles.inlineTitle} variant="label">
              Ubicacion de campo
            </AppText>
            <AppText style={styles.inlineSubtitle} variant="caption">
              {visita.visitLocation
                ? "Punto georreferenciado registrado."
                : "Sin punto georreferenciado."}
            </AppText>
          </View>
          <Ionicons color={theme.colors.primary} name="map-outline" size={22} />
        </View>
        <AppMap
          emptyMessage="La visita no tiene ubicacion disponible todavia."
          points={visitMapPoints}
        />
      </View>

      <View style={styles.moduleGrid}>
        <ModuleStatusCard
          count={detail.evaluaciones.length}
          icon="nutrition-outline"
          title="Nutricion"
          onPress={() =>
            router.push({
              pathname: "/visitas-campo/[id]/nutricion",
              params: { id: visita.id }
            })
          }
        />
        <ModuleStatusCard
          count={detail.observacionesSanitarias.length}
          icon="bug-outline"
          title="Sanidad"
          onPress={() =>
            router.push({
              pathname: "/visitas-campo/[id]/observaciones-sanitarias",
              params: { id: visita.id }
            })
          }
        />
        <ModuleStatusCard
          count={detail.riego ? 1 : 0}
          icon="water-outline"
          title="Riego"
          onPress={() =>
            router.push({
              pathname: "/visitas-campo/[id]/riego",
              params: { id: visita.id }
            })
          }
        />
        <ModuleStatusCard
          count={detail.laboresCulturales.length}
          icon="construct-outline"
          title="Labores"
          onPress={() =>
            router.push({
              pathname: "/visitas-campo/[id]/labores-culturales",
              params: { id: visita.id }
            })
          }
        />
      </View>
    </AppCard>
  );
}

function VisitMixturesPanel({
  rows,
  error
}: {
  rows: ProducerMixtureRow[];
  error: string | null;
}) {
  const groups = new Map<number | null, ProducerMixtureRow[]>();
  for (const row of rows) {
    const group = groups.get(row.mixtureNumber) ?? [];
    group.push(row);
    groups.set(row.mixtureNumber, group);
  }

  return (
    <View style={styles.recordPanel}>
      <AppText style={styles.sectionTitle} variant="label">
        Mezclas recetadas
      </AppText>
      {error ? (
        <AppText style={styles.pdfErrorText} variant="caption" accessibilityRole="alert">
          {error}
        </AppText>
      ) : rows.length === 0 ? (
        <AppText style={styles.sectionEmpty} variant="muted">
          Sin mezclas registradas
        </AppText>
      ) : (
        [...groups].map(([number, items]) => (
          <View key={number ?? "unassigned"} style={styles.mixtureCard}>
            <View style={styles.mixtureHeader}>
              <Ionicons name="flask-outline" color={theme.colors.textInverse} size={21} />
              <AppText style={styles.mixtureTitle} variant="label">
                {number === null ? "Sin mezcla" : `Mezcla ${number}`}
              </AppText>
            </View>
            <View style={styles.mixtureFrequency}>
              <Ionicons name="repeat-outline" color={theme.colors.primary} size={18} />
              <View style={styles.mixtureFrequencyCopy}>
                <AppText style={styles.detailLabel} variant="caption">
                  Frecuencia
                </AppText>
                <AppText style={styles.detailValue} variant="label">
                  {items[0].doseFrequency}
                </AppText>
              </View>
            </View>
            <View style={styles.mixtureProducts}>
              {items.map((item, index) => (
                <View
                  key={item.order}
                  style={[
                    styles.mixtureProduct,
                    index > 0 && styles.mixtureProductDivider
                  ]}
                >
                  <View style={styles.mixtureProductHeading}>
                    <AppText
                      style={styles.mixtureOrder}
                      variant="caption"
                      accessibilityLabel={`Orden ${item.order}`}
                    >
                      {item.order}
                    </AppText>
                    <AppText style={styles.mixtureProductName} variant="label">
                      {item.item}
                    </AppText>
                  </View>
                  <View style={styles.mixtureIngredient}>
                    <AppText style={styles.detailLabel} variant="caption">
                      Ingrediente activo
                    </AppText>
                    <AppText style={styles.detailValue} variant="body">
                      {item.activeIngredient}
                    </AppText>
                  </View>
                  <View style={styles.mixtureDose}>
                    <AppText style={styles.doseLabel} variant="caption">
                      Dosis
                    </AppText>
                    <AppText style={styles.doseValue} variant="label">
                      {item.dose}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function PestTechnicalScorePanel({
  detail
}: {
  detail: MobileTechnicalScoreView["detallePlagas"];
}) {
  if (!detail) {
    return (
      <View style={styles.technicalPanel}>
        <View style={styles.technicalHeader}>
          <View style={styles.technicalIcon}>
            <Ionicons color={theme.colors.textMuted} name="bug-outline" size={20} />
          </View>
          <View style={styles.headerText}>
            <AppText style={styles.technicalEyebrow} variant="eyebrow">
              Scores técnicos por módulo
            </AppText>
            <AppText style={styles.technicalTitle} variant="label">
              Plagas
            </AppText>
          </View>
        </View>
        <AppText style={styles.technicalSubtitle} variant="caption">
          Pendiente de finalizar la evaluación de Plagas.
        </AppText>
      </View>
    );
  }

  const colors = getPestSemaphoreColors(detail.semaphore);

  return (
    <View
      style={[
        styles.technicalPanel,
        { backgroundColor: colors.background, borderColor: colors.accent }
      ]}
    >
      <View style={styles.technicalHeader}>
        <View style={[styles.technicalIcon, { backgroundColor: colors.iconBackground }]}>
          <Ionicons color={colors.accent} name="bug-outline" size={20} />
        </View>
        <View style={styles.headerText}>
          <AppText
            style={[styles.technicalEyebrow, { color: colors.accent }]}
            variant="eyebrow"
          >
            Scores técnicos por módulo
          </AppText>
          <AppText style={styles.technicalTitle} variant="label">
            Plagas
          </AppText>
        </View>
        <View style={styles.technicalResult}>
          <AppText
            style={[styles.technicalValue, { color: colors.accent }]}
            variant="heading"
          >
            {detail.moduleScore} / 3
          </AppText>
          <AppText style={styles.technicalPercentage} variant="caption">
            {detail.modulePercentage.toFixed(2)}%
          </AppText>
        </View>
      </View>
      <View style={[styles.technicalStatus, { borderLeftColor: colors.accent }]}>
        <AppText
          style={[styles.technicalStatusTitle, { color: colors.accent }]}
          variant="label"
        >
          {detail.status}
        </AppText>
        <AppText style={styles.technicalSubtitle} variant="caption">
          {detail.message}
        </AppText>
      </View>
    </View>
  );
}

function DiseaseTechnicalScorePanel({
  detail
}: {
  detail: MobileTechnicalScoreView["detalleEnfermedades"];
}) {
  if (!detail) {
    return (
      <View style={styles.technicalPanel}>
        <View style={styles.technicalHeader}>
          <View style={styles.technicalIcon}>
            <Ionicons color={theme.colors.textMuted} name="leaf-outline" size={20} />
          </View>
          <View style={styles.headerText}>
            <AppText style={styles.technicalEyebrow} variant="eyebrow">
              Scores técnicos por módulo
            </AppText>
            <AppText style={styles.technicalTitle} variant="label">
              Enfermedades
            </AppText>
          </View>
        </View>
        <AppText style={styles.technicalSubtitle} variant="caption">
          Pendiente de finalizar la evaluación de Enfermedades.
        </AppText>
      </View>
    );
  }

  const colors = getPestSemaphoreColors(detail.semaphore);

  return (
    <View
      style={[
        styles.technicalPanel,
        { backgroundColor: colors.background, borderColor: colors.accent }
      ]}
    >
      <View style={styles.technicalHeader}>
        <View style={[styles.technicalIcon, { backgroundColor: colors.iconBackground }]}>
          <Ionicons color={colors.accent} name="leaf-outline" size={20} />
        </View>
        <View style={styles.headerText}>
          <AppText
            style={[styles.technicalEyebrow, { color: colors.accent }]}
            variant="eyebrow"
          >
            Scores técnicos por módulo
          </AppText>
          <AppText style={styles.technicalTitle} variant="label">
            Enfermedades
          </AppText>
        </View>
        <View style={styles.technicalResult}>
          <AppText
            style={[styles.technicalValue, { color: colors.accent }]}
            variant="heading"
          >
            {detail.moduleScore} / 3
          </AppText>
        </View>
      </View>
      <View style={[styles.technicalStatus, { borderLeftColor: colors.accent }]}>
        <AppText
          style={[styles.technicalStatusTitle, { color: colors.accent }]}
          variant="label"
        >
          {detail.status}
        </AppText>
        <AppText style={styles.technicalSubtitle} variant="caption">
          {detail.message}
        </AppText>
      </View>
    </View>
  );
}

function NutritionTechnicalScorePanel({
  detail
}: {
  detail: MobileTechnicalScoreView["detalleNutricion"];
}) {
  if (!detail) {
    return (
      <View style={styles.technicalPanel}>
        <View style={styles.technicalHeader}>
          <View style={styles.technicalIcon}>
            <Ionicons color={theme.colors.textMuted} name="nutrition-outline" size={20} />
          </View>
          <View style={styles.headerText}>
            <AppText style={styles.technicalEyebrow} variant="eyebrow">
              Scores técnicos por módulo
            </AppText>
            <AppText style={styles.technicalTitle} variant="label">
              Nutrición
            </AppText>
          </View>
        </View>
        <AppText style={styles.technicalSubtitle} variant="caption">
          Pendiente de finalizar la evaluación de Nutrición.
        </AppText>
      </View>
    );
  }

  const colors = getPestSemaphoreColors(detail.semaphore);

  return (
    <View
      style={[
        styles.technicalPanel,
        { backgroundColor: colors.background, borderColor: colors.accent }
      ]}
    >
      <View style={styles.technicalHeader}>
        <View style={[styles.technicalIcon, { backgroundColor: colors.iconBackground }]}>
          <Ionicons color={colors.accent} name="nutrition-outline" size={20} />
        </View>
        <View style={styles.headerText}>
          <AppText
            style={[styles.technicalEyebrow, { color: colors.accent }]}
            variant="eyebrow"
          >
            Score técnico por módulo
          </AppText>
          <AppText style={styles.technicalTitle} variant="label">
            Nutrición
          </AppText>
        </View>
        <View style={styles.technicalResult}>
          <AppText
            style={[styles.technicalValue, { color: colors.accent }]}
            variant="heading"
          >
            {detail.moduleScore} / 3
          </AppText>
        </View>
      </View>
      <View style={[styles.technicalStatus, { borderLeftColor: colors.accent }]}>
        <AppText
          style={[styles.technicalStatusTitle, { color: colors.accent }]}
          variant="label"
        >
          {detail.status}
        </AppText>
        <AppText style={styles.technicalSubtitle} variant="caption">
          {detail.message}
        </AppText>
      </View>
    </View>
  );
}

function RiegoTechnicalScorePanel({
  detail
}: {
  detail: MobileTechnicalScoreView["detalleRiego"];
}) {
  if (!detail) {
    return (
      <View style={styles.technicalPanel}>
        <View style={styles.technicalHeader}>
          <View style={styles.technicalIcon}>
            <Ionicons color={theme.colors.textMuted} name="water-outline" size={20} />
          </View>
          <View style={styles.headerText}>
            <AppText style={styles.technicalEyebrow} variant="eyebrow">
              Scores técnicos por módulo
            </AppText>
            <AppText style={styles.technicalTitle} variant="label">
              Riego
            </AppText>
          </View>
        </View>
        <AppText style={styles.technicalSubtitle} variant="caption">
          Pendiente de registrar la evaluacion de Riego.
        </AppText>
      </View>
    );
  }

  const colors = getPestSemaphoreColors(detail.semaphore);

  return (
    <View
      style={[
        styles.technicalPanel,
        { backgroundColor: colors.background, borderColor: colors.accent }
      ]}
    >
      <View style={styles.technicalHeader}>
        <View style={[styles.technicalIcon, { backgroundColor: colors.iconBackground }]}>
          <Ionicons color={colors.accent} name="water-outline" size={20} />
        </View>
        <View style={styles.headerText}>
          <AppText
            style={[styles.technicalEyebrow, { color: colors.accent }]}
            variant="eyebrow"
          >
            Scores técnicos por módulo
          </AppText>
          <AppText style={styles.technicalTitle} variant="label">
            Riego
          </AppText>
        </View>
        <View style={styles.technicalResult}>
          <AppText
            style={[styles.technicalValue, { color: colors.accent }]}
            variant="heading"
          >
            {detail.moduleScore} / 3
          </AppText>
        </View>
      </View>
      <View style={[styles.technicalStatus, { borderLeftColor: colors.accent }]}>
        <AppText
          style={[styles.technicalStatusTitle, { color: colors.accent }]}
          variant="label"
        >
          {detail.status}
        </AppText>
        <AppText style={styles.technicalSubtitle} variant="caption">
          {detail.message}
        </AppText>
      </View>
    </View>
  );
}

function LaborTechnicalScorePanel({
  detail
}: {
  detail: MobileTechnicalScoreView["detalleLabores"];
}) {
  if (!detail) {
    return (
      <View style={styles.technicalPanel}>
        <View style={styles.technicalHeader}>
          <View style={styles.technicalIcon}>
            <Ionicons color={theme.colors.textMuted} name="construct-outline" size={20} />
          </View>
          <View style={styles.headerText}>
            <AppText style={styles.technicalEyebrow} variant="eyebrow">
              Scores técnicos por módulo
            </AppText>
            <AppText style={styles.technicalTitle} variant="label">
              Labores culturales
            </AppText>
          </View>
        </View>
        <AppText style={styles.technicalSubtitle} variant="caption">
          Pendiente de registrar las labores culturales.
        </AppText>
      </View>
    );
  }

  const colors = getPestSemaphoreColors(detail.semaphore);

  return (
    <View
      style={[
        styles.technicalPanel,
        { backgroundColor: colors.background, borderColor: colors.accent }
      ]}
    >
      <View style={styles.technicalHeader}>
        <View style={[styles.technicalIcon, { backgroundColor: colors.iconBackground }]}>
          <Ionicons color={colors.accent} name="construct-outline" size={20} />
        </View>
        <View style={styles.headerText}>
          <AppText
            style={[styles.technicalEyebrow, { color: colors.accent }]}
            variant="eyebrow"
          >
            Scores técnicos por módulo
          </AppText>
          <AppText style={styles.technicalTitle} variant="label">
            Labores culturales
          </AppText>
        </View>
        <View style={styles.technicalResult}>
          <AppText
            style={[styles.technicalValue, { color: colors.accent }]}
            variant="heading"
          >
            {detail.moduleScore} / 3
          </AppText>
          <AppText style={styles.technicalPercentage} variant="caption">
            {detail.modulePercentage.toFixed(2)}%
          </AppText>
        </View>
      </View>
      <View style={[styles.technicalStatus, { borderLeftColor: colors.accent }]}>
        <AppText
          style={[styles.technicalStatusTitle, { color: colors.accent }]}
          variant="label"
        >
          {detail.status}
        </AppText>
        <AppText style={styles.technicalSubtitle} variant="caption">
          {detail.message}
        </AppText>
      </View>
    </View>
  );
}

function getPestSemaphoreColors(semaphore: "verde" | "amarillo" | "rojo") {
  if (semaphore === "rojo") {
    return {
      accent: theme.colors.error,
      background: theme.colors.errorMuted,
      iconBackground: "#f8d7d3"
    };
  }
  if (semaphore === "amarillo") {
    return {
      accent: theme.colors.warning,
      background: theme.colors.warningMuted,
      iconBackground: "#fcebc2"
    };
  }
  return {
    accent: theme.colors.success,
    background: theme.colors.successMuted,
    iconBackground: theme.colors.primaryMuted
  };
}

function SyncStatusRow({
  syncSummary,
  syncErrorMessage,
  isRetrying,
  onRetry
}: {
  syncSummary: VisitaSyncSummary | null;
  syncErrorMessage?: string | null;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  if (!syncSummary) {
    return null;
  }

  const badgeVariant = getSyncBadgeVariant(syncSummary.overallStatus);

  return (
    <View style={styles.syncRow}>
      <AppStatusBadge label={formatSyncSummary(syncSummary)} variant={badgeVariant} />
      {syncErrorMessage ? (
        <AppText variant="caption" style={styles.syncErrorText}>
          {syncErrorMessage}
        </AppText>
      ) : null}
      {shouldShowRetry(syncSummary) ? (
        <AppButton
          label={isRetrying ? "Reintentando..." : "Reintentar sync"}
          onPress={onRetry}
          disabled={isRetrying}
          loading={isRetrying}
          variant="outline"
          size="small"
        />
      ) : null}
    </View>
  );
}

function FactPill({
  icon,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.factPill}>
      <View style={styles.factLabelRow}>
        <Ionicons color={theme.colors.primary} name={icon} size={16} />
        <AppText style={styles.factLabel} variant="caption">
          {label}
        </AppText>
      </View>
      <AppText style={styles.factValue} variant="label">
        {value}
      </AppText>
    </View>
  );
}

function ModuleStatusCard({
  count,
  icon,
  onPress,
  title
}: {
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  const hasData = count > 0;

  return (
    <Pressable
      accessibilityLabel={`${title}: ${hasData ? `${count} registros` : "sin registro"}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.moduleCard,
        hasData ? styles.moduleCardDone : styles.moduleCardPending,
        pressed && styles.moduleCardPressed
      ]}
    >
      <View style={styles.moduleIcon}>
        <Ionicons color={theme.colors.primaryDark} name={icon} size={20} />
      </View>
      <View style={styles.moduleCopy}>
        <AppText style={styles.moduleTitle} variant="label">
          {title}
        </AppText>
        <AppText style={styles.moduleSubtitle} variant="caption">
          {hasData ? `${count} registro${count === 1 ? "" : "s"}` : "Sin registro"}
        </AppText>
      </View>
      <Ionicons color={theme.colors.primaryDark} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function RecordFeedItem({
  eyebrow,
  icon,
  metrics,
  title,
  observation
}: {
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
  metrics: Array<{ label: string; value: string }>;
  title: string;
  observation?: string;
}) {
  return (
    <View style={styles.recordItem}>
      <View style={styles.recordCategory}>
        <Ionicons color={theme.colors.primary} name={icon} size={16} />
        <AppText style={styles.recordEyebrow} variant="caption">
          {eyebrow}
        </AppText>
      </View>
      <AppText style={styles.recordTitle} variant="label">
        {title}
      </AppText>
      <View style={styles.recordMetrics}>
        {metrics.map((metric) => (
          <View
            key={metric.label}
            style={[
              styles.recordMetric,
              metric.label === "Órganos" && styles.recordMetricFull
            ]}
          >
            <AppText style={styles.detailLabel} variant="caption">
              {metric.label}
            </AppText>
            <AppText style={styles.detailValue} variant="label">
              {metric.value}
            </AppText>
          </View>
        ))}
      </View>
      {observation ? (
        <View style={styles.recordObservation}>
          <AppText style={styles.detailLabel} variant="caption">
            Observación registrada
          </AppText>
          <AppText style={styles.detailValue} variant="body">
            {observation}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function buildRecordItems(detail: VisitaCampoFull, catalogs: DetailCatalogs) {
  const nutritionItems = detail.evaluaciones.map((evaluacion) => ({
    id: `nutricion-${evaluacion.id}`,
    eyebrow: `Nutrición · Orden ${evaluacion.order}`,
    icon: "nutrition-outline" as const,
    metrics: [{ label: "Porcentaje", value: formatPercentage(evaluacion.percentage) }],
    title: evaluacion.description,
    observation: undefined
  }));

  const sanitaryItems = detail.observacionesSanitarias.map((observacion) => {
    const type = catalogs.pestDiseases.find(
      (item) => item.id === observacion.pestDiseaseId
    )?.type;
    return {
      id: `sanidad-${observacion.id}`,
      eyebrow:
        type === "plaga" ? "Plaga" : type === "enfermedad" ? "Enfermedad" : "Sanidad",
      icon:
        type === "enfermedad" ? ("medkit-outline" as const) : ("bug-outline" as const),
      metrics: buildSanitaryObservationMetrics(observacion, catalogs.incidenceLevels),
      title: getPestDiseaseLabel(observacion.pestDiseaseId, catalogs.pestDiseases),
      observation: observacion.observation?.trim() || undefined
    };
  });

  return [...nutritionItems, ...sanitaryItems];
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatPercentage(value: string | null) {
  if (!value) {
    return "Sin porcentaje";
  }

  return `${value}%`;
}

function getPestDiseaseLabel(id: string, pestDiseases: PestDiseaseCatalogItem[]) {
  return pestDiseases.find((pestDisease) => pestDisease.id === id)?.name || `ID ${id}`;
}

function getCatalogNameById<T extends { id: string; name: string }>(
  id: string | null,
  items: T[],
  emptyLabel = "No registrado"
) {
  if (!id) {
    return emptyLabel;
  }

  return items.find((item) => item.id === id)?.name || `ID ${id}`;
}

function getIncidenceLevelLabel(
  id: string | null,
  incidenceLevels: IncidenceLevelCatalogItem[]
) {
  if (id === null) {
    return "Sin nivel registrado";
  }

  return (
    incidenceLevels.find((incidenceLevel) => incidenceLevel.id === id)?.name || `ID ${id}`
  );
}

function buildSanitaryObservationMetrics(
  observacion: VisitaCampoFull["observacionesSanitarias"][number],
  incidenceLevels: IncidenceLevelCatalogItem[]
) {
  const metrics = [
    {
      label: "Incidencia",
      value: getIncidenceLevelLabel(observacion.incidenceLevelId, incidenceLevels)
    }
  ];
  if (observacion.severityLevelId) {
    metrics.push({
      label: "Severidad",
      value: getIncidenceLevelLabel(observacion.severityLevelId, incidenceLevels)
    });
  }
  metrics.push({
    label: "Órganos",
    value:
      observacion.organosAfectados.length > 0
        ? observacion.organosAfectados.map(formatOrganoLabel).join(", ")
        : "No registrados"
  });
  return metrics;
}

function formatOrganoLabel(value: string) {
  switch (value) {
    case "tronco_rama":
      return "Tronco/rama";
    case "yema_apical":
      return "Yema apical";
    case "brote_vegetativo":
      return "Brote vegetativo";
    case "hoja":
      return "Hoja tierna";
    case "hoja_tierna":
      return "Hoja tierna";
    case "hoja_madura":
      return "Hoja madura";
    case "panicula_floral":
      return "Panícula floral";
    case "flor_individual":
      return "Flor individual";
    case "fruto_recien_cuajado":
      return "Fruto recién cuajado";
    case "fruto_verde":
      return "Fruto verde";
    case "fruto_maduro":
      return "Fruto maduro";
    case "raices":
      return "Raices";
    default:
      return value;
  }
}

function formatSyncSummary(summary: VisitaSyncSummary) {
  const count = `${summary.syncedCount}/${summary.totalEntities}`;

  switch (summary.overallStatus) {
    case "synced":
      return `Sincronizado (${count})`;
    case "partial":
      return `Parcial (${count})`;
    case "error":
      return summary.errorCount > 0 ? `Error (${summary.errorCount})` : "Error";
    default:
      return `Pendiente (${count})`;
  }
}

function getSyncBadgeVariant(status: VisitaSyncSummary["overallStatus"]) {
  if (status === "synced") return "success" as const;
  if (status === "error") return "error" as const;
  if (status === "partial") return "warning" as const;
  return "neutral" as const;
}

function shouldShowRetry(summary: VisitaSyncSummary | null) {
  if (!summary) {
    return false;
  }

  return (
    summary.overallStatus === "error" ||
    (summary.overallStatus === "partial" && summary.errorCount > 0)
  );
}

function buildVisitMapDescription(
  visita: VisitaCampoFull["visita"],
  campaignLabel: string
) {
  return [
    `Fecha ${visita.visitDate}`,
    `Parcela ${visita.parcelaId}`,
    `Campaña ${campaignLabel}`
  ].join(" | ");
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  dossierCard: {
    gap: 18,
    padding: 18
  },
  dossierHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  dossierIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  dossierEyebrow: {
    color: theme.colors.primary,
    fontSize: 11
  },
  dossierTitle: {
    color: theme.colors.primaryDark,
    fontSize: 22,
    lineHeight: 27
  },
  dossierSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 18
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerText: {
    flex: 1
  },
  syncRow: {
    gap: 8
  },
  technicalPanel: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  technicalSourceNotice: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  technicalSourceText: {
    color: theme.colors.textMuted,
    flex: 1
  },
  technicalHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  technicalIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  technicalEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 10
  },
  technicalTitle: {
    color: theme.colors.primaryDark,
    fontSize: 17
  },
  technicalResult: {
    alignItems: "flex-end"
  },
  technicalValue: {
    color: theme.colors.primaryDark,
    fontSize: 22
  },
  technicalPercentage: {
    color: theme.colors.textMuted,
    fontSize: 11
  },
  technicalStatus: {
    borderLeftWidth: 3,
    gap: 4,
    paddingLeft: 11
  },
  technicalStatusTitle: {
    fontSize: 14
  },
  technicalSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 18
  },
  syncErrorText: {
    color: theme.colors.error
  },
  details: {
    gap: 2
  },
  pdfPanel: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  pdfPanelCopy: {
    gap: 3
  },
  pdfPanelTitle: {
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  pdfPanelSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 17
  },
  pdfActions: {
    gap: 8
  },
  pdfErrorBanner: {
    alignItems: "center",
    backgroundColor: theme.colors.errorMuted,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pdfErrorText: {
    color: theme.colors.error,
    flex: 1
  },
  visitFacts: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden"
  },
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    padding: 16
  },
  factPill: {
    flexBasis: "43%",
    flexGrow: 1,
    minWidth: 100,
    gap: 6
  },
  factLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  factLabel: {
    color: theme.colors.primary,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18
  },
  factValue: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 23,
    fontVariant: ["tabular-nums"]
  },
  stagePanel: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    gap: 8,
    padding: 16
  },
  stageName: {
    color: theme.colors.primaryDark,
    fontSize: 18,
    lineHeight: 25
  },
  stageProgressHeading: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 6
  },
  stagePercentage: {
    color: theme.colors.primaryDark,
    fontSize: 19,
    lineHeight: 26,
    fontVariant: ["tabular-nums"]
  },
  stageProgressTrack: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.full,
    height: 6,
    overflow: "hidden"
  },
  stageProgressFill: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: "100%"
  },
  unifiedDetails: {
    backgroundColor: "#fbfdf9",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  mapPanel: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    padding: 12
  },
  inlineHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  inlineHeaderCopy: {
    flex: 1,
    gap: 2
  },
  inlineTitle: {
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  inlineSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 17
  },
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  moduleCard: {
    alignItems: "center",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexBasis: "47%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 10,
    minHeight: 72,
    padding: 12
  },
  moduleCardDone: {
    backgroundColor: "#eef9e8",
    borderColor: "#b7dfb4"
  },
  moduleCardPending: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight
  },
  moduleCardPressed: {
    opacity: 0.78
  },
  moduleIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.full,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  moduleCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  moduleTitle: {
    color: theme.colors.primaryDark,
    fontSize: 14
  },
  moduleSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12
  },
  recordPanel: {
    gap: 14
  },
  sectionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18,
    lineHeight: 25
  },
  sectionCount: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.primaryDark,
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: "center"
  },
  sectionEmpty: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 16
  },
  recordFeed: {
    gap: 12
  },
  recordItem: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  recordCategory: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  recordEyebrow: {
    color: theme.colors.primary,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18
  },
  recordTitle: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 23
  },
  recordMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  recordMetric: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    flexBasis: "44%",
    flexGrow: 1,
    gap: 3,
    minWidth: 90,
    padding: 10
  },
  recordMetricFull: {
    flexBasis: "100%"
  },
  detailLabel: {
    color: "#52665a",
    fontSize: 12,
    lineHeight: 18
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21
  },
  recordObservation: {
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10
  },
  mixtureCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: "hidden"
  },
  mixtureHeader: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryDark,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  mixtureTitle: {
    color: theme.colors.textInverse,
    flex: 1,
    fontSize: 17,
    lineHeight: 24
  },
  mixtureFrequency: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderBottomColor: theme.colors.borderLight,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  mixtureFrequencyCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  mixtureProducts: {
    paddingHorizontal: 14
  },
  mixtureProduct: {
    gap: 10,
    paddingVertical: 16
  },
  mixtureProductDivider: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1
  },
  mixtureProductHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10
  },
  mixtureOrder: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 20,
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  mixtureProductName: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minWidth: 0
  },
  mixtureIngredient: {
    gap: 2
  },
  mixtureDose: {
    alignItems: "center",
    backgroundColor: "#eef7f0",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  doseLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    lineHeight: 18
  },
  doseValue: {
    color: theme.colors.primaryDark,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 22
  },
  navGrid: {
    gap: 10
  },
  navRow: {
    flexDirection: "row",
    gap: 10
  },
  navCard: {
    flex: 1,
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.sm
  },
  navCardPressed: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primaryLight
  },
  navCount: {
    fontSize: 24,
    color: theme.colors.primary
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionItems: {
    gap: 8
  },
  itemCard: {
    gap: 4,
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderLight
  },
  itemEyebrow: {
    fontSize: 11
  },
  bottomActions: {
    gap: 10,
    paddingBottom: 12
  }
});
