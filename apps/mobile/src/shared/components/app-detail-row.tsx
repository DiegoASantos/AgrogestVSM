import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type AppDetailRowProps = {
  label: string;
  value: string;
  valueStyle?: StyleProp<TextStyle>;
  layout?: "stacked" | "inline";
};

export function AppDetailRow({
  label,
  value,
  valueStyle,
  layout = "inline"
}: AppDetailRowProps) {
  return (
    <View style={layout === "inline" ? styles.inline : styles.stacked}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="body" style={[styles.value, valueStyle]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight
  },
  stacked: {
    gap: 2,
    paddingVertical: 4
  },
  label: {
    color: theme.colors.textMuted,
    fontWeight: "500",
    minWidth: 100
  },
  value: {
    flex: 1,
    textAlign: "right"
  }
});
