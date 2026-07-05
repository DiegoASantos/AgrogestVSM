import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";

type StepObservationCardProps = {
  value: string;
  onChange: (value: string) => void;
};

export function StepObservationCard({ value, onChange }: StepObservationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText style={styles.title} variant="heading">
          Observacion del paso
        </AppText>
        <AppText style={styles.subtitle} variant="caption">
          Esta informacion pertenece solo al paso actual.
        </AppText>
      </View>
      <TextInput
        multiline
        numberOfLines={4}
        onChangeText={onChange}
        placeholder="Escribe una observacion opcional"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.input}
        textAlignVertical="top"
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    ...theme.shadow.sm
  },
  header: {
    gap: 3
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 92,
    padding: 12
  },
  subtitle: {
    color: theme.colors.textMuted
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 18
  }
});
