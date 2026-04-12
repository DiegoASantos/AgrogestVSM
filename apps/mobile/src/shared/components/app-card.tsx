import type { PropsWithChildren } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../constants/theme";

type AppCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "flat" | "outlined";
}>;

export function AppCard({ children, style, variant = "default" }: AppCardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "flat" && styles.flat,
        variant === "outlined" && styles.outlined,
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 20,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.md
  },
  flat: {
    borderWidth: 0,
    ...theme.shadow.sm
  },
  outlined: {
    shadowOpacity: 0,
    elevation: 0,
    borderColor: theme.colors.border
  }
});
