import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />

      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <AppText style={styles.logoText} variant="title">
            AG
          </AppText>
        </View>
      </View>

      <AppCard>
        <AppHeader
          eyebrow="Bienvenido"
          title="AgroGest VSM"
          subtitle="Sistema de Visitas Sanitarias para el monitoreo y gestion agricola en campo."
        />

        <View style={styles.actions}>
          <AppButton label="Iniciar sesion" onPress={() => router.push("/login")} />
          <AppButton
            label="Ir al inicio"
            onPress={() => router.push("/home")}
            variant="outline"
          />
        </View>
      </AppCard>

      <AppText variant="caption" style={styles.version}>
        v1.0 - Modo local-first
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    gap: 24
  },
  logoSection: {
    alignItems: "center"
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.lg
  },
  logoText: {
    color: theme.colors.textInverse,
    fontSize: 28
  },
  actions: {
    gap: 10
  },
  version: {
    textAlign: "center"
  }
});
