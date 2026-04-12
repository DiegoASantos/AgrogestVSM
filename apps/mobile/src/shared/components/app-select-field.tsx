import { Pressable, StyleSheet, View } from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

export type AppSelectOption = {
  value: string;
  label: string;
  helper?: string;
};

type AppSelectFieldProps = {
  label: string;
  placeholder: string;
  selectedLabel?: string;
  options: AppSelectOption[];
  isOpen: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
};

export function AppSelectField({
  label,
  placeholder,
  selectedLabel,
  options,
  isOpen,
  isLoading = false,
  disabled = false,
  error,
  emptyMessage = "No hay opciones disponibles.",
  onToggle,
  onSelect
}: AppSelectFieldProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.trigger,
          isOpen && styles.triggerOpen,
          error && styles.triggerError,
          disabled && styles.disabledTrigger,
          pressed && !disabled && styles.pressedTrigger
        ]}
      >
        <AppText
          style={!selectedLabel ? styles.placeholderText : undefined}
          variant="body"
        >
          {selectedLabel || placeholder}
        </AppText>
        <AppText style={styles.chevron} variant="caption">
          {isOpen ? "\u25B2" : "\u25BC"}
        </AppText>
      </Pressable>

      {error ? (
        <AppText style={styles.errorText} variant="caption">
          {error}
        </AppText>
      ) : null}

      {isOpen ? (
        <View style={styles.optionsContainer}>
          {isLoading ? (
            <AppText variant="muted" style={styles.optionMessage}>
              Cargando opciones...
            </AppText>
          ) : null}

          {!isLoading && !error && options.length === 0 ? (
            <AppText variant="muted" style={styles.optionMessage}>
              {emptyMessage}
            </AppText>
          ) : null}

          {!isLoading && !error && options.length > 0
            ? options.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => onSelect(option.value)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && styles.pressedOption
                  ]}
                >
                  <AppText variant="label">{option.label}</AppText>
                  {option.helper ? (
                    <AppText variant="caption">{option.helper}</AppText>
                  ) : null}
                </Pressable>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  trigger: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingRight: 40,
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceElevated
  },
  triggerOpen: {
    borderColor: theme.colors.primary,
    borderWidth: 2
  },
  triggerError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorMuted
  },
  disabledTrigger: {
    opacity: 0.5
  },
  pressedTrigger: {
    opacity: 0.85
  },
  chevron: {
    position: "absolute",
    right: 14,
    color: theme.colors.textMuted,
    fontSize: 10
  },
  placeholderText: {
    color: theme.colors.textMuted
  },
  optionsContainer: {
    gap: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 8,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.md
  },
  optionMessage: {
    padding: 10
  },
  optionRow: {
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated
  },
  pressedOption: {
    backgroundColor: theme.colors.primaryMuted
  },
  errorText: {
    color: theme.colors.error
  }
});
