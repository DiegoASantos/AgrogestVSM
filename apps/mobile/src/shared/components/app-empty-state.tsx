import { StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type AppEmptyStateProps = {
  title: string;
  message: string;
};

export function AppEmptyState({ title, message }: AppEmptyStateProps) {
  return (
    <View style={styles.container}>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="muted" style={styles.message}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 8
  },
  title: {
    textAlign: "center",
    color: theme.colors.textMuted
  },
  message: {
    textAlign: "center"
  }
});
