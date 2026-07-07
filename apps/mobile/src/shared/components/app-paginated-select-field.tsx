import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";

import { theme } from "../constants/theme";
import { AppText } from "./app-text";

export type AppPaginatedSelectOption = {
  value: string;
  label: string;
  helper?: string;
};

type LoadOptionsResult = {
  options: AppPaginatedSelectOption[];
  total: number;
};

type AppPaginatedSelectFieldProps = {
  label: string;
  placeholder: string;
  selectedLabel?: string;
  isOpen: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  error?: string | null;
  emptyMessage?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  searchPlaceholder?: string;
  pageSize?: number;
  onToggle: () => void;
  onClose?: () => void;
  onSelect: (option: AppPaginatedSelectOption) => void;
  onSearch: (query: string, page: number, pageSize: number) => Promise<LoadOptionsResult>;
};

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function AppPaginatedSelectField({
  label,
  placeholder,
  selectedLabel,
  isOpen,
  isLoading = false,
  disabled = false,
  error,
  emptyMessage = "No hay opciones disponibles.",
  icon,
  searchPlaceholder = "Buscar",
  pageSize = DEFAULT_PAGE_SIZE,
  onToggle,
  onClose,
  onSelect,
  onSearch
}: AppPaginatedSelectFieldProps) {
  const [searchText, setSearchText] = useState("");
  const [options, setOptions] = useState<AppPaginatedSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasMore = options.length < total;

  const resetState = useCallback(() => {
    setSearchText("");
    setOptions([]);
    setPage(1);
    setTotal(0);
    setLoadError(null);
    setIsSearching(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const loadPage = useCallback(
    async (nextPage: number, query: string, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsSearching(true);
      }

      setLoadError(null);

      try {
        const result = await onSearch(query, nextPage, pageSize);

        setOptions((currentOptions) =>
          append ? [...currentOptions, ...result.options] : result.options
        );
        setTotal(result.total);
        setPage(nextPage);
      } catch {
        setLoadError("No se pudieron cargar las opciones.");
      } finally {
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    },
    [onSearch, pageSize]
  );

  useEffect(() => {
    if (!isOpen || isLoading || error) {
      return;
    }

    const handle = setTimeout(() => {
      void loadPage(1, searchText, false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [error, isLoading, isOpen, loadPage, searchText]);

  const showInitialLoading = isLoading || (isSearching && options.length === 0);
  const showEmpty =
    !showInitialLoading && !loadError && options.length === 0 && total === 0;
  const listData = useMemo(() => options, [options]);

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
          {!isLoading && !error ? (
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

          {showInitialLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} />
              <AppText variant="muted">Cargando opciones...</AppText>
            </View>
          ) : null}

          {loadError ? (
            <AppText variant="muted" style={styles.optionMessage}>
              {loadError}
            </AppText>
          ) : null}

          {showEmpty ? (
            <AppText variant="muted" style={styles.optionMessage}>
              {searchText.trim() ? "No hay coincidencias para la busqueda." : emptyMessage}
            </AppText>
          ) : null}

          {!showInitialLoading && !loadError && options.length > 0 ? (
            <FlatList
              data={listData}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              maxToRenderPerBatch={10}
              nestedScrollEnabled
              onEndReached={() => {
                if (!hasMore || isLoadingMore || isSearching) {
                  return;
                }

                void loadPage(page + 1, searchText, true);
              }}
              onEndReachedThreshold={0.35}
              removeClippedSubviews
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    resetState();
                    onSelect(item);
                    onClose?.();
                  }}
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && styles.pressedOption
                  ]}
                >
                  <AppText variant="label">{item.label}</AppText>
                  {item.helper ? (
                    <AppText variant="caption">{item.helper}</AppText>
                  ) : null}
                </Pressable>
              )}
              ListFooterComponent={
                isLoadingMore ? (
                  <View style={styles.loadingMoreRow}>
                    <ActivityIndicator color={theme.colors.primary} size="small" />
                    <AppText variant="caption">Cargando mas...</AppText>
                  </View>
                ) : null
              }
              style={styles.optionsList}
              windowSize={5}
            />
          ) : null}
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
  optionsList: {
    maxHeight: 280
  },
  optionMessage: {
    padding: 10
  },
  loadingRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10
  },
  loadingMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10
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
