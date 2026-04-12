import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppInput,
  AppText
} from "../../../shared/components";
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
  const { signIn } = useAuthSession();
  const { values, errors, updateField, submit } = useLoginForm();
  const [loginPhase, setLoginPhase] = useState<"idle" | "authenticating">(
    "idle"
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSubmitting = loginPhase !== "idle";

  async function handleSubmit() {
    const request = submit(async (nextValues) => {
      setSubmitError(null);
      setLoginPhase("authenticating");

      try {
        const nextSession = await authService.authenticate(nextValues);
        initDatabase();
        signIn(nextSession);
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
        <AppInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
          keyboardType="email-address"
          label="Correo electronico"
          onChangeText={(value) => updateField("email", value)}
          placeholder="correo@ejemplo.com"
          value={values.email}
          error={errors.email}
        />

        <AppInput
          editable={!isSubmitting}
          label="Contrasena"
          onChangeText={(value) => updateField("password", value)}
          placeholder="Tu contrasena"
          secureTextEntry
          value={values.password}
          error={errors.password}
        />
      </View>

      {submitError ? (
        <View style={styles.errorBanner}>
          <AppText variant="label" style={styles.errorText}>
            {submitError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          disabled={isSubmitting}
          loading={isSubmitting}
          label={getSubmitLabel(loginPhase)}
          onPress={() => {
            void handleSubmit();
          }}
        />
        <AppButton
          disabled={isSubmitting}
          label="Volver"
          onPress={() => router.replace("/")}
          variant="outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20
  },
  fields: {
    gap: 14
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
  actions: {
    gap: 10
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
