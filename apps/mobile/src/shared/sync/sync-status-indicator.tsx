import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";

import { AppText } from "../components";

type SyncStatusIndicatorProps = {
  pendingCount: number;
  errorCount: number;
  isSyncing?: boolean;
};

export function SyncStatusIndicator({
  errorCount,
  isSyncing = false,
  pendingCount
}: SyncStatusIndicatorProps) {
  if (!isSyncing && pendingCount === 0 && errorCount === 0) {
    return null;
  }

  const status = resolveStatus({ errorCount, isSyncing, pendingCount });

  return (
    <View style={[styles.container, status.containerStyle]}>
      <Ionicons color={status.color} name={status.icon} size={18} />
      <AppText style={[styles.label, { color: status.color }]} variant="caption">
        {status.label}
      </AppText>
    </View>
  );
}

function resolveStatus({
  errorCount,
  isSyncing,
  pendingCount
}: Required<SyncStatusIndicatorProps>) {
  if (isSyncing) {
    return {
      color: "#08643f",
      containerStyle: styles.syncing,
      icon: "sync" as const,
      label: "Sincronizando"
    };
  }

  if (errorCount > 0) {
    return {
      color: "#bc3f36",
      containerStyle: styles.error,
      icon: "warning-outline" as const,
      label: `${errorCount} con error`
    };
  }

  return {
    color: "#6d7480",
    containerStyle: styles.pending,
    icon: "time-outline" as const,
    label: `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`
  };
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  error: {
    backgroundColor: "#fceae7",
    borderColor: "#e8b5ae"
  },
  label: {
    fontSize: 12,
    lineHeight: 15
  },
  pending: {
    backgroundColor: "#f1f3f5",
    borderColor: "#d9dee3"
  },
  syncing: {
    backgroundColor: "#edf6e6",
    borderColor: "#b7d7a3"
  }
});
