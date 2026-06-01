import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../../../../shared/components";
import { useIsOnline } from "../../../../shared/connectivity/use-is-online";
import { getLastSyncTime, getSyncCounts } from "../../../../shared/sync";
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

const PRODUCERS_ROUTE = "/productores";

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isOnline } = useIsOnline();
  const { isAuthenticated, session, signOut } = useAuthSession();
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisitaCampo[]>([]);
  const heroHeight = Math.min(Math.max(width * 0.58, 218), 330);

  const loadDashboard = useCallback(() => {
    setSyncCounts(getSyncCounts());
    setLastSyncTime(getLastSyncTime());

    if (!session.accessToken) {
      setRecentVisits([]);
      return;
    }

    try {
      setRecentVisits(
        visitasCampoService.getRecentByAccessToken(session.accessToken)
      );
    } catch {
      setRecentVisits([]);
    }
  }, [session.accessToken]);

  useFocusEffect(loadDashboard);

  const syncStatus = useMemo(() => getSyncStatus(syncCounts), [syncCounts]);
  const goToProducers = useCallback(() => {
    router.push(PRODUCERS_ROUTE);
  }, [router]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
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
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed
              ]}
            >
              <Ionicons color="#064b31" name="log-out-outline" size={25} />
              <AppText style={styles.logoutText} variant="label">
                Cerrar sesion
              </AppText>
            </Pressable>
          ) : null}
        </View>

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
                isOnline
                  ? "Conexion estable"
                  : "Tus cambios se guardaran localmente"
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
            <View style={styles.syncMetrics}>
              <SyncMetric
                icon="document-text-outline"
                label="Datos pendientes"
                value={syncCounts.pendingCount}
                variant="success"
              />
              <SyncMetric
                icon="warning-outline"
                label="Errores"
                value={syncCounts.errorCount}
                variant="warning"
              />
              <SyncMetric
                icon="checkmark-circle-outline"
                label={syncStatus.summary}
                value={syncStatus.metric}
                variant={syncStatus.variant}
              />
            </View>
          </View>

          <View style={styles.actionGrid}>
            <ActionCard
              background={VISITS_CARD_BACKGROUND}
              description="Registra y gestiona visitas a campo"
              icon="calendar-outline"
              label="Visitas"
              onPress={goToProducers}
            />
            <ActionCard
              background={HISTORY_CARD_BACKGROUND}
              description="Consulta tus visitas realizadas"
              icon="time-outline"
              label="Historial"
              onPress={goToProducers}
            />
          </View>

          <View style={styles.activityPanel}>
            <View style={styles.activityHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Actividad reciente
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={goToProducers}
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

      <HomeNavigation onNavigate={goToProducers} />
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
  value,
  variant
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
  variant: StatusVariant;
}) {
  return (
    <View style={styles.syncMetric}>
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
          {visit.parcelaName ? `Visita a ${visit.parcelaName}` : "Visita de campo"}
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

function HomeNavigation({ onNavigate }: { onNavigate: () => void }) {
  return (
    <View style={styles.navigationWrap}>
      <View style={styles.navigation}>
        <NavigationItem icon="calendar-outline" label="Visitas" onPress={onNavigate} />
        <View style={styles.homeNavItem}>
          <View style={styles.homeNavCircle}>
            <Ionicons color="#ffffff" name="home" size={26} />
            <AppText style={styles.homeNavText} variant="caption">
              Inicio
            </AppText>
          </View>
        </View>
        <NavigationItem icon="time-outline" label="Historial" onPress={onNavigate} />
      </View>
    </View>
  );
}

function NavigationItem({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navigationItem, pressed && styles.navPressed]}
    >
      <Ionicons color="#ffffff" name={icon} size={25} />
      <AppText style={styles.navigationText} variant="caption">
        {label}
      </AppText>
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

function getVisitStatus(syncStatus: RecentVisitaCampo["syncStatus"]) {
  if (syncStatus === "error") {
    return { icon: "alert-circle" as const, label: "Con error", variant: "error" as const };
  }

  if (syncStatus === "pending") {
    return { icon: "time" as const, label: "Pendiente", variant: "warning" as const };
  }

  return { icon: "checkmark-circle" as const, label: "Sincronizado", variant: "success" as const };
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
    paddingBottom: 103
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
  navigationWrap: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8
  },
  navigation: {
    width: "100%",
    maxWidth: 760,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 36,
    backgroundColor: "#064b31",
    shadowColor: "#213c31",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  navigationItem: {
    minWidth: 92,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  navigationText: {
    color: "#ffffff",
    fontSize: 12
  },
  homeNavItem: {
    width: 90,
    alignItems: "center"
  },
  homeNavCircle: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginTop: -17,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: "#ffffff",
    backgroundColor: "#3e8739",
    shadowColor: "#183a2b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 7,
    elevation: 7
  },
  homeNavText: {
    color: "#ffffff",
    fontSize: 12
  },
  pressed: {
    opacity: 0.8
  },
  navPressed: {
    opacity: 0.72
  }
});
