import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { getConnectivityPresentation } from "../connectivity/connectivity-presentation";
import { useConnectivity } from "../connectivity/use-connectivity";
import { theme } from "../constants/theme";
import { AppText } from "./app-text";

type ScreenContainerProps = PropsWithChildren<{
  contentStyle?: ViewStyle;
}>;

export function ScreenContainer({ children, contentStyle }: ScreenContainerProps) {
  const { effectiveMode, isPhysicallyOnline, quality } = useConnectivity();
  const connectivity = getConnectivityPresentation({
    effectiveMode,
    isPhysicallyOnline,
    quality
  });

  return (
    <View style={styles.safeArea}>
      <View style={[styles.content, contentStyle]}>
        {connectivity.banner ? (
          <View style={styles.offlineBanner}>
            <View style={styles.offlineDot} />
            <AppText variant="label" style={styles.offlineBannerText}>
              {connectivity.banner}
            </AppText>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.warningMuted,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    marginBottom: 12
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.warning
  },
  offlineBannerText: {
    color: "#7d6608",
    flex: 1
  }
});
