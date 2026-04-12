import { StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type AppStatusBadgeProps = {
  label: string;
  variant?: "success" | "error" | "warning" | "info" | "neutral";
};

export function AppStatusBadge({
  label,
  variant = "neutral"
}: AppStatusBadgeProps) {
  return (
    <View style={[styles.badge, badgeStyles[variant]]}>
      <View style={[styles.dot, dotStyles[variant]]} />
      <AppText style={[styles.label, labelStyles[variant]]} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  success: { backgroundColor: theme.colors.successMuted },
  error: { backgroundColor: theme.colors.errorMuted },
  warning: { backgroundColor: theme.colors.warningMuted },
  info: { backgroundColor: theme.colors.infoMuted },
  neutral: { backgroundColor: theme.colors.borderLight }
});

const dotStyles = StyleSheet.create({
  success: { backgroundColor: theme.colors.success },
  error: { backgroundColor: theme.colors.error },
  warning: { backgroundColor: theme.colors.warning },
  info: { backgroundColor: theme.colors.info },
  neutral: { backgroundColor: theme.colors.textMuted }
});

const labelStyles = StyleSheet.create({
  success: { color: "#1e8449" },
  error: { color: theme.colors.error },
  warning: { color: "#7d6608" },
  info: { color: theme.colors.info },
  neutral: { color: theme.colors.textMuted }
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  label: {
    fontWeight: "600"
  }
});
