import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import {
  AppCard,
  AppHeader,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { LoginForm } from "../../components/login-form";

export function LoginScreen() {
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
          title="Iniciar sesion"
          subtitle="Ingresa tus credenciales para acceder al sistema."
        />
        <LoginForm />
      </AppCard>
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.md
  },
  logoText: {
    color: theme.colors.textInverse,
    fontSize: 22
  }
});
