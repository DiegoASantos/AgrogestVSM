import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useUpdates } from "expo-updates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getConnectivityPresentation } from "../../../../shared/connectivity/connectivity-presentation";
import type {
  NetworkPreference,
  NetworkQuality
} from "../../../../shared/connectivity/connectivity-types";
import { useConnectivity } from "../../../../shared/connectivity/use-connectivity";
import { useCatalogDownloadStatus } from "../../../../shared/database/catalog-download-state";
import { forceRefreshAllCatalogs } from "../../../../shared/database/seed-catalogs";
import {
  getLastSyncAttempt,
  getLastSyncTime,
  getSyncCounts,
  getSyncErrorDetails,
  getSyncPendingDetails,
  discardUnsyncedCatalogFailure,
  isRecoverableCatalogEntity,
  retryCatalogSyncFailure,
  retryTransientSyncFailures,
  scheduleSync,
  subscribeToSyncStatus,
  SyncStatusIndicator,
  type SyncErrorDetail,
  type SyncPendingDetail,
  type SyncRunResult
} from "../../../../shared/sync";
import { appUpdateService } from "../../../../shared/updates/app-update.service";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { ClimateDashboard } from "../../../clima/presentation/components/climate-dashboard";
import { parcelasService } from "../../../parcelas/services/parcelas.service";
import { visitasCampoService } from "../../../visitas-campo/services";
import type { RecentVisitaCampo } from "../../../visitas-campo/types";

// Static requires keep the branded dashboard available while the device is offline.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HOME_BACKGROUND = require("../../../../../assets/images/fondo_home_movil.webp");
const HISTORY_ROUTE = "/visitas-campo/historial";

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const {
    checkConnectionNow,
    effectiveMode,
    isCheckingConnection,
    isOnline,
    isPhysicallyOnline,
    preference,
    quality,
    setPreference
  } = useConnectivity();
  const { isUpdatePending } = useUpdates();
  const { isAuthenticated, onlineSessionStatus, session, signOut } = useAuthSession();
  const updateCheckInFlightRef = useRef(false);
  const updateReadyRef = useRef(false);
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [syncErrors, setSyncErrors] = useState<SyncErrorDetail[]>([]);
  const [syncPending, setSyncPending] = useState<SyncPendingDetail[]>([]);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [isPendingModalVisible, setIsPendingModalVisible] = useState(false);
  const [isConnectivityModalVisible, setIsConnectivityModalVisible] = useState(false);
  const [connectionProbeFeedback, setConnectionProbeFeedback] = useState<string | null>(
    null
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<SyncRunResult | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isRetryingFailures, setIsRetryingFailures] = useState(false);
  const [isRefreshingCatalogs, setIsRefreshingCatalogs] = useState(false);
  const [isAppUpdateReady, setIsAppUpdateReady] = useState(false);
  const [isApplyingAppUpdate, setIsApplyingAppUpdate] = useState(false);
  const [appUpdateError, setAppUpdateError] = useState<string | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisitaCampo[]>([]);
  const catalogStatus = useCatalogDownloadStatus();
  const heroHeight = Math.min(Math.max(width * 0.58, 218), 330);
  const connectivity = useMemo(
    () =>
      getConnectivityPresentation({
        effectiveMode,
        isPhysicallyOnline,
        quality
      }),
    [effectiveMode, isPhysicallyOnline, quality]
  );

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
      void parcelasService.getAll().catch(() => {});
    } catch {
      setRecentVisits([]);
    }
  }, [loadSyncState, session.accessToken]);

  useFocusEffect(loadDashboard);

  const checkForAppUpdate = useCallback(() => {
    if (!isOnline || updateCheckInFlightRef.current || updateReadyRef.current) {
      return;
    }

    updateCheckInFlightRef.current = true;

    void appUpdateService
      .prepare()
      .then((result) => {
        if (result !== "ready") {
          return;
        }

        updateReadyRef.current = true;
        setAppUpdateError(null);
        setIsAppUpdateReady(true);
      })
      .catch(() => {
        // La comprobacion OTA no debe bloquear Inicio ni los flujos offline.
      })
      .finally(() => {
        updateCheckInFlightRef.current = false;
      });
  }, [isOnline]);

  useFocusEffect(checkForAppUpdate);

  useEffect(() => subscribeToSyncStatus(loadSyncState), [loadSyncState]);

  useEffect(() => {
    if (!isUpdatePending) {
      return;
    }

    updateReadyRef.current = true;
    setAppUpdateError(null);
    setIsAppUpdateReady(true);
  }, [isUpdatePending]);

  const syncStatus = useMemo(() => getSyncStatus(syncCounts), [syncCounts]);
  const goToHistory = useCallback(() => {
    router.push(HISTORY_ROUTE);
  }, [router]);
  const handleManualSync = useCallback(async () => {
    if (!isOnline || isManualSyncing || onlineSessionStatus === "reauth_required") {
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
  }, [isManualSyncing, isOnline, loadDashboard, onlineSessionStatus]);

  const handleRetryFailures = useCallback(async () => {
    if (!isOnline || isRetryingFailures || onlineSessionStatus === "reauth_required") {
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

  const handleRetryCatalogFailure = useCallback(
    (error: SyncErrorDetail) => {
      if (!isRecoverableCatalogEntity(error.entityType)) {
        return;
      }

      try {
        retryCatalogSyncFailure(error.entityType, error.localId);
        setIsErrorModalVisible(false);
        loadSyncState();
      } catch (recoveryError) {
        Alert.alert(
          "No se pudo volver a enviar",
          recoveryError instanceof Error
            ? recoveryError.message
            : "Ocurrio un error al preparar el reintento."
        );
      }
    },
    [loadSyncState]
  );

  const handleDiscardCatalogFailure = useCallback(
    (error: SyncErrorDetail) => {
      if (!isRecoverableCatalogEntity(error.entityType)) {
        return;
      }
      const entityType = error.entityType;

      Alert.alert(
        "Descartar alta local",
        `Se retirara ${error.displayName ?? "este registro"} del catalogo local. Las visitas y recetas no se borraran.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Descartar",
            style: "destructive",
            onPress: () => {
              try {
                discardUnsyncedCatalogFailure(entityType, error.localId);
                loadSyncState();
              } catch (discardError) {
                Alert.alert(
                  "No se puede descartar",
                  discardError instanceof Error
                    ? discardError.message
                    : "Ocurrio un error al descartar el registro."
                );
              }
            }
          }
        ]
      );
    },
    [loadSyncState]
  );

  const handleApplyAppUpdate = useCallback(async () => {
    if (isApplyingAppUpdate) {
      return;
    }

    setIsApplyingAppUpdate(true);
    setAppUpdateError(null);

    try {
      const willReload = await appUpdateService.applyDownloadedUpdate();

      if (!willReload) {
        setAppUpdateError("La actualizacion no esta disponible en esta compilacion.");
        setIsApplyingAppUpdate(false);
      }
    } catch {
      setAppUpdateError("No se pudo aplicar la actualizacion. Intenta nuevamente.");
      setIsApplyingAppUpdate(false);
    }
  }, [isApplyingAppUpdate]);

  const handleConnectivityPreference = useCallback(
    (nextPreference: NetworkPreference) => {
      setConnectionProbeFeedback(null);
      setPreference(nextPreference);
      setIsConnectivityModalVisible(false);
    },
    [setPreference]
  );

  const handleCheckConnection = useCallback(async () => {
    setConnectionProbeFeedback(null);
    const isResponsive = await checkConnectionNow();
    setConnectionProbeFeedback(
      isResponsive
        ? "La conexion respondio correctamente. Se reanudara la sincronizacion."
        : "La conexion aun no es estable. Tus datos permanecen guardados localmente."
    );
  }, [checkConnectionNow]);

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

        {isAppUpdateReady ? (
          <View style={styles.appUpdateBanner}>
            <View style={styles.appUpdateHeader}>
              <View style={styles.appUpdateIcon}>
                <Ionicons color="#08643f" name="rocket-outline" size={24} />
              </View>
              <View style={styles.appUpdateCopy}>
                <AppText style={styles.appUpdateTitle} variant="heading">
                  Nueva version disponible
                </AppText>
                <AppText
                  style={[
                    styles.appUpdateDescription,
                    appUpdateError && styles.appUpdateError
                  ]}
                  variant="caption"
                >
                  {appUpdateError ||
                    "La mejora ya esta descargada. Actualiza cuando estes en Inicio."}
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityHint="Reinicia AgroGest y aplica la version descargada"
              accessibilityRole="button"
              disabled={isApplyingAppUpdate}
              onPress={() => {
                void handleApplyAppUpdate();
              }}
              style={({ pressed }) => [
                styles.appUpdateButton,
                pressed && styles.pressed,
                isApplyingAppUpdate && styles.manualSyncButtonDisabled
              ]}
            >
              {isApplyingAppUpdate ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons color="#ffffff" name="refresh-outline" size={20} />
              )}
              <AppText style={styles.appUpdateButtonText} variant="label">
                {isApplyingAppUpdate ? "Actualizando..." : "Actualizar ahora"}
              </AppText>
            </Pressable>
          </View>
        ) : null}

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

        {connectivity.banner ? (
          <View style={styles.connectivityBanner}>
            <Ionicons color="#9a5a00" name={connectivity.icon} size={22} />
            <AppText style={styles.connectivityBannerText} variant="caption">
              {connectivity.banner}
            </AppText>
            <Pressable
              accessibilityLabel="Cambiar modo de conectividad"
              accessibilityRole="button"
              onPress={() => setIsConnectivityModalVisible(true)}
              style={({ pressed }) => [
                styles.connectivityBannerButton,
                pressed && styles.pressed
              ]}
            >
              <AppText style={styles.connectivityBannerButtonText} variant="label">
                Cambiar
              </AppText>
            </Pressable>
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
              accessibilityHint="Abre las opciones para trabajar online u offline"
              description={connectivity.description}
              icon={connectivity.icon}
              onPress={() => setIsConnectivityModalVisible(true)}
              title={connectivity.title}
              variant={connectivity.variant}
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
                !isOnline || isManualSyncing || onlineSessionStatus === "reauth_required"
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
                  (!isOnline || isRetryingFailures) && styles.manualSyncButtonDisabled
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

          <ClimateDashboard isOnline={isOnline} />

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

      <ConnectivityModeModal
        feedback={connectionProbeFeedback}
        isChecking={isCheckingConnection}
        isPhysicallyOnline={isPhysicallyOnline}
        onCheck={() => {
          void handleCheckConnection();
        }}
        onClose={() => setIsConnectivityModalVisible(false)}
        onSelect={handleConnectivityPreference}
        preference={preference}
        quality={quality}
        visible={isConnectivityModalVisible}
      />

      <SyncErrorsModal
        errors={syncErrors}
        onClose={() => setIsErrorModalVisible(false)}
        onDiscardCatalog={handleDiscardCatalogFailure}
        onRetryCatalog={handleRetryCatalogFailure}
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

function ConnectivityModeModal({
  feedback,
  isChecking,
  isPhysicallyOnline,
  onCheck,
  onClose,
  onSelect,
  preference,
  quality,
  visible
}: {
  feedback: string | null;
  isChecking: boolean;
  isPhysicallyOnline: boolean;
  onCheck: () => void;
  onClose: () => void;
  onSelect: (preference: NetworkPreference) => void;
  preference: NetworkPreference;
  quality: NetworkQuality;
  visible: boolean;
}) {
  const canCheck = preference === "automatic" && isPhysicallyOnline && !isChecking;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.errorModalOverlay}>
        <View style={styles.connectivityModalCard}>
          <View style={styles.errorModalHeader}>
            <View style={styles.errorModalTitleRow}>
              <View style={styles.connectivityModalIcon}>
                <Ionicons color="#9a5a00" name="wifi-outline" size={24} />
              </View>
              <View style={styles.errorModalTitleCopy}>
                <AppText style={styles.errorModalTitle} variant="heading">
                  Modo de conectividad
                </AppText>
                <AppText style={styles.errorModalSubtitle} variant="caption">
                  Elige como debe usar Internet AgroGest.
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityLabel="Cerrar opciones de conectividad"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.errorModalCloseButton,
                pressed && styles.pressed
              ]}
            >
              <Ionicons color="#44534c" name="close" size={24} />
            </Pressable>
          </View>

          <View style={styles.connectivityOptions}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: preference === "automatic" }}
              onPress={() => onSelect("automatic")}
              style={({ pressed }) => [
                styles.connectivityOption,
                preference === "automatic" && styles.connectivityOptionSelected,
                pressed && styles.pressed
              ]}
            >
              <View style={styles.connectivityOptionIcon}>
                <Ionicons color="#08643f" name="git-network-outline" size={24} />
              </View>
              <View style={styles.connectivityOptionCopy}>
                <AppText style={styles.connectivityOptionTitle} variant="label">
                  Modo automatico
                </AppText>
                <AppText style={styles.connectivityOptionDescription} variant="caption">
                  Usa Internet cuando responde bien y protege el trabajo cuando la red es
                  inestable.
                </AppText>
              </View>
              <Ionicons
                color={preference === "automatic" ? "#4f940e" : "#9aa59f"}
                name={preference === "automatic" ? "radio-button-on" : "radio-button-off"}
                size={23}
              />
            </Pressable>

            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: preference === "offline" }}
              onPress={() => onSelect("offline")}
              style={({ pressed }) => [
                styles.connectivityOption,
                preference === "offline" && styles.connectivityOptionSelected,
                pressed && styles.pressed
              ]}
            >
              <View style={styles.connectivityOptionIcon}>
                <Ionicons color="#9a5a00" name="cloud-offline-outline" size={24} />
              </View>
              <View style={styles.connectivityOptionCopy}>
                <AppText style={styles.connectivityOptionTitle} variant="label">
                  Trabajar offline
                </AppText>
                <AppText style={styles.connectivityOptionDescription} variant="caption">
                  Guarda todo localmente y no usa la red hasta que vuelvas a automatico.
                </AppText>
              </View>
              <Ionicons
                color={preference === "offline" ? "#e28700" : "#9aa59f"}
                name={preference === "offline" ? "radio-button-on" : "radio-button-off"}
                size={23}
              />
            </Pressable>

            {preference === "automatic" && quality !== "stable" ? (
              <Pressable
                accessibilityRole="button"
                disabled={!canCheck}
                onPress={onCheck}
                style={({ pressed }) => [
                  styles.checkConnectionButton,
                  pressed && styles.pressed,
                  !canCheck && styles.manualSyncButtonDisabled
                ]}
              >
                {isChecking ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons color="#ffffff" name="pulse-outline" size={20} />
                )}
                <AppText style={styles.checkConnectionButtonText} variant="label">
                  {isChecking ? "Comprobando..." : "Probar conexion ahora"}
                </AppText>
              </Pressable>
            ) : null}

            {!isPhysicallyOnline ? (
              <AppText style={styles.connectionFeedback} variant="caption">
                El dispositivo no tiene acceso a Internet. El login y las pruebas de
                conexion requieren red.
              </AppText>
            ) : feedback ? (
              <AppText style={styles.connectionFeedback} variant="caption">
                {feedback}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoCard({
  accessibilityHint,
  description,
  icon,
  onPress,
  title,
  variant
}: {
  accessibilityHint?: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  title: string;
  variant: StatusVariant;
}) {
  const content = (
    <>
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
      {onPress ? <Ionicons color="#718078" name="chevron-forward" size={18} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.infoCard}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.infoCard, pressed && styles.infoCardPressed]}
    >
      {content}
    </Pressable>
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
  onDiscardCatalog,
  onRetryCatalog,
  visible
}: {
  errors: SyncErrorDetail[];
  onClose: () => void;
  onDiscardCatalog: (error: SyncErrorDetail) => void;
  onRetryCatalog: (error: SyncErrorDetail) => void;
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
                  {error.displayName ? (
                    <ErrorField label="Registro" value={error.displayName} />
                  ) : null}
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
                        : error.canRetryCatalog
                          ? "Vuelve a enviarlo o descarta el alta local si fue un error."
                          : "Corrige el dato desde su detalle."
                    }
                  />
                  {error.canRetryCatalog ? (
                    <View style={styles.errorItemActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onRetryCatalog(error)}
                        style={({ pressed }) => [
                          styles.errorRetryButton,
                          pressed && styles.pressed
                        ]}
                      >
                        <AppText style={styles.errorRetryButtonText} variant="label">
                          Volver a enviar
                        </AppText>
                      </Pressable>
                      {error.canDiscardCatalog ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => onDiscardCatalog(error)}
                          style={({ pressed }) => [
                            styles.errorDiscardButton,
                            pressed && styles.pressed
                          ]}
                        >
                          <AppText style={styles.errorDiscardButtonText} variant="label">
                            Descartar alta local
                          </AppText>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
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
                  style={[
                    styles.errorItem,
                    { borderColor: "#f3cd8c", backgroundColor: "#fef9e7" }
                  ]}
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
  appUpdateBanner: {
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#9bc783",
    borderRadius: 16,
    backgroundColor: "#edf6e6"
  },
  appUpdateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  appUpdateIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#d9edca"
  },
  appUpdateCopy: {
    minWidth: 0,
    flex: 1,
    gap: 2
  },
  appUpdateTitle: {
    color: "#064b31",
    fontSize: 17
  },
  appUpdateDescription: {
    color: "#466052",
    lineHeight: 18
  },
  appUpdateError: {
    color: "#9d3d35"
  },
  appUpdateButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: "#08643f"
  },
  appUpdateButtonText: {
    color: "#ffffff",
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
  infoCardPressed: {
    backgroundColor: "#f7faf6",
    transform: [{ scale: 0.99 }]
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
  connectivityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e8bd78",
    backgroundColor: "#fff7e9"
  },
  connectivityBannerText: {
    minWidth: 0,
    flex: 1,
    color: "#6f4a14",
    lineHeight: 17
  },
  connectivityBannerButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: "#f7e3bd"
  },
  connectivityBannerButtonText: {
    color: "#71480c",
    fontSize: 12
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
  connectivityModalCard: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  connectivityModalIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#fff1d8"
  },
  connectivityOptions: {
    gap: 11,
    padding: 15
  },
  connectivityOption: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: "#dce4de",
    borderRadius: 14,
    backgroundColor: "#fbfcfa"
  },
  connectivityOptionSelected: {
    borderColor: "#8fbd6b",
    backgroundColor: "#f3f8ef"
  },
  connectivityOptionIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#edf5e8"
  },
  connectivityOptionCopy: {
    minWidth: 0,
    flex: 1,
    gap: 3
  },
  connectivityOptionTitle: {
    color: "#173c2d",
    fontSize: 15
  },
  connectivityOptionDescription: {
    color: "#66736c",
    lineHeight: 17
  },
  checkConnectionButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: "#08643f"
  },
  checkConnectionButtonText: {
    color: "#ffffff"
  },
  connectionFeedback: {
    paddingHorizontal: 4,
    color: "#6f4a14",
    lineHeight: 18
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
  errorItemActions: {
    gap: 8,
    marginTop: 2
  },
  errorRetryButton: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#08643f"
  },
  errorRetryButtonText: {
    color: "#ffffff"
  },
  errorDiscardButton: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bc3f36",
    backgroundColor: "#ffffff"
  },
  errorDiscardButtonText: {
    color: "#9d3d35"
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
