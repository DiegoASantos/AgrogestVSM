import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "./app-text";

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({
  eyebrow,
  title,
  subtitle,
  style
}: AppHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
      <AppText variant="title">{title}</AppText>
      {subtitle ? (
        <AppText variant="muted" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  subtitle: {
    marginTop: 2
  }
});
