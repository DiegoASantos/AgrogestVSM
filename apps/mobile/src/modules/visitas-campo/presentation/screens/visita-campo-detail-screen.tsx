import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";

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
import { toApiError } from "../../../../shared/services";
import { retryTransientSyncFailures, scheduleSync } from "../../../../shared/sync";
import { observacionesSanitariasService } from "../../../observaciones-sanitarias/services";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseCatalogItem
} from "../../../observaciones-sanitarias/types";
import {
  hasLegacyTechnicalDeleteForVisit,
  localTechnicalScoresService,
  pickMobileTechnicalScoreDetails,
  shouldConfirmTechnicalScoresFromServer,
  visitaCampoCatalogsService,
  visitasCampoRemote,
  visitasCampoService
} from "../../services";
import { visitaPdfReportService } from "../../services/visita-pdf-report.service";
import { visitaRecetaPdfReportService } from "../../../visita-recetas/services";
import type {
  CampaniaCatalogItem,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  MobileTechnicalScoreView,
  VariedadCatalogItem,
  VisitaCampoFull,
  VisitaSyncSummary
} from "../../types";

type DetailCatalogs = {
  cultivos: CultivoCatalogItem[];
  variedades: VariedadCatalogItem[];
  campanias: CampaniaCatalogItem[];
  etapasFenologicas: EtapaFenologicaCatalogItem[];
  pestDiseases: PestDiseaseCatalogItem[];
  incidenceLevels: IncidenceLevelCatalogItem[];
};

type PdfAction = "diagnostico" | "receta";

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
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const technicalScoreRequestId = useRef(0);

  const [detail, setDetail] = useState<VisitaCampoFull | null>(null);
  const [catalogs, setCatalogs] = useState<DetailCatalogs>(EMPTY_CATALOGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activePdfAction, setActivePdfAction] = useState<PdfAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<VisitaSyncSummary | null>(null);
  const [technicalScores, setTechnicalScores] = useState<MobileTechnicalScoreView | null>(
    null
  );

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
              activePdfAction={activePdfAction}
              catalogs={catalogs}
              detail={detail}
              isRetrying={isRetrying}
              onOpenPdf={(action) => {
                void handlePdfAction(action);
              }}
              onRetrySync={() => {
                void handleRetrySync();
              }}
              pdfError={pdfError}
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
    </ScreenContainer>
  );

  async function loadVisita(id: string, requestId: number) {
    setIsLoading(true);
    setError(null);

    try {
      const nextDetail = await visitasCampoService.getFullDetail(id);
      if (requestId !== technicalScoreRequestId.current) return;
      setDetail(nextDetail);
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

  async function handlePdfAction(action: PdfAction) {
    if (!visitaId || activePdfAction) {
      return;
    }

    setPdfError(null);
    setActivePdfAction(action);

    try {
      const service =
        action === "diagnostico" ? visitaPdfReportService : visitaRecetaPdfReportService;

      if (action === "receta" && Platform.OS !== "web") {
        await service.preview(visitaId);

        Alert.alert(
          "Receta",
          "Desea compartir la receta?",
          [
            { text: "Cerrar", style: "cancel" },
            {
              text: "Compartir",
              onPress: () => {
                setActivePdfAction(action);
                handleCompartirReceta(service);
              }
            }
          ]
        );
      } else if (Platform.OS === "web") {
        await service.preview(visitaId);
      } else {
        await service.share(visitaId);
      }
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setPdfError(apiError.message || "No se pudo abrir el PDF. Intenta nuevamente.");
    } finally {
      if (action !== "receta" || Platform.OS === "web") {
        setActivePdfAction(null);
      }
    }
  }

  async function handleCompartirReceta(service: typeof visitaRecetaPdfReportService) {
    try {
      await service.share(visitaId!);
    } catch (shareError) {
      const apiError = toApiError(shareError);
      setPdfError(apiError.message || "No se pudo compartir la receta.");
    } finally {
      setActivePdfAction(null);
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
  activePdfAction: PdfAction | null;
  catalogs: DetailCatalogs;
  detail: VisitaCampoFull;
  isRetrying: boolean;
  onOpenPdf: (action: PdfAction) => void;
  onRetrySync: () => void;
  pdfError: string | null;
  router: ReturnType<typeof useRouter>;
  syncSummary: VisitaSyncSummary | null;
  technicalScores: MobileTechnicalScoreView | null;
  visitMapPoints: VisitMapPoint[];
};

function VisitDossier({
  activePdfAction,
  catalogs,
  detail,
  isRetrying,
  onOpenPdf,
  onRetrySync,
  pdfError,
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
        </>
      ) : null}

      <View style={styles.pdfPanel}>
        <View style={styles.pdfPanelCopy}>
          <AppText style={styles.pdfPanelTitle} variant="label">
            Reportes de la visita
          </AppText>
          <AppText style={styles.pdfPanelSubtitle} variant="caption">
            Abre los mismos PDF que se generan desde el flujo movil.
          </AppText>
        </View>
        <View style={styles.pdfActions}>
          <AppButton
            disabled={activePdfAction !== null}
            icon="document-text-outline"
            label={activePdfAction === "diagnostico" ? "Abriendo..." : "PDF diagnostico"}
            loading={activePdfAction === "diagnostico"}
            onPress={() => onOpenPdf("diagnostico")}
            size="small"
          />
          <AppButton
            disabled={activePdfAction !== null}
            icon="receipt-outline"
            label={activePdfAction === "receta" ? "Abriendo..." : "PDF receta"}
            loading={activePdfAction === "receta"}
            onPress={() => onOpenPdf("receta")}
            size="small"
            variant="secondary"
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

      {pdfError ? (
        <View style={styles.pdfErrorBanner}>
          <Ionicons color={theme.colors.error} name="warning-outline" size={18} />
          <AppText style={styles.pdfErrorText} variant="caption">
            {pdfError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.factGrid}>
        <FactPill icon="calendar-outline" label="Fecha" value={visita.visitDate} />
        <FactPill
          icon="time-outline"
          label="Horario"
          value={formatTimeRange(visita.startVisitTime, visita.endVisitTime)}
        />
        <FactPill
          icon="leaf-outline"
          label="Etapa"
          value={getCatalogNameById(
            visita.phenologicalStageId,
            catalogs.etapasFenologicas
          )}
        />
        <FactPill
          icon="flower-outline"
          label="Plantas"
          value={formatNullableNumber(visita.plantsCount)}
        />
        <FactPill
          icon="resize-outline"
          label="Area"
          value={visita.areaHectares ? `${visita.areaHectares} ha` : "No registrada"}
        />
        <FactPill
          icon="calendar-number-outline"
          label="Siembra"
          value={visita.sowingDate || "No registrada"}
        />
      </View>

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

      <View style={styles.recordPanel}>
        <View style={styles.inlineHeader}>
          <View style={styles.inlineHeaderCopy}>
            <AppText style={styles.inlineTitle} variant="label">
              Registros principales
            </AppText>
            <AppText style={styles.inlineSubtitle} variant="caption">
              Nutricion, plagas y enfermedades registrados en esta visita.
            </AppText>
          </View>
        </View>
        <View style={styles.recordFeed}>
          {recordItems.length === 0 ? (
            <AppText variant="muted">
              Aun no hay evaluaciones ni observaciones sanitarias registradas.
            </AppText>
          ) : (
            recordItems.map((item) => (
              <RecordFeedItem
                key={item.id}
                eyebrow={item.eyebrow}
                icon={item.icon}
                subtitle={item.subtitle}
                title={item.title}
              />
            ))
          )}
        </View>
      </View>
    </AppCard>
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
      <View style={styles.factIcon}>
        <Ionicons color={theme.colors.primaryDark} name={icon} size={18} />
      </View>
      <View style={styles.factCopy}>
        <AppText style={styles.factLabel} variant="caption">
          {label}
        </AppText>
        <AppText numberOfLines={2} style={styles.factValue} variant="label">
          {value}
        </AppText>
      </View>
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
  subtitle,
  title
}: {
  eyebrow: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.recordItem}>
      <View style={styles.recordIcon}>
        <Ionicons color={theme.colors.primaryDark} name={icon} size={18} />
      </View>
      <View style={styles.recordCopy}>
        <AppText style={styles.recordEyebrow} variant="eyebrow">
          {eyebrow}
        </AppText>
        <AppText style={styles.recordTitle} variant="label">
          {title}
        </AppText>
        <AppText style={styles.recordSubtitle} variant="caption">
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

function buildRecordItems(detail: VisitaCampoFull, catalogs: DetailCatalogs) {
  const nutritionItems = detail.evaluaciones.map((evaluacion) => ({
    id: `nutricion-${evaluacion.id}`,
    eyebrow: `Nutricion · Orden ${evaluacion.order}`,
    icon: "nutrition-outline" as const,
    subtitle: formatPercentage(evaluacion.percentage),
    title: evaluacion.description
  }));

  const sanitaryItems = detail.observacionesSanitarias.map((observacion) => ({
    id: `sanidad-${observacion.id}`,
    eyebrow: getPestDiseaseLabel(observacion.pestDiseaseId, catalogs.pestDiseases),
    icon: "bug-outline" as const,
    subtitle: formatSanitaryObservationSubtitle(observacion, catalogs.incidenceLevels),
    title: observacion.observation || "Sin observacion detallada"
  }));

  return [...nutritionItems, ...sanitaryItems].slice(0, 8);
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function formatNullableNumber(value: number | null) {
  if (value === null) {
    return "No registrado";
  }

  return String(value);
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start) return "No registrado";
  if (!end) return start;
  return `${start} — ${end}`;
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

function formatSanitaryObservationSubtitle(
  observacion: VisitaCampoFull["observacionesSanitarias"][number],
  incidenceLevels: IncidenceLevelCatalogItem[]
) {
  const levels = [
    `Incidencia: ${getIncidenceLevelLabel(
      observacion.incidenceLevelId,
      incidenceLevels
    )}`,
    observacion.severityLevelId
      ? `Severidad: ${getIncidenceLevelLabel(
          observacion.severityLevelId,
          incidenceLevels
        )}`
      : null,
    observacion.organosAfectados.length > 0
      ? `Organos: ${observacion.organosAfectados.map(formatOrganoLabel).join(", ")}`
      : "Organos: No registrados"
  ];

  return levels.filter(Boolean).join(" | ");
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
  factGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  factPill: {
    alignItems: "center",
    backgroundColor: "#fbfdf9",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexBasis: "47%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 10,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  factIcon: {
    alignItems: "center",
    backgroundColor: "#eef7e4",
    borderRadius: theme.radius.full,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  factCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  factLabel: {
    color: theme.colors.textMuted,
    fontSize: 11
  },
  factValue: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 18
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
    gap: 12
  },
  recordFeed: {
    gap: 8
  },
  recordItem: {
    alignItems: "flex-start",
    backgroundColor: "#fbfdf9",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  recordIcon: {
    alignItems: "center",
    backgroundColor: "#eef7e4",
    borderRadius: theme.radius.full,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  recordCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  recordEyebrow: {
    color: theme.colors.primary,
    fontSize: 10
  },
  recordTitle: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 19
  },
  recordSubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 17
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
