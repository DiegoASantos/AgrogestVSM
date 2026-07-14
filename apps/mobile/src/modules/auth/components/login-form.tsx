import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import { AppText } from "../../../shared/components";
import { theme } from "../../../shared/constants/theme";
import { getCatalogsDownloadedAt } from "../../../shared/database/catalog-status";
import { initDatabase } from "../../../shared/database/connection";
import { downloadAllCatalogs } from "../../../shared/database/seed-catalogs";
import { toApiError } from "../../../shared/services";
import { useAuthSession } from "../hooks/use-auth-session";
import { useLoginForm } from "../hooks/use-login-form";
import { authService } from "../services";

export function LoginForm() {
  const router = useRouter();
  const { session, signIn } = useAuthSession();
  const { values, errors, updateField, submit } = useLoginForm(
    session.user?.email ?? ""
  );
  const [loginPhase, setLoginPhase] = useState<"idle" | "authenticating">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSubmitting = loginPhase !== "idle";

  async function handleSubmit() {
    const request = submit(async (nextValues) => {
      setSubmitError(null);
      setLoginPhase("authenticating");

      try {
        const nextSession = await authService.authenticate(nextValues);
        initDatabase();
        await signIn(nextSession);
        router.replace("/home");
        void refreshCatalogsAfterLogin();
      } catch (error) {
        setSubmitError(getLoginErrorMessage(error));
      } finally {
        setLoginPhase("idle");
      }
    });

    await request;
  }

  return (
    <View style={styles.container}>
      <View style={styles.fields}>
        <LoginField
          accessibilityLabel="Correo electrónico"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          error={errors.email}
          icon="mail-outline"
          keyboardType="email-address"
          onChangeText={(value) => updateField("email", value)}
          placeholder="Correo electrónico"
          returnKeyType="next"
          value={values.email}
        />

        <LoginField
          accessibilityLabel="Contraseña"
          editable={!isSubmitting}
          error={errors.password}
          icon="lock-closed-outline"
          onChangeText={(value) => updateField("password", value)}
          placeholder="Contraseña"
          secureTextEntry={!isPasswordVisible}
          value={values.password}
          trailingAction={
            <Pressable
              accessibilityLabel={
                isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
              style={({ pressed }) => [
                styles.visibilityButton,
                pressed && styles.pressedIcon
              ]}
            >
              <Ionicons
                color="#77808f"
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                size={27}
              />
            </Pressable>
          }
        />
      </View>

      {submitError ? (
        <View style={styles.errorBanner}>
          <AppText variant="label" style={styles.errorText}>
            {submitError}
          </AppText>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => {
          void handleSubmit();
        }}
        style={({ pressed }) => [
          styles.submitButton,
          pressed && styles.submitButtonPressed,
          isSubmitting && styles.submitButtonDisabled
        ]}
      >
        <LinearGradient
          colors={["#197a43", "#0d5b32"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.submitGradient}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Ionicons color="#a8cf24" name="leaf" size={25} />
          )}
          <AppText style={styles.submitLabel} variant="label">
            {getSubmitLabel(loginPhase)}
          </AppText>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

type LoginFieldProps = TextInputProps & {
  error?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  trailingAction?: React.ReactNode;
};

function LoginField({ error, icon, style, trailingAction, ...props }: LoginFieldProps) {
  return (
    <View style={styles.fieldWrapper}>
      <View style={[styles.field, error && styles.fieldError]}>
        <View style={styles.fieldIcon}>
          <Ionicons color="#0d6139" name={icon} size={24} />
        </View>
        <TextInput
          placeholderTextColor="#7b8290"
          style={[styles.input, style]}
          {...props}
        />
        {trailingAction}
      </View>
      {error ? (
        <AppText style={styles.fieldErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    paddingTop: 6
  },
  fields: {
    gap: 15
  },
  fieldWrapper: {
    gap: 6
  },
  field: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#12623b",
    backgroundColor: "#ffffff"
  },
  fieldError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorMuted
  },
  fieldIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f0f4ea"
  },
  input: {
    minHeight: 58,
    flex: 1,
    color: "#29323b",
    fontSize: 16
  },
  visibilityButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22
  },
  pressedIcon: {
    backgroundColor: "#eef3eb"
  },
  fieldErrorText: {
    color: theme.colors.error
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  errorText: {
    color: theme.colors.error
  },
  submitButton: {
    minHeight: 62,
    overflow: "hidden",
    borderRadius: 15,
    shadowColor: "#0b4c2c",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 6
  },
  submitButtonPressed: {
    opacity: 0.88
  },
  submitButtonDisabled: {
    opacity: 0.64
  },
  submitGradient: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14
  },
  submitLabel: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 24
  }
});

function getLoginErrorMessage(error: unknown) {
  const apiError = toApiError(error);

  if (apiError.message === "No se pudo validar la sesion con el backend.") {
    return apiError.message;
  }

  if (apiError.statusCode === 401) {
    return "Correo o contrasena incorrectos.";
  }

  if (!apiError.statusCode) {
    return "No se pudo conectar con el servidor.";
  }

  return apiError.message || "No se pudo iniciar sesion.";
}

async function refreshCatalogsAfterLogin() {
  const lastDownload = getCatalogsDownloadedAt();
  const hoursOld = lastDownload
    ? (Date.now() - new Date(lastDownload).getTime()) / (1000 * 60 * 60)
    : Infinity;

  if (hoursOld <= 24) {
    return;
  }

  try {
    await downloadAllCatalogs();
  } catch (error) {
    console.warn("No se pudieron actualizar los catalogos tras el login.", error);
  }
}

function getSubmitLabel(loginPhase: "idle" | "authenticating") {
  if (loginPhase === "authenticating") {
    return "Autenticando...";
  }

  return "Ingresar";
}
