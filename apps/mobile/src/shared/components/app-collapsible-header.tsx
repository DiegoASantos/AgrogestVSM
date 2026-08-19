import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type AppCollapsibleStatusTone = "success" | "warning" | "neutral";

export function AppCollapsibleHeader({
  action,
  badge,
  closeLabel = "Ocultar opciones",
  icon,
  isExpanded,
  onToggle,
  openLabel = "Ver opciones",
  statusLabel,
  statusTone = "neutral",
  subtitle,
  title
}: {
  action?: ReactNode;
  badge?: string;
  closeLabel?: string;
  icon?: IoniconName;
  isExpanded: boolean;
  onToggle: () => void;
  openLabel?: string;
  statusLabel?: string;
  statusTone?: AppCollapsibleStatusTone;
  subtitle: string;
  title: string;
}) {
  const actionLabel = isExpanded ? closeLabel : openLabel;

  return (
    <View style={styles.headerRow}>
      <Pressable
        accessibilityLabel={`${actionLabel}: ${title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        {badge ? (
          <View style={styles.badge}>
            <AppText style={styles.badgeText} variant="eyebrow">
              {badge}
            </AppText>
          </View>
        ) : icon ? (
          <View style={styles.iconContainer}>
            <Ionicons color={theme.colors.primaryDark} name={icon} size={22} />
          </View>
        ) : null}

        <View style={styles.copy}>
          <AppText style={styles.title} variant="heading">
            {title}
          </AppText>
          <AppText style={styles.subtitle} variant="caption">
            {subtitle}
          </AppText>
          {statusLabel ? (
            <View
              style={[
                styles.status,
                statusTone === "success"
                  ? styles.statusSuccess
                  : statusTone === "warning"
                    ? styles.statusWarning
                    : styles.statusNeutral
              ]}
            >
              <AppText
                style={[
                  styles.statusText,
                  statusTone === "success"
                    ? styles.statusTextSuccess
                    : statusTone === "warning"
                      ? styles.statusTextWarning
                      : styles.statusTextNeutral
                ]}
                variant="caption"
              >
                {statusLabel}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.trailingAction}>
          <AppText style={styles.actionText} variant="caption">
            {actionLabel}
          </AppText>
          <Ionicons
            color={theme.colors.primaryDark}
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={22}
          />
        </View>
      </Pressable>
      {action ? <View style={styles.externalAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionText: {
    color: theme.colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right"
  },
  badge: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  badgeText: {
    color: theme.colors.textInverse
  },
  button: {
    alignItems: "center",
    borderRadius: theme.radius.md,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingVertical: 4
  },
  buttonPressed: {
    opacity: 0.72
  },
  copy: {
    flex: 1,
    gap: 3
  },
  externalAction: {
    alignSelf: "flex-start"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  status: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  statusNeutral: {
    backgroundColor: theme.colors.infoMuted,
    borderColor: theme.colors.info
  },
  statusSuccess: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.success
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700"
  },
  statusTextNeutral: {
    color: theme.colors.info
  },
  statusTextSuccess: {
    color: theme.colors.primaryDark
  },
  statusTextWarning: {
    color: theme.colors.primaryDark
  },
  statusWarning: {
    backgroundColor: theme.colors.warningMuted,
    borderColor: theme.colors.warning
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 18
  },
  title: {
    color: theme.colors.primaryDark
  },
  trailingAction: {
    alignItems: "flex-end",
    gap: 4,
    justifyContent: "center",
    maxWidth: 64,
    minHeight: 48
  }
});
