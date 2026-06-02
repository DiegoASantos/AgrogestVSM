import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "./app-text";

type NavigationTab = "visitas" | "inicio" | "historial";
type NavigationRoute = "/home" | "/visitas-campo/nueva" | "/visitas-campo/historial";

const ITEMS: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: NavigationRoute;
  tab: NavigationTab;
}> = [
  {
    icon: "calendar-outline",
    label: "Visitas",
    route: "/visitas-campo/nueva",
    tab: "visitas"
  },
  {
    icon: "home",
    label: "Inicio",
    route: "/home",
    tab: "inicio"
  },
  {
    icon: "time-outline",
    label: "Historial",
    route: "/visitas-campo/historial",
    tab: "historial"
  }
];

export function AppBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.navigation}>
        {ITEMS.map((item) => {
          const isActive = item.tab === activeTab;

          return (
            <Pressable
              accessibilityLabel={`Ir a ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              hitSlop={6}
              key={item.tab}
              onPress={() => router.replace(item.route)}
              style={({ pressed }) => [
                styles.item,
                item.tab === "inicio" && styles.homeItem,
                isActive && styles.activeItem,
                pressed && styles.pressed
              ]}
            >
              <Ionicons color="#ffffff" name={item.icon} size={25} />
              <AppText style={styles.label} variant="caption">
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function getActiveTab(pathname: string): NavigationTab {
  if (pathname === "/home") {
    return "inicio";
  }

  if (pathname === "/visitas-campo/nueva" || pathname === "/visitas-campo/registrar") {
    return "visitas";
  }

  return "historial";
}

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: 14,
    paddingTop: 5,
    backgroundColor: "#064b31"
  },
  navigation: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 35,
    backgroundColor: "#064b31",
    shadowColor: "#213c31",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  item: {
    minWidth: 94,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 29
  },
  homeItem: {
    marginTop: -13
  },
  activeItem: {
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#3e8739"
  },
  label: {
    color: "#ffffff",
    fontSize: 12
  },
  pressed: {
    opacity: 0.75
  }
});
