import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBadge, AppText } from "../../../../shared/components";
import { useIsOnline } from "../../../../shared/connectivity/use-is-online";
import { getLastSyncTime, getSyncCounts } from "../../../../shared/sync";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";

// Static requires keep the branded home available while the device is offline.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HOME_BACKGROUND = require("../../../../../assets/images/home_mobile.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VSM_LOGO = require("../../../../../assets/images/icon_vsm.png");

export function HomeScreen() {
  const router = useRouter();
  const { isOnline } = useIsOnline();
  const { isAuthenticated, session, signOut } = useAuthSession();
  const [syncCounts, setSyncCounts] = useState({ pendingCount: 0, errorCount: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSyncCounts(getSyncCounts());
      setLastSyncTime(getLastSyncTime());
      return undefined;
    }, [])
  );

  const syncStatus = getSyncStatus(syncCounts);

  return (
    <ImageBackground
      resizeMode="cover"
      source={HOME_BACKGROUND}
      style={styles.background}
    >
      <StatusBar backgroundColor="#f8f7f0" style="dark" />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandSection}>
            <Image resizeMode="contain" source={VSM_LOGO} style={styles.logo} />
            <AppText style={styles.brandTitle} variant="title">
              AgroGest VSM
            </AppText>
            <AppText style={styles.brandSubtitle} variant="body">
              Sistema de visitas para el monitoreo y la gestion agricola en
              campo.
            </AppText>
          </View>

          <View style={styles.heroSpacer} />

          <View style={styles.card}>
            <View style={styles.profileIcon}>
              <Ionicons color="#ffffff" name="person-outline" size={35} />
            </View>

            <AppText style={styles.welcomeTitle} variant="title">
              Bienvenido
            </AppText>
            <AppText style={styles.welcomeSubtitle} variant="body">
              {isAuthenticated
                ? `${session.user?.displayName || session.user?.email}, gestiona tus visitas de campo.`
                : "Inicia sesion para continuar gestionando tus visitas de campo."}
            </AppText>

            {!isOnline ? (
              <View style={styles.offlineBanner}>
                <Ionicons color="#8a6410" name="cloud-offline-outline" size={19} />
                <AppText style={styles.offlineText} variant="label">
                  Sin conexion. Tus cambios se guardaran localmente.
                </AppText>
              </View>
            ) : null}

            {isAuthenticated ? (
              <>
                <View style={styles.syncPanel}>
                  <View style={styles.syncHeader}>
                    <View style={styles.syncTitle}>
                      <Ionicons
                        color="#17613d"
                        name="sync-outline"
                        size={20}
                      />
                      <AppText style={styles.syncTitleText} variant="label">
                        Sincronizacion
                      </AppText>
                    </View>
                    <AppStatusBadge
                      label={syncStatus.label}
                      variant={syncStatus.variant}
                    />
                  </View>
                  <AppText style={styles.syncDetail} variant="caption">
                    {syncCounts.pendingCount} pendientes, {syncCounts.errorCount}{" "}
                    con error
                  </AppText>
                  <AppText style={styles.syncDetail} variant="caption">
                    Ultima sync: {formatLastSyncTime(lastSyncTime)}
                  </AppText>
                </View>

                <HomeAction
                  icon="people-outline"
                  label="Ver productores"
                  onPress={() => router.push("/productores")}
                  variant="primary"
                />
                <HomeAction
                  icon="log-out-outline"
                  label="Cerrar sesion"
                  onPress={() => {
                    signOut();
                    router.replace("/login");
                  }}
                  variant="outline"
                />
              </>
            ) : (
              <HomeAction
                icon="lock-closed-outline"
                label="Iniciar sesion"
                onPress={() => router.push("/login")}
                variant="primary"
              />
            )}
          </View>

          <View style={styles.footer}>
            <Ionicons color="#78a62e" name="leaf" size={17} />
            <AppText style={styles.footerText} variant="caption">
              v0.1.2 - Modo local-first
            </AppText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function HomeAction({
  icon,
  label,
  onPress,
  variant
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant: "primary" | "outline";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        variant === "primary" ? styles.primaryAction : styles.outlineAction,
        pressed && styles.actionPressed
      ]}
    >
      <Ionicons
        color={variant === "primary" ? "#ffffff" : "#17613d"}
        name={icon}
        size={24}
      />
      <AppText
        style={
          variant === "primary"
            ? styles.primaryActionText
            : styles.outlineActionText
        }
        variant="label"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function getSyncStatus(syncCounts: { pendingCount: number; errorCount: number }) {
  if (syncCounts.errorCount > 0) {
    return { label: `${syncCounts.errorCount} errores`, variant: "error" as const };
  }

  if (syncCounts.pendingCount > 0) {
    return {
      label: `${syncCounts.pendingCount} pendientes`,
      variant: "warning" as const
    };
  }

  return { label: "Al dia", variant: "success" as const };
}

function formatLastSyncTime(lastSyncTime: string | null) {
  if (!lastSyncTime) {
    return "no registrada";
  }

  const date = new Date(lastSyncTime);

  if (Number.isNaN(date.getTime())) {
    return lastSyncTime;
  }

  return date.toLocaleString("es-PE");
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#f8f7f0"
  },
  safeArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22
  },
  brandSection: {
    width: "100%",
    alignItems: "center"
  },
  logo: {
    width: 104,
    height: 104
  },
  brandTitle: {
    marginTop: 10,
    color: "#124d31",
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.7
  },
  brandSubtitle: {
    maxWidth: 330,
    marginTop: 8,
    color: "#65706a",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  heroSpacer: {
    minHeight: 178,
    flexGrow: 1
  },
  card: {
    width: "100%",
    maxWidth: 520,
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 24,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(217, 225, 214, 0.92)",
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    shadowColor: "#1c4b35",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.17,
    shadowRadius: 18,
    elevation: 9
  },
  profileIcon: {
    position: "absolute",
    top: -34,
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: "#17613d",
    shadowColor: "#113f2b",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.26,
    shadowRadius: 8,
    elevation: 8
  },
  welcomeTitle: {
    color: "#124d31",
    fontSize: 28,
    lineHeight: 34
  },
  welcomeSubtitle: {
    maxWidth: 360,
    color: "#68726e",
    textAlign: "center"
  },
  offlineBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e3c36c",
    backgroundColor: "#fff8df"
  },
  offlineText: {
    flex: 1,
    color: "#805f15",
    fontSize: 12,
    lineHeight: 17
  },
  syncPanel: {
    width: "100%",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#f2f7ef"
  },
  syncHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  syncTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  syncTitleText: {
    color: "#17613d"
  },
  syncDetail: {
    color: "#69756f"
  },
  action: {
    width: "100%",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
    paddingHorizontal: 18,
    borderRadius: 14
  },
  primaryAction: {
    backgroundColor: "#17613d",
    shadowColor: "#16472f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 5
  },
  outlineAction: {
    borderWidth: 1.5,
    borderColor: "#17613d",
    backgroundColor: "rgba(255, 255, 255, 0.75)"
  },
  actionPressed: {
    opacity: 0.82
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 17
  },
  outlineActionText: {
    color: "#17613d",
    fontSize: 17
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 18
  },
  footerText: {
    color: "#78877e",
    fontSize: 13
  }
});
