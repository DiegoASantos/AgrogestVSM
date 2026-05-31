import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ImageBackground,
  Keyboard,
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
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const heroHeight = isKeyboardVisible
    ? 12
    : Math.max(235, Math.min(height * 0.32, 300));

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
            contentContainerStyle={[
              styles.scrollContent,
              isKeyboardVisible && styles.scrollContentWithKeyboard
            ]}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={isKeyboardVisible}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: heroHeight }} />

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
    paddingBottom: 32
  },
  scrollContentWithKeyboard: {
    paddingBottom: 18
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
