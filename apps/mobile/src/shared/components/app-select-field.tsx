import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

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
  icon?: keyof typeof Ionicons.glyphMap;
  searchable?: boolean;
  searchPlaceholder?: string;
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
  icon,
  searchable = false,
  searchPlaceholder = "Buscar",
  onToggle,
  onSelect
}: AppSelectFieldProps) {
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchText("");
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = normalizeSearchableText(searchText);

    if (!searchable || !normalizedSearch) {
      return options;
    }

    return options.filter((option) => {
      const searchableText = normalizeSearchableText(
        `${option.label} ${option.helper ?? ""}`
      );

      return searchableText.includes(normalizedSearch);
    });
  }, [options, searchText, searchable]);

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
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons color={theme.colors.primary} name={icon} size={22} />
          </View>
        ) : null}
        <AppText
          style={[
            styles.triggerText,
            !selectedLabel ? styles.placeholderText : undefined
          ]}
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
          {searchable && !isLoading && !error && options.length > 0 ? (
            <TextInput
              accessibilityLabel={`Buscar ${label.toLowerCase()}`}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSearchText}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              value={searchText}
            />
          ) : null}

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

          {!isLoading && !error && options.length > 0 && filteredOptions.length === 0 ? (
            <AppText variant="muted" style={styles.optionMessage}>
              No hay coincidencias para la busqueda.
            </AppText>
          ) : null}

          {!isLoading && !error && filteredOptions.length > 0
            ? filteredOptions.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => {
                    setSearchText("");
                    onSelect(option.value);
                  }}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.colors.primaryMuted
  },
  triggerText: {
    flex: 1
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
  searchInput: {
    minHeight: 44,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceElevated
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

function normalizeSearchableText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
