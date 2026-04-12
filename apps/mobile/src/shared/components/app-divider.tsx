import { StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";

export function AppDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.borderLight
  }
});
