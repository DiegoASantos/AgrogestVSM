import { useEffect } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthSession } from "../src/modules/auth/hooks/use-auth-session";
import { AuthSessionProvider } from "../src/modules/auth/state/auth-session-provider";
import { AppBottomNavigation } from "../src/shared/components";
import { initDatabase } from "../src/shared/database/connection";
import { theme } from "../src/shared/constants/theme";
import { useSync } from "../src/shared/sync";

function SyncRunner() {
  useSync();
  return null;
}

export default function RootLayout() {
  useEffect(() => { initDatabase(); }, []);

  return (
    <SafeAreaProvider>
      <AuthSessionProvider>
        <AppNavigation />
      </AuthSessionProvider>
    </SafeAreaProvider>
  );
}

function AppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthSession();
  const showBottomNavigation = isAuthenticated && pathname !== "/login";

  useEffect(() => {
    if (!isAuthenticated && isProtectedMobilePath(pathname)) {
      router.replace("/login");
    }
  }, [isAuthenticated, pathname, router]);

  return (
    <View style={styles.app}>
      <SyncRunner />
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary
          },
          headerTintColor: theme.colors.textInverse,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 17
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background
          },
          headerBackTitle: ""
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "AgroGest VSM",
            headerStyle: { backgroundColor: theme.colors.primaryDark }
          }}
        />
        <Stack.Screen
          name="home"
          options={{
            headerShown: false,
            title: "Inicio"
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            title: "Iniciar sesion"
          }}
        />
        <Stack.Screen
          name="visitas-campo/registrar"
          options={{
            headerShown: false,
            title: "Registro de visita"
          }}
        />
        <Stack.Screen
          name="visitas-campo/nueva"
          options={{
            title: "Seleccionar parcela"
          }}
        />
        <Stack.Screen
          name="visitas-campo/historial"
          options={{
            title: "Historial"
          }}
        />
        <Stack.Screen
          name="visitas-campo/[id]"
          options={{
            title: "Detalle de visita"
          }}
        />
        <Stack.Screen
          name="visitas-campo/[id]/evaluaciones"
          options={{
            title: "Evaluaciones"
          }}
        />
        <Stack.Screen
          name="visitas-campo/[id]/observaciones-sanitarias"
          options={{
            title: "Plagas y enfermedades"
          }}
        />
        <Stack.Screen
          name="visitas-campo/[id]/recomendaciones"
          options={{
            title: "Recomendaciones"
          }}
        />
        <Stack.Screen
          name="visitas-campo/[id]/productos-recomendados"
          options={{
            title: "Productos recomendados"
          }}
        />
      </Stack>
      {showBottomNavigation ? <AppBottomNavigation /> : null}
    </View>
  );
}

function isProtectedMobilePath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/visitas-campo")
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: "#064b31"
  }
});
