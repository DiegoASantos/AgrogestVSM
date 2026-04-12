import type { PropsWithChildren } from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { theme } from "../constants/theme";

type AppTextProps = PropsWithChildren<{
  variant?: "body" | "muted" | "title" | "heading" | "eyebrow" | "label" | "caption";
  style?: StyleProp<TextStyle>;
}>;

export function AppText({
  children,
  variant = "body",
  style
}: AppTextProps) {
  return <Text style={[styles.base, styles[variant], style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text
  },
  body: {
    fontSize: 15,
    lineHeight: 22
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textMuted
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.3
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700"
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: theme.colors.primary
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600"
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.textMuted
  }
});
