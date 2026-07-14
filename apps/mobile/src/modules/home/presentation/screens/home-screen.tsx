import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../../../../shared/components";
import { useIsOnline } from "../../../../shared/connectivity/use-is-online";
import { useCatalogDownloadStatus } from "../../../../shared/database/catalog-download-state";
import { forceRefreshAllCatalogs } from "../../../../shared/database/seed-catalogs";
import {
  getLastSyncAttempt,
  getLastSyncTime,
  getSyncCounts,
  getSyncErrorDetails,
  getSyncPendingDetails,
  retryTransientSyncFailures,
  scheduleSync,
  subscribeToSyncStatus,
  SyncStatusIndicator,
  type SyncErrorDetail,
  type SyncPendingDetail,
  type SyncRunResult
} from "../../../../shared/sync";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { visitasCampoService } from "../../../visitas-campo/services";
import type { RecentVisitaCampo } from "../../../visitas-campo/types";

// Static requires keep the branded dashboard available while the device is offline.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HOME_BACKGROUND = require("../../../../../assets/images/fondo_home_movil.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITS_CARD_BACKGROUND = require("../../../../../assets/images/card_1_home.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HISTORY_CARD_BACKGROUND = require("../../../../../assets/images/card_2_home.webp");

const NEW_VISIT_ROUTE = "/visitas-campo/nueva";
const HISTORY_ROUTE = "/visitas-campo/historial";

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isOnline } = useIsOnline();
  const {
    isAuthenticated,
    onlineSessionStatus,
    session,
    signOut
  } = useAuthSession();
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [syncErrors, setSyncErrors] = useState<SyncErrorDetail[]>([]);
  const [syncPending, setSyncPending] = useState<SyncPendingDetail[]>([]);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [isPendingModalVisible, setIsPendingModalVisible] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<SyncRunResult | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isRetryingFailures, setIsRetryingFailures] = useState(false);
  const [isRefreshingCatalogs, setIsRefreshingCatalogs] = useState(false);
  const [recentVisits, setRecentVisits] = useState<RecentVisitaCampo[]>([]);
  const catalogStatus = useCatalogDownloadStatus();
  const heroHeight = Math.min(Math.max(width * 0.58, 218), 330);

  const loadSyncState = useCallback(() => {
    setSyncCounts(getSyncCounts());
    setSyncErrors(getSyncErrorDetails());
    setSyncPending(getSyncPendingDetails());
    setLastSyncTime(getLastSyncTime());
    setLastSyncAttempt(getLastSyncAttempt());
  }, []);

  const loadDashboard = useCallback(() => {
    loadSyncState();

    if (!session.accessToken) {
      setRecentVisits([]);
      return;
    }

    try {
      setRecentVisits(visitasCampoService.getRecentByAccessToken(session.accessToken));
    } catch {
      setRecentVisits([]);
    }
  }, [loadSyncState, session.accessToken]);

  useFocusEffect(loadDashboard);

  useEffect(() => subscribeToSyncStatus(loadSyncState), [loadSyncState]);

  const syncStatus = useMemo(() => getSyncStatus(syncCounts), [syncCounts]);
  const goToHistory = useCallback(() => {
    router.push(HISTORY_ROUTE);
  }, [router]);
  const goToNewVisit = useCallback(() => {
    router.push(NEW_VISIT_ROUTE);
  }, [router]);
  const handleManualSync = useCallback(async () => {
    if (
      !isOnline ||
      isManualSyncing ||
      onlineSessionStatus === "reauth_required"
    ) {
      return;
    }

    setIsManualSyncing(true);

    try {
      await scheduleSync({
        bypassBackoff: true,
        immediate: true,
        manual: true
      });
      loadDashboard();
    } finally {
      setIsManualSyncing(false);
    }
  }, [
    isManualSyncing,
    isOnline,
    loadDashboard,
    onlineSessionStatus
  ]);

  const handleRetryFailures = useCallback(async () => {
    if (
      !isOnline ||
      isRetryingFailures ||
      onlineSessionStatus === "reauth_required"
    ) {
      return;
    }

    setIsRetryingFailures(true);

    try {
      const requeued = retryTransientSyncFailures();

      if (requeued > 0) {
        await scheduleSync({
          bypassBackoff: true,
          immediate: true,
          manual: true
        });
      }

      loadSyncState();
    } finally {
      setIsRetryingFailures(false);
    }
  }, [isOnline, isRetryingFailures, loadSyncState, onlineSessionStatus]);

  const handleRefreshCatalogs = useCallback(async () => {
    if (!isOnline || isRefreshingCatalogs || catalogStatus.isDownloading) {
      return;
    }

    setIsRefreshingCatalogs(true);

    try {
      await forceRefreshAllCatalogs();
      loadDashboard();
    } finally {
      setIsRefreshingCatalogs(false);
    }
  }, [isOnline, isRefreshingCatalogs, catalogStatus.isDownloading, loadDashboard]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <StatusBar backgroundColor="#fbfcf9" style="dark" />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText style={styles.greeting} variant="title">
              Hola, {getUserName(session.user?.displayName)}!
            </AppText>
            <AppText style={styles.subtitle} variant="body">
              Bienvenido a AgroGest
            </AppText>
          </View>

          {isAuthenticated ? (
            <Pressable
              accessibilityLabel="Cerrar sesion"
              accessibilityRole="button"
              onPress={() => {
                signOut();
                router.replace("/login");
              }}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
            >
              <Ionicons color="#064b31" name="log-out-outline" size={25} />
              <AppText style={styles.logoutText} variant="label">
                Cerrar sesion
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {catalogStatus.isDownloading || catalogStatus.error ? (
          <View
            style={[
              styles.catalogBanner,
              catalogStatus.error && styles.catalogBannerError
            ]}
          >
            {catalogStatus.isDownloading ? (
              <ActivityIndicator color="#064b31" size="small" />
            ) : (
              <Ionicons color="#bc3f36" name="warning-outline" size={20} />
            )}
            <AppText
              style={[
                styles.catalogBannerText,
                catalogStatus.error && styles.catalogBannerTextError
              ]}
              variant="caption"
            >
              {catalogStatus.isDownloading
                ? "Descargando datos de referencia..."
                : catalogStatus.error
                  ? `Error al descargar catalogos: ${catalogStatus.error}`
                  : null}
            </AppText>
          </View>
        ) : null}

        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={HOME_BACKGROUND}
          style={[styles.hero, { height: heroHeight }]}
        />

        <View style={styles.dashboard}>
          <View style={styles.connectionGrid}>
            <InfoCard
              description={
                isOnline ? "Conexion estable" : "Tus cambios se guardaran localmente"
              }
              icon={isOnline ? "wifi" : "cloud-offline-outline"}
              title={isOnline ? "Online" : "Offline"}
              variant={isOnline ? "success" : "warning"}
            />
            <InfoCard
              description={`Ultima sincronizacion: ${formatLastSyncTime(lastSyncTime)}`}
              icon="sync"
              title={syncStatus.title}
              variant={syncStatus.variant}
            />
          </View>

          <View style={styles.syncPanel}>
            <AppText style={styles.sectionTitle} variant="heading">
              Estado de sincronizacion
            </AppText>
            <SyncStatusIndicator
              errorCount={syncCounts.errorCount}
              isSyncing={isManualSyncing}
              pendingCount={syncCounts.pendingCount}
            />
            {onlineSessionStatus === "reauth_required" ? (
              <View style={styles.reauthBanner}>
                <View style={styles.reauthCopy}>
                  <Ionicons color="#9d3d35" name="key-outline" size={20} />
                  <AppText style={styles.reauthText} variant="caption">
                    Sesion online vencida; inicia sesion para sincronizar.
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/login")}
                  style={({ pressed }) => [
                    styles.reauthButton,
                    pressed && styles.pressed
                  ]}
                >
                  <AppText style={styles.reauthButtonText} variant="label">
                    Iniciar sesion
                  </AppText>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.syncMetrics}>
              <SyncMetric
                icon="document-text-outline"
                label="Datos pendientes"
                onPress={
                  syncCounts.pendingCount > 0
                    ? () => setIsPendingModalVisible(true)
                    : undefined
                }
                value={syncCounts.pendingCount}
                variant="success"
              />
              <SyncMetric
                icon="warning-outline"
                label="Errores"
                onPress={
                  syncCounts.errorCount > 0
                    ? () => setIsErrorModalVisible(true)
                    : undefined
                }
                value={syncCounts.errorCount}
                variant="error"
              />
              <SyncMetric
                icon="checkmark-circle-outline"
                label={syncStatus.summary}
                value={syncStatus.metric}
                variant={syncStatus.variant}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={
                !isOnline ||
                isManualSyncing ||
                onlineSessionStatus === "reauth_required"
              }
              onPress={() => {
                void handleManualSync();
              }}
              style={({ pressed }) => [
                styles.manualSyncButton,
                pressed && styles.pressed,
                (!isOnline ||
                  isManualSyncing ||
                  onlineSessionStatus === "reauth_required") &&
                  styles.manualSyncButtonDisabled
              ]}
            >
              <Ionicons
                color="#ffffff"
                name={isManualSyncing ? "sync" : "cloud-upload-outline"}
                size={20}
              />
              <AppText style={styles.manualSyncButtonText} variant="label">
                {isManualSyncing ? "Sincronizando..." : "Sincronizar ahora"}
              </AppText>
            </Pressable>
            {syncErrors.some((error) => error.retryable) ? (
              <Pressable
                accessibilityRole="button"
                disabled={!isOnline || isRetryingFailures}
                onPress={() => {
                  void handleRetryFailures();
                }}
                style={({ pressed }) => [
                  styles.retryFailuresButton,
                  pressed && styles.pressed,
                  (!isOnline || isRetryingFailures) &&
                    styles.manualSyncButtonDisabled
                ]}
              >
                <Ionicons
                  color="#9d3d35"
                  name={isRetryingFailures ? "sync" : "refresh-outline"}
                  size={19}
                />
                <AppText style={styles.retryFailuresText} variant="label">
                  {isRetryingFailures ? "Reintentando..." : "Reintentar fallidos"}
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Refrescar catalogos de referencia"
              accessibilityRole="button"
              disabled={!isOnline || isRefreshingCatalogs || catalogStatus.isDownloading}
              onPress={() => {
                void handleRefreshCatalogs();
              }}
              style={({ pressed }) => [
                styles.refreshCatalogsButton,
                pressed && styles.pressed,
                (!isOnline || isRefreshingCatalogs || catalogStatus.isDownloading) &&
                  styles.manualSyncButtonDisabled
              ]}
            >
              <Ionicons
                color="#08643f"
                name={
                  isRefreshingCatalogs || catalogStatus.isDownloading
                    ? "sync"
                    : "cloud-download-outline"
                }
                size={20}
              />
              <AppText style={styles.refreshCatalogsButtonText} variant="label">
                {isRefreshingCatalogs || catalogStatus.isDownloading
                  ? "Descargando catalogos..."
                  : "Refrescar catalogos"}
              </AppText>
            </Pressable>
            {lastSyncAttempt ? (
              <View style={styles.syncAttemptBox}>
                <View
                  style={[
                    styles.syncAttemptDot,
                    statusDotStyles[getSyncAttemptVariant(lastSyncAttempt)]
                  ]}
                />
                <View style={styles.syncAttemptCopy}>
                  <AppText style={styles.syncAttemptText} variant="caption">
                    {lastSyncAttempt.message}
                  </AppText>
                  <AppText style={styles.syncAttemptMeta} variant="caption">
                    Ultimo intento: {formatErrorDateTime(lastSyncAttempt.attemptedAt)}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.actionGrid}>
            <ActionCard
              background={VISITS_CARD_BACKGROUND}
              description="Registra y gestiona visitas a campo"
              icon="calendar-outline"
              label="Visitas"
              onPress={goToNewVisit}
            />
            <ActionCard
              background={HISTORY_CARD_BACKGROUND}
              description="Consulta tus visitas realizadas"
              icon="time-outline"
              label="Historial"
              onPress={goToHistory}
            />
          </View>

          <View style={styles.activityPanel}>
            <View style={styles.activityHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Actividad reciente
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={goToHistory}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <AppText style={styles.seeAllText} variant="label">
                  Ver todas
                </AppText>
              </Pressable>
            </View>

            {recentVisits.map((visit) => (
              <RecentActivityItem
                key={visit.id}
                onPress={() =>
                  router.push({
                    pathname: "/visitas-campo/[id]",
                    params: { id: visit.id }
                  })
                }
                visit={visit}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <SyncErrorsModal
        errors={syncErrors}
        onClose={() => setIsErrorModalVisible(false)}
        visible={isErrorModalVisible}
      />

      <SyncPendingModal
        onClose={() => setIsPendingModalVisible(false)}
        pending={syncPending}
        visible={isPendingModalVisible}
      />
    </SafeAreaView>
  );
}

function InfoCard({
  description,
  icon,
  title,
  variant
}: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  variant: StatusVariant;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, statusBackgroundStyles[variant]]}>
        <Ionicons color={statusColorStyles[variant]} name={icon} size={29} />
      </View>
      <View style={styles.infoContent}>
        <View style={styles.infoTitleRow}>
          <AppText style={styles.infoTitle} variant="heading">
            {title}
          </AppText>
          <View style={[styles.statusDot, statusDotStyles[variant]]} />
        </View>
        <AppText style={styles.infoDescription} variant="caption">
          {description}
        </AppText>
      </View>
    </View>
  );
}

function SyncMetric({
  icon,
  label,
  onPress,
  value,
  variant
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  value: number | string;
  variant: StatusVariant;
}) {
  const content = (
    <>
      <View style={[styles.metricIcon, statusBackgroundStyles[variant]]}>
        <Ionicons color={statusColorStyles[variant]} name={icon} size={27} />
      </View>
      <View style={styles.metricContent}>
        <AppText style={styles.metricValue} variant="heading">
          {value}
        </AppText>
        <AppText style={styles.metricLabel} variant="caption">
          {label}
        </AppText>
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityHint="Muestra el detalle de errores de sincronizacion"
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.syncMetric,
          styles.syncMetricPressable,
          pressed && styles.pressed
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.syncMetric}>{content}</View>;
}

function SyncErrorsModal({
  errors,
  onClose,
  visible
}: {
  errors: SyncErrorDetail[];
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.errorModalOverlay}>
        <View style={styles.errorModalCard}>
          <View style={styles.errorModalHeader}>
            <View style={styles.errorModalTitleRow}>
              <View style={styles.errorModalIcon}>
                <Ionicons color="#bc3f36" name="warning-outline" size={24} />
              </View>
              <View style={styles.errorModalTitleCopy}>
                <AppText style={styles.errorModalTitle} variant="heading">
                  Errores de sincronizacion
                </AppText>
                <AppText style={styles.errorModalSubtitle} variant="caption">
                  {errors.length} registro{errors.length === 1 ? "" : "s"} requieren
                  revision.
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Cerrar detalle de errores"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.errorModalCloseButton,
                pressed && styles.pressed
              ]}
            >
              <Ionicons color="#4d5a54" name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.errorModalList}
            showsVerticalScrollIndicator={false}
          >
            {errors.length > 0 ? (
              errors.map((error, index) => (
                <View
                  key={`${error.entityType}-${error.localId}`}
                  style={styles.errorItem}
                >
                  <View style={styles.errorItemHeader}>
                    <AppText style={styles.errorItemNumber} variant="eyebrow">
                      #{index + 1}
                    </AppText>
                    <AppText style={styles.errorItemEntity} variant="label">
                      {error.entityLabel}
                    </AppText>
                  </View>
                  <ErrorField label="ID local" value={error.localId} />
                  <ErrorField
                    label="Ultima actualizacion"
                    value={formatErrorDateTime(error.updatedAt)}
                  />
                  <ErrorField label="Causa" value={error.message} />
                  <ErrorField
                    label="Accion"
                    value={
                      error.retryable
                        ? "Puede reintentarse."
                        : "Corrige el dato desde su detalle."
                    }
                  />
                </View>
              ))
            ) : (
              <View style={styles.errorEmptyState}>
                <Ionicons color="#4d9f13" name="checkmark-circle-outline" size={30} />
                <AppText style={styles.errorEmptyTitle} variant="label">
                  No hay errores registrados
                </AppText>
                <AppText style={styles.errorEmptyText} variant="caption">
                  El contador puede actualizarse al volver a sincronizar.
                </AppText>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SyncPendingModal({
  onClose,
  pending,
  visible
}: {
  onClose: () => void;
  pending: SyncPendingDetail[];
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.errorModalOverlay}>
        <View style={styles.errorModalCard}>
          <View style={styles.errorModalHeader}>
            <View style={styles.errorModalTitleRow}>
              <View style={[styles.errorModalIcon, { backgroundColor: "#fff4e2" }]}>
                <Ionicons color="#e28700" name="time-outline" size={24} />
              </View>
              <View style={styles.errorModalTitleCopy}>
                <AppText style={styles.errorModalTitle} variant="heading">
                  Datos pendientes de sincronizar
                </AppText>
                <AppText style={styles.errorModalSubtitle} variant="caption">
                  {pending.length} registro{pending.length === 1 ? "" : "s"} en espera.
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Cerrar detalle de pendientes"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.errorModalCloseButton,
                pressed && styles.pressed
              ]}
            >
              <Ionicons color="#4d5a54" name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.errorModalList}
            showsVerticalScrollIndicator={false}
          >
            {pending.length > 0 ? (
              pending.map((item, index) => (
                <View
                  key={`${item.entityType}-${item.localId}`}
                  style={[styles.errorItem, { borderColor: "#f3cd8c", backgroundColor: "#fef9e7" }]}
                >
                  <View style={styles.errorItemHeader}>
                    <AppText style={{ color: "#b45309" }} variant="eyebrow">
                      #{index + 1}
                    </AppText>
                    <AppText style={styles.errorItemEntity} variant="label">
                      {item.entityLabel}
                    </AppText>
                  </View>
                  <ErrorField label="ID local" value={item.localId} />
                  <ErrorField
                    label="Ultima actualizacion"
                    value={formatErrorDateTime(item.updatedAt)}
                  />
                </View>
              ))
            ) : (
              <View style={styles.errorEmptyState}>
                <Ionicons color="#4d9f13" name="checkmark-circle-outline" size={30} />
                <AppText style={styles.errorEmptyTitle} variant="label">
                  No hay datos pendientes
                </AppText>
                <AppText style={styles.errorEmptyText} variant="caption">
                  El contador puede actualizarse al volver a sincronizar.
                </AppText>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ErrorField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.errorField}>
      <AppText style={styles.errorFieldLabel} variant="caption">
        {label}
      </AppText>
      <AppText style={styles.errorFieldValue} variant="body">
        {value}
      </AppText>
    </View>
  );
}

function ActionCard({
  background,
  description,
  icon,
  label,
  onPress
}: {
  background: number;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
    >
      <ImageBackground
        imageStyle={styles.actionBackground}
        resizeMode="cover"
        source={background}
        style={styles.actionBackgroundContainer}
      >
        <View style={styles.actionTop}>
          <View style={styles.actionIcon}>
            <Ionicons color="#ffffff" name={icon} size={27} />
          </View>
          <View style={styles.actionCopy}>
            <AppText style={styles.actionTitle} variant="heading">
              {label}
            </AppText>
            <AppText style={styles.actionDescription} variant="caption">
              {description}
            </AppText>
          </View>
          <Ionicons color="#064b31" name="chevron-forward" size={25} />
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function RecentActivityItem({
  onPress,
  visit
}: {
  onPress: () => void;
  visit: RecentVisitaCampo;
}) {
  const status = getVisitStatus(visit.syncStatus);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.activityItem,
        pressed && styles.activityItemPressed
      ]}
    >
      <View style={styles.activityIcon}>
        <Ionicons color="#08643f" name="clipboard-outline" size={23} />
      </View>
      <View style={styles.activityCopy}>
        <AppText style={styles.activityTitle} variant="label">
          {visit.productorName && visit.parcelaName
            ? `${visit.productorName} - ${visit.parcelaName}`
            : visit.parcelaName
              ? `Visita a ${visit.parcelaName}`
              : "Visita de campo"}
        </AppText>
        <View style={styles.activityMeta}>
          <AppText style={styles.activityDescription} variant="caption">
            {formatVisitDateTime(visit.visitDate, visit.startVisitTime)}
          </AppText>
          <View style={[styles.activityStatusDot, statusDotStyles[status.variant]]} />
          <AppText style={styles.activityDescription} variant="caption">
            {status.label}
          </AppText>
        </View>
      </View>
      <Ionicons color={statusColorStyles[status.variant]} name={status.icon} size={21} />
      <Ionicons color="#064b31" name="chevron-forward" size={22} />
    </Pressable>
  );
}

type StatusVariant = "success" | "warning" | "error";

function getSyncStatus(syncCounts: { pendingCount: number; errorCount: number }) {
  if (syncCounts.errorCount > 0) {
    return {
      metric: "Revisar",
      summary: "Requiere atencion",
      title: "Con errores",
      variant: "error" as const
    };
  }

  if (syncCounts.pendingCount > 0) {
    return {
      metric: "Pendiente",
      summary: "Falta sincronizar",
      title: "Pendiente",
      variant: "warning" as const
    };
  }

  return {
    metric: "Al dia",
    summary: "Sistema actualizado",
    title: "Sincronizado",
    variant: "success" as const
  };
}

function getSyncAttemptVariant(result: SyncRunResult): StatusVariant {
  if (result.status === "success") {
    return "success";
  }

  if (
    result.status === "offline" ||
    result.status === "auth_failed" ||
    result.status === "already_running" ||
    result.status === "backoff"
  ) {
    return "warning";
  }

  return "error";
}

function getVisitStatus(syncStatus: RecentVisitaCampo["syncStatus"]) {
  if (syncStatus === "error") {
    return {
      icon: "alert-circle" as const,
      label: "Con error",
      variant: "error" as const
    };
  }

  if (syncStatus === "pending") {
    return { icon: "time" as const, label: "Pendiente", variant: "warning" as const };
  }

  return {
    icon: "checkmark-circle" as const,
    label: "Sincronizado",
    variant: "success" as const
  };
}

function getUserName(displayName?: string) {
  return displayName?.trim().split(/\s+/)[0] || "usuario";
}

function formatLastSyncTime(lastSyncTime: string | null) {
  if (!lastSyncTime) {
    return "no registrada";
  }

  const date = new Date(lastSyncTime);

  if (Number.isNaN(date.getTime())) {
    return lastSyncTime;
  }

  return date.toLocaleString("es-PE", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  });
}

function formatErrorDateTime(value: string | null) {
  if (!value) {
    return "No registrada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatVisitDateTime(visitDate: string, startVisitTime: string) {
  const date = new Date(`${visitDate}T${startVisitTime || "00:00:00"}`);

  if (Number.isNaN(date.getTime())) {
    return `${visitDate}, ${startVisitTime}`;
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  let dateLabel = date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short"
  });

  if (isSameCalendarDay(date, today)) {
    dateLabel = "Hoy";
  } else if (isSameCalendarDay(date, yesterday)) {
    dateLabel = "Ayer";
  }

  return `${dateLabel}, ${date.toLocaleTimeString("es-PE", {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

const statusColorStyles = {
  success: "#4d9f13",
  warning: "#e28700",
  error: "#bc3f36"
} satisfies Record<StatusVariant, string>;

const statusBackgroundStyles = StyleSheet.create({
  success: { backgroundColor: "#edf6e6" },
  warning: { backgroundColor: "#fff4e2" },
  error: { backgroundColor: "#fceae7" }
});

const statusDotStyles = StyleSheet.create({
  success: { backgroundColor: "#56ad11" },
  warning: { backgroundColor: "#e28700" },
  error: { backgroundColor: "#bc3f36" }
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fbfcf9"
  },
  scrollContent: {
    paddingBottom: 18
  },
  header: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 19,
    backgroundColor: "#fbfcf9"
  },
  headerText: {
    flex: 1
  },
  greeting: {
    color: "#064b31",
    fontSize: 27,
    lineHeight: 33
  },
  subtitle: {
    marginTop: 1,
    color: "#66706b",
    fontSize: 15
  },
  logoutButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 7,
    elevation: 4
  },
  logoutText: {
    color: "#153d2e",
    fontSize: 13
  },
  hero: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    backgroundColor: "#d9e4d0"
  },
  heroImage: {
    opacity: 0.98
  },
  dashboard: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 18,
    backgroundColor: "#f6f8f4"
  },
  connectionGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: -29
  },
  infoCard: {
    minHeight: 105,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 9,
    elevation: 4
  },
  infoIcon: {
    width: 55,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28
  },
  infoContent: {
    minWidth: 0,
    flex: 1,
    gap: 4
  },
  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5
  },
  infoTitle: {
    flex: 1,
    color: "#083f2c",
    fontSize: 17,
    lineHeight: 21
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  infoDescription: {
    color: "#68726e",
    fontSize: 11,
    lineHeight: 15
  },
  syncPanel: {
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 13,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: {
    color: "#102e23",
    fontSize: 18,
    lineHeight: 23
  },
  syncMetrics: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 14
  },
  manualSyncButton: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#08643f"
  },
  manualSyncButtonDisabled: {
    opacity: 0.56
  },
  manualSyncButtonText: {
    color: "#ffffff",
    fontSize: 15
  },
  refreshCatalogsButton: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#08643f",
    backgroundColor: "#ffffff"
  },
  refreshCatalogsButtonText: {
    color: "#08643f",
    fontSize: 15
  },
  reauthBanner: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e4b7b2",
    borderRadius: 8,
    backgroundColor: "#fff4f2"
  },
  reauthCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  reauthText: {
    flex: 1,
    color: "#7f302a",
    lineHeight: 18
  },
  reauthButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    backgroundColor: "#9d3d35"
  },
  reauthButtonText: {
    color: "#ffffff",
    fontSize: 13
  },
  retryFailuresButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#d8a29d",
    borderRadius: 8,
    backgroundColor: "#fff7f6"
  },
  retryFailuresText: {
    color: "#8b352e",
    fontSize: 15
  },
  syncAttemptBox: {
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f7faf8",
    borderColor: "#e1e6e2",
    borderWidth: 1
  },
  syncAttemptDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 4
  },
  syncAttemptCopy: {
    flex: 1,
    gap: 2
  },
  syncAttemptText: {
    color: "#32443b",
    lineHeight: 16
  },
  syncAttemptMeta: {
    color: "#7a8580",
    fontSize: 10
  },
  syncMetric: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#e1e6e2"
  },
  syncMetricPressable: {
    minHeight: 58,
    borderRadius: 12
  },
  metricIcon: {
    width: 47,
    height: 47,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24
  },
  metricContent: {
    minWidth: 0,
    flex: 1
  },
  metricValue: {
    color: "#102e23",
    fontSize: 17,
    lineHeight: 21
  },
  metricLabel: {
    marginTop: 2,
    color: "#56625d",
    fontSize: 10,
    lineHeight: 13
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12
  },
  actionCard: {
    minHeight: 145,
    flex: 1,
    overflow: "hidden",
    borderRadius: 17,
    backgroundColor: "#eef5e8",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 7,
    elevation: 3
  },
  actionBackgroundContainer: {
    flex: 1,
    paddingHorizontal: 13,
    paddingTop: 15,
    paddingBottom: 53
  },
  actionBackground: {
    borderRadius: 17
  },
  actionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  actionIcon: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#3f7d2b"
  },
  actionCopy: {
    minWidth: 0,
    flex: 1
  },
  actionTitle: {
    color: "#064b31",
    fontSize: 17,
    lineHeight: 21
  },
  actionDescription: {
    marginTop: 3,
    color: "#44534d",
    fontSize: 11,
    lineHeight: 15
  },
  activityPanel: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  activityHeader: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  seeAllText: {
    color: "#4f940e"
  },
  activityItem: {
    minHeight: 69,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: "#e6ebe6"
  },
  activityItemPressed: {
    backgroundColor: "#f5f9f2"
  },
  activityIcon: {
    width: 41,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#eff7e9"
  },
  activityCopy: {
    minWidth: 0,
    flex: 1
  },
  activityTitle: {
    color: "#122f24",
    fontSize: 14
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2
  },
  activityDescription: {
    color: "#63706b",
    fontSize: 11
  },
  activityStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  catalogBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#edf6e6",
    borderWidth: 1,
    borderColor: "#b7d7a3"
  },
  catalogBannerError: {
    backgroundColor: "#fceae7",
    borderColor: "#e8b5ae"
  },
  catalogBannerText: {
    flex: 1,
    color: "#064b31",
    fontSize: 12
  },
  catalogBannerTextError: {
    color: "#bc3f36"
  },
  errorModalOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(8, 24, 18, 0.52)"
  },
  errorModalCard: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "82%",
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  errorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e6ebe6"
  },
  errorModalTitleRow: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  errorModalIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#fceae7"
  },
  errorModalTitleCopy: {
    minWidth: 0,
    flex: 1
  },
  errorModalTitle: {
    color: "#102e23",
    fontSize: 18
  },
  errorModalSubtitle: {
    marginTop: 2,
    color: "#68726e"
  },
  errorModalCloseButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#f3f6f2"
  },
  errorModalList: {
    gap: 12,
    padding: 14
  },
  errorItem: {
    gap: 9,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0c8c2",
    backgroundColor: "#fff8f7"
  },
  errorItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  errorItemNumber: {
    color: "#bc3f36"
  },
  errorItemEntity: {
    flex: 1,
    color: "#102e23"
  },
  errorField: {
    gap: 3
  },
  errorFieldLabel: {
    color: "#7f625e",
    fontWeight: "700",
    textTransform: "uppercase"
  },
  errorFieldValue: {
    color: "#27342f",
    fontSize: 13,
    lineHeight: 19
  },
  errorEmptyState: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 24,
    paddingHorizontal: 12
  },
  errorEmptyTitle: {
    color: "#102e23"
  },
  errorEmptyText: {
    textAlign: "center",
    color: "#68726e"
  },
  pressed: {
    opacity: 0.8
  }
});
