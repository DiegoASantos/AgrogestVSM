import { useEffect } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthSession } from "../src/modules/auth/hooks/use-auth-session";
import { AuthSessionProvider } from "../src/modules/auth/state/auth-session-provider";
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

  useEffect(() => {
    if (!isAuthenticated && isProtectedMobilePath(pathname)) {
      router.replace("/login");
    }
  }, [isAuthenticated, pathname, router]);

  return (
    <>
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
          name="productores/index"
          options={{
            title: "Productores"
          }}
        />
        <Stack.Screen
          name="productores/[id]"
          options={{
            title: "Detalle del productor"
          }}
        />
        <Stack.Screen
          name="productores/sectores"
          options={{
            title: "Sectores"
          }}
        />
        <Stack.Screen
          name="sectores/[id]/parcelas"
          options={{
            title: "Parcelas"
          }}
        />
        <Stack.Screen
          name="parcelas/[id]"
          options={{
            title: "Detalle de parcela"
          }}
        />
        <Stack.Screen
          name="parcelas/[id]/nueva-visita"
          options={{
            title: "Nueva visita"
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
            title: "Obs. sanitarias"
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
    </>
  );
}

function isProtectedMobilePath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return (
    pathname.startsWith("/productores") ||
    pathname.startsWith("/sectores") ||
    pathname.startsWith("/parcelas") ||
    pathname.startsWith("/visitas-campo")
  );
}
