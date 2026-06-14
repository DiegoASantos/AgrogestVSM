import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";

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
import { processOutbox } from "../../../../shared/sync";
import { observacionesSanitariasService } from "../../../observaciones-sanitarias/services";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseCatalogItem
} from "../../../observaciones-sanitarias/types";
import { visitaCampoCatalogsService, visitasCampoService } from "../../services";
import type {
  CampaniaCatalogItem,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
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

  const [detail, setDetail] = useState<VisitaCampoFull | null>(null);
  const [catalogs, setCatalogs] = useState<DetailCatalogs>(EMPTY_CATALOGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<VisitaSyncSummary | null>(null);

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

      void loadVisita(visitaId);
      return undefined;
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

  async function loadVisita(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextDetail = await visitasCampoService.getFullDetail(id);
      await loadVisitReferenceCatalogs(nextDetail.visita.cropId);
      setDetail(nextDetail);
      setSyncSummary(visitasCampoService.getVisitaSyncSummary(id));
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el detalle.");
      setSyncSummary(null);
    } finally {
      setIsLoading(false);
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

    try {
      visitasCampoService.retrySyncForVisita(visitaId);
      await processOutbox();

      const updated = await visitasCampoService.getFullDetail(visitaId);
      setDetail(updated);
      const updatedSummary = visitasCampoService.getVisitaSyncSummary(visitaId);
      setSyncSummary(updatedSummary);
    } catch {
      // silencioso: el estado se actualiza en el siguiente ciclo
    } finally {
      setIsRetrying(false);
    }
  }
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

function NavCard({
  title,
  count,
  onPress
}: {
  title: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}
    >
      <AppText variant="heading" style={styles.navCount}>
        {count}
      </AppText>
      <AppText variant="caption">{title}</AppText>
    </Pressable>
  );
}

function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <AppCard>
      <View style={styles.sectionHeader}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
      <View style={styles.sectionItems}>{children}</View>
    </AppCard>
  );
}

function DetailItemCard({
  eyebrow,
  title,
  subtitle
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.itemCard}>
      <AppText variant="eyebrow" style={styles.itemEyebrow}>
        {eyebrow}
      </AppText>
      <AppText variant="label">{title}</AppText>
      <AppText variant="caption">{subtitle}</AppText>
    </View>
  );
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
      ? `Organos: ${observacion.organosAfectados
          .map(formatOrganoLabel)
          .join(", ")}`
      : "Organos: No registrados"
  ];

  return levels.filter(Boolean).join(" | ");
}

function formatOrganoLabel(value: string) {
  switch (value) {
    case "hoja":
      return "Hoja";
    case "tallo":
      return "Tallo";
    case "flores":
      return "Flores";
    case "fruto":
      return "Fruto";
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
  syncErrorText: {
    color: theme.colors.error
  },
  details: {
    gap: 2
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
