import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import type { TimePeriod } from "../../domain/time-input";

type Time12HourInputProps = {
  label: string;
  value: string;
  period: TimePeriod;
  error?: string | null;
  onChangeText: (value: string) => void;
  onEndEditing: () => void;
  onPeriodChange: (period: TimePeriod) => void;
};

export function Time12HourInput({
  label,
  value,
  period,
  error,
  onChangeText,
  onEndEditing,
  onPeriodChange
}: Time12HourInputProps) {
  return (
    <View style={styles.wrapper}>
      <AppText style={styles.label} variant="label">
        {label}
      </AppText>
      <View style={[styles.inputFrame, error && styles.inputError]}>
        <View style={styles.icon}>
          <Ionicons color="#064b31" name="time-outline" size={22} />
        </View>
        <TextInput
          accessibilityLabel={`${label} en formato 12 horas`}
          keyboardType="number-pad"
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          placeholder="HH:MM"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={value}
        />
        <View style={styles.periodToggle}>
          {(["AM", "PM"] as const).map((option) => {
            const isSelected = period === option;
            return (
              <Pressable
                accessibilityLabel={`${label} ${option}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                key={option}
                onPress={() => onPeriodChange(option)}
                style={({ pressed }) => [
                  styles.periodButton,
                  isSelected && styles.periodButtonSelected,
                  pressed && styles.pressed
                ]}
              >
                <AppText
                  style={[
                    styles.periodButtonText,
                    isSelected && styles.periodButtonTextSelected
                  ]}
                  variant="caption"
                >
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      {error ? (
        <AppText style={styles.errorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { color: theme.colors.text },
  inputFrame: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: "hidden"
  },
  inputError: { borderColor: theme.colors.error },
  icon: { width: 46, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 50, color: theme.colors.text, fontSize: 16 },
  periodToggle: { flexDirection: "row", paddingRight: 6, gap: 4 },
  periodButton: {
    minWidth: 42,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface
  },
  periodButtonSelected: { backgroundColor: theme.colors.primary },
  periodButtonText: { color: theme.colors.textMuted, fontWeight: "700" },
  periodButtonTextSelected: { color: "#ffffff" },
  pressed: { opacity: 0.8 },
  errorText: { color: theme.colors.error }
});
