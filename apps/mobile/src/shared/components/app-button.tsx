import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  disabled?: boolean;
  loading?: boolean;
  size?: "default" | "small";
  icon?: keyof typeof Ionicons.glyphMap;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  size = "default",
  icon
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === "small" && styles.small,
        variantStyles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={
              variant === "primary" || variant === "danger"
                ? "#ffffff"
                : theme.colors.primary
            }
            size="small"
            style={styles.spinner}
          />
        ) : null}
        {!loading && icon ? (
          <Ionicons
            color={iconColors[variant]}
            name={icon}
            size={size === "small" ? 17 : 20}
          />
        ) : null}
        <AppText
          variant="label"
          style={[labelStyles[variant], size === "small" && styles.smallLabel]}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadow.sm
  },
  secondary: {
    backgroundColor: theme.colors.primaryMuted
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.primary
  },
  danger: {
    backgroundColor: theme.colors.error,
    ...theme.shadow.sm
  }
});

const labelStyles = StyleSheet.create({
  primary: {
    color: theme.colors.textInverse
  },
  secondary: {
    color: theme.colors.primaryDark
  },
  outline: {
    color: theme.colors.primary
  },
  danger: {
    color: theme.colors.textInverse
  }
});

const iconColors = {
  primary: theme.colors.textInverse,
  secondary: theme.colors.primaryDark,
  outline: theme.colors.primary,
  danger: theme.colors.textInverse
} satisfies Record<NonNullable<AppButtonProps["variant"]>, string>;

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  small: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  smallLabel: {
    fontSize: 13
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  spinner: {
    marginRight: 4
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.5
  }
});
