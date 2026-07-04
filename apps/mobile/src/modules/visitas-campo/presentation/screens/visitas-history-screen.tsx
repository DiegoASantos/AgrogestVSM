import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { visitaPdfReportService, visitasCampoService } from "../../services";
import { visitaRecetaPdfReportService } from "../../../visita-recetas/services";
import type { RecentVisitaCampo, VisitaCampo } from "../../types";

type PdfAction = "diagnostico" | "receta";

export function VisitasHistoryScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [visitas, setVisitas] = useState<RecentVisitaCampo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePdfAction, setActivePdfAction] = useState<{
    visitaId: string;
    action: PdfAction;
  } | null>(null);
  const [filterSearchText, setFilterSearchText] = useState("");
  const [selectedProductorId, setSelectedProductorId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  const loadVisitas = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setFilterSearchText("");
    setSelectedProductorId(null);
    setIsFilterDropdownOpen(false);

    if (!session.accessToken) {
      setVisitas([]);
      setIsLoading(false);
      setError("Inicia sesion para consultar tu historial.");
      return;
    }

    try {
      setVisitas(visitasCampoService.getByAccessToken(session.accessToken));
    } catch (nextError) {
      setVisitas([]);
      setError(toApiError(nextError).message || "No se pudo cargar el historial.");
    } finally {
      setIsLoading(false);
    }
  }, [session.accessToken]);

  useFocusEffect(loadVisitas);

  const productorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of visitas) {
      if (v.productorId && v.productorName) {
        map.set(v.productorId, v.productorName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [visitas]);

  const filteredProductorOptions = useMemo(() => {
    const normalized = normalizeSearchText(filterSearchText);
    if (!normalized) return productorOptions.slice(0, 10);
    return productorOptions
      .filter((p) => normalizeSearchText(p.name).includes(normalized))
      .slice(0, 10);
  }, [productorOptions, filterSearchText]);

  const filteredVisitas = selectedProductorId
    ? visitas.filter((v) => v.productorId === selectedProductorId)
    : visitas;

  const selectedProductorName = selectedProductorId
    ? productorOptions.find((p) => p.id === selectedProductorId)?.name ?? null
    : null;

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow="Visitas de campo"
          title="Historial"
          subtitle="Consulta las visitas que registraste desde este dispositivo."
        />

        {!isLoading && !error && productorOptions.length > 0 ? (
          <View style={styles.filterContainer}>
            <View style={styles.filterInputRow}>
              <Ionicons
                color={theme.colors.textMuted}
                name="search-outline"
                size={18}
                style={styles.filterSearchIcon}
              />
              <TextInput
                accessibilityLabel="Buscar productor"
                autoCapitalize="none"
                autoCorrect={false}
                onBlur={() => {
                  setTimeout(() => setIsFilterDropdownOpen(false), 200);
                }}
                onChangeText={(text) => {
                  setFilterSearchText(text);
                  setIsFilterDropdownOpen(true);
                }}
                onFocus={() => setIsFilterDropdownOpen(true)}
                placeholder="Filtrar por productor..."
                placeholderTextColor={theme.colors.textMuted}
                style={styles.filterSearchInput}
                value={filterSearchText}
              />
              {selectedProductorId ? (
                <Pressable
                  accessibilityLabel="Limpiar filtro de productor"
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedProductorId(null);
                    setFilterSearchText("");
                  }}
                  style={({ pressed }) => [
                    styles.filterClearButton,
                    pressed && styles.pressedFilterButton
                  ]}
                >
                  <Ionicons color={theme.colors.textMuted} name="close-circle" size={20} />
                </Pressable>
              ) : null}
            </View>

            {isFilterDropdownOpen &&
            !selectedProductorId &&
            filteredProductorOptions.length > 0 ? (
              <View style={styles.filterDropdown}>
                {filteredProductorOptions.map((option) => (
                  <Pressable
                    accessibilityRole="button"
                    key={option.id}
                    onPress={() => {
                      setSelectedProductorId(option.id);
                      setFilterSearchText(option.name);
                      setIsFilterDropdownOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.filterOptionRow,
                      pressed && styles.filterOptionPressed
                    ]}
                  >
                    <AppText variant="label">{option.name}</AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {isFilterDropdownOpen &&
            !selectedProductorId &&
            filteredProductorOptions.length === 0 &&
            filterSearchText.length > 0 ? (
              <View style={styles.filterDropdown}>
                <AppText variant="muted" style={styles.filterNoResults}>
                  No hay coincidencias.
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {selectedProductorId && selectedProductorName ? (
          <View style={styles.filterActiveChip}>
            <Ionicons color={theme.colors.primary} name="person-outline" size={14} />
            <AppText style={styles.filterActiveChipText} variant="caption">
              {selectedProductorName}
            </AppText>
          </View>
        ) : null}

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando historial...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="No se pudo cargar el historial" subtitle={error} />
            <AppButton label="Reintentar" onPress={loadVisitas} />
          </AppCard>
        ) : null}

        {!isLoading && !error && filteredVisitas.length === 0 ? (
          <AppCard>
            <AppEmptyState
              title="Sin resultados"
              message={
                selectedProductorId
                  ? "No hay visitas registradas para este productor."
                  : "Todavia no registraste visitas."
              }
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && filteredVisitas.length > 0
          ? filteredVisitas.map((visita) => (
              <HistoryItem
                key={visita.id}
                onPress={() =>
                  router.push({
                    pathname: "/visitas-campo/[id]",
                    params: { id: visita.id }
                  })
                }
                onShareDiagnostico={() => {
                  void handlePdfAction(visita.id, "diagnostico");
                }}
                onShareReceta={() => {
                  void handlePdfAction(visita.id, "receta");
                }}
                pdfAction={
                  activePdfAction?.visitaId === visita.id ? activePdfAction.action : null
                }
                visita={visita}
              />
            ))
          : null}
      </ScrollView>
    </ScreenContainer>
  );
  async function handlePdfAction(visitaId: string, action: PdfAction) {
    if (activePdfAction) {
      return;
    }

    setActivePdfAction({ visitaId, action });

    try {
      if (action === "diagnostico") {
        await visitaPdfReportService.share(visitaId);
      } else {
        await visitaRecetaPdfReportService.share(visitaId);
      }
    } catch (nextError) {
      const apiError = toApiError(nextError);
      Alert.alert(
        "No se pudo compartir el PDF",
        apiError.message || "Intenta nuevamente."
      );
    } finally {
      setActivePdfAction(null);
    }
  }
}

function HistoryItem({
  onPress,
  onShareDiagnostico,
  onShareReceta,
  pdfAction,
  visita
}: {
  onPress: () => void;
  onShareDiagnostico: () => void;
  onShareReceta: () => void;
  pdfAction: PdfAction | null;
  visita: RecentVisitaCampo;
}) {
  return (
    <AppCard style={styles.visitCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.visitPressable, pressed && styles.pressed]}
      >
        <View style={styles.visitRow}>
          <View style={styles.iconWrap}>
            <Ionicons color="#08643f" name="clipboard-outline" size={23} />
          </View>
          <View style={styles.visitCopy}>
            <AppText variant="label">
              {visita.productorName && visita.parcelaName
                ? `${visita.productorName} - ${visita.parcelaName}`
                : visita.parcelaName
                  ? `Visita a ${visita.parcelaName}`
                  : "Visita de campo"}
            </AppText>
            <AppText style={styles.visitDate} variant="caption">
              {formatVisitDateTime(visita.visitDate, visita.startVisitTime)}
            </AppText>
          </View>
          <AppStatusBadge
            label={syncLabel(visita.syncStatus)}
            variant={syncVariant(visita.syncStatus)}
          />
          <Ionicons color="#064b31" name="chevron-forward" size={21} />
        </View>
      </Pressable>

      <View style={styles.pdfActions}>
        <View style={styles.pdfActionButton}>
          <AppButton
            icon="share-social-outline"
            label="Compartir diagnostico"
            loading={pdfAction === "diagnostico"}
            onPress={onShareDiagnostico}
            size="small"
            variant="secondary"
          />
        </View>
        <View style={styles.pdfActionButton}>
          <AppButton
            icon="receipt-outline"
            label="Compartir receta"
            loading={pdfAction === "receta"}
            onPress={onShareReceta}
            size="small"
            variant="outline"
          />
        </View>
      </View>
    </AppCard>
  );
}

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatVisitDateTime(visitDate: string, startVisitTime: string) {
  const date = new Date(`${visitDate}T${startVisitTime || "00:00:00"}`);

  if (Number.isNaN(date.getTime())) {
    return `${visitDate}, ${startVisitTime}`;
  }

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function syncLabel(status: VisitaCampo["syncStatus"]) {
  if (status === "synced") {
    return "Sincronizada";
  }

  if (status === "error") {
    return "Con error";
  }

  return "Pendiente";
}

function syncVariant(status: VisitaCampo["syncStatus"]) {
  if (status === "synced") {
    return "success" as const;
  }

  if (status === "error") {
    return "error" as const;
  }

  return "warning" as const;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18
  },
  filterContainer: {
    position: "relative",
    zIndex: 10
  },
  filterInputRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12
  },
  filterSearchIcon: {
    marginRight: 2
  },
  filterSearchInput: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    paddingVertical: 0
  },
  filterClearButton: {
    padding: 4
  },
  pressedFilterButton: {
    opacity: 0.7
  },
  filterDropdown: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    gap: 2,
    marginTop: 4,
    padding: 6,
    ...theme.shadow.md
  },
  filterOptionRow: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  filterOptionPressed: {
    backgroundColor: theme.colors.primaryMuted
  },
  filterNoResults: {
    padding: 8
  },
  filterActiveChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  filterActiveChipText: {
    color: theme.colors.primary,
    fontWeight: "600"
  },
  visitCard: {
    paddingHorizontal: 13,
    paddingVertical: 13
  },
  visitPressable: {
    borderRadius: theme.radius.md
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: theme.colors.primaryMuted
  },
  visitCopy: {
    minWidth: 0,
    flex: 1
  },
  visitDate: {
    marginTop: 2
  },
  pdfActions: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12
  },
  pdfActionButton: {
    flex: 1
  },
  pressed: {
    opacity: 0.8
  }
});
