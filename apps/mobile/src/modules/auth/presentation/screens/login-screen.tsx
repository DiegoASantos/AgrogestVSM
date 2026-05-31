import { StatusBar } from "expo-status-bar";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../../../../shared/components";
import { LoginForm } from "../../components/login-form";

// Static require lets Metro package the local background image for offline use.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGIN_BACKGROUND = require("../../../../../assets/images/login_fondo.webp");

export function LoginScreen() {
  const { height } = useWindowDimensions();
  const heroHeight = Math.max(270, Math.min(height * 0.39, 390));

  return (
    <ImageBackground
      resizeMode="cover"
      source={LOGIN_BACKGROUND}
      style={styles.background}
    >
      <StatusBar backgroundColor="#145c3b" style="light" />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardArea}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.hero, { height: heroHeight }]}>
              <View style={styles.brandCopy}>
                <AppText style={styles.brandTitle} variant="title">
                  Visitas de Campo
                </AppText>
                <AppText style={styles.brandSubtitle} variant="body">
                  Gestión agrícola en tus manos
                </AppText>
              </View>
            </View>

            <View style={styles.card}>
              <AppText style={styles.title} variant="title">
                Iniciar sesión
              </AppText>
              <AppText style={styles.subtitle} variant="body">
                Accede para registrar visitas de campo y seguimiento técnico de
                productores.
              </AppText>

              <LoginForm />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#f7f3e8"
  },
  safeArea: {
    flex: 1
  },
  keyboardArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 118
  },
  hero: {
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 24
  },
  brandCopy: {
    alignItems: "center"
  },
  brandTitle: {
    color: "#0d5836",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.45
  },
  brandSubtitle: {
    color: "#246b42",
    fontSize: 15,
    lineHeight: 21
  },
  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 18,
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(205, 214, 199, 0.92)",
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    shadowColor: "#163a28",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 9
  },
  title: {
    color: "#0d5836",
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -0.7
  },
  subtitle: {
    maxWidth: 390,
    color: "#59616e",
    fontSize: 16,
    lineHeight: 24
  }
});
