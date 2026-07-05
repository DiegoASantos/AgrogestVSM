import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { downloadAllCatalogs } from "../../../../shared/database/seed-catalogs";
import { toApiError } from "../../../../shared/services";
import { scheduleSync } from "../../../../shared/sync";
import {
  ComplianceScoreCard,
  PreviousRecipeSummaryCard
} from "../../../visita-calificaciones/presentation/components";
import { visitaCalificacionesService } from "../../../visita-calificaciones/services";
import type { RecetaAnterior } from "../../../visita-calificaciones/types";
import { laboresCulturalesVisitaService } from "../../services";
import type { LaborCulturalCatalogItem } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

const STEP_NUMBER = 6;
const WIZARD_STEPS = [1, 2, 3, 4, 5, 6] as const;

type IoniconName = ComponentProps<typeof Ionicons>["name"];
type LaborGroup = {
  categoryCode: string;
  categoryName: string;
  items: LaborCulturalCatalogItem[];
};

export function VisitaLaboresCulturalesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [labores, setLabores] = useState<LaborCulturalCatalogItem[]>([]);
  const [selectedLaborIds, setSelectedLaborIds] = useState<Set<string>>(() => new Set());
  const [scoreValue, setScoreValue] = useState<number | null>(null);
  const [recetaAnterior, setRecetaAnterior] = useState<RecetaAnterior | null>(null);
  const [helpItem, setHelpItem] = useState<LaborCulturalCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const laborGroups = useMemo(() => groupLabores(labores), [labores]);
  const selectedCategoryCodes = useMemo(
    () =>
      new Set(
        labores
          .filter((labor) => selectedLaborIds.has(labor.id))
          .map((labor) => labor.categoryCode)
      ),
    [labores, selectedLaborIds]
  );
  const completedCategoriesCount = laborGroups.filter((group) =>
    selectedCategoryCodes.has(group.categoryCode)
  ).length;

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }

    void loadStep(visitaId);
  }, [visitaId]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={VISITA_HERO_IMAGE}
          style={styles.hero}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Volver"
                accessibilityRole="button"
                onPress={() => goBackToStep4()}
                style={styles.backIconButton}
              >
                <Ionicons color="#ffffff" name="arrow-back" size={24} />
              </Pressable>
              <AppText style={styles.topBarTitle} variant="heading">
                Registro de visita
              </AppText>
            </View>
          </SafeAreaView>

          <View style={styles.heroContent}>
            <AppText style={styles.heroTitle} variant="title">
              Condiciones de manejo
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Registra una opcion por cada categoria del paso 6.
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <WizardProgress />

          {isLoading ? (
            <AppCard>
              <AppText variant="muted">Cargando labores culturales...</AppText>
            </AppCard>
          ) : null}

          {!isLoading && error ? (
            <AppCard>
              <AppText variant="heading">No se pudo cargar el paso 6</AppText>
              <AppText variant="muted">{error}</AppText>
              <AppButton
                label="Reintentar"
                onPress={() => {
                  if (visitaId) {
                    void loadStep(visitaId);
                  }
                }}
              />
            </AppCard>
          ) : null}

          {!isLoading && !error && labores.length === 0 ? (
            <AppEmptyState
              title="Sin labores culturales"
              message="No hay labores culturales activas para registrar."
            />
          ) : null}

          {!isLoading && !error && labores.length > 0 ? (
            <View style={styles.selectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    color={theme.colors.primaryDark}
                    name="checkmark-done-outline"
                    size={22}
                  />
                </View>
                <View style={styles.sectionHeaderText}>
                  <AppText style={styles.sectionTitle} variant="heading">
                    Labores culturales
                  </AppText>
                  <AppText variant="muted">
                    Una respuesta por categoria. La leyenda queda visible para comparar.
                  </AppText>
                </View>
              </View>

              <SelectionProgressSummary
                completedCount={completedCategoriesCount}
                totalCount={laborGroups.length}
              />

              {laborGroups.map((group) => (
                <CategoryOptionGroup
                  group={group}
                  isComplete={selectedCategoryCodes.has(group.categoryCode)}
                  key={group.categoryCode}
                  onHelpPress={setHelpItem}
                  onSelect={toggleLabor}
                  selectedLaborIds={selectedLaborIds}
                />
              ))}

              <PreviousRecipeSummaryCard modulo="labores" receta={recetaAnterior} />
              {recetaAnterior?.existe ? (
                <ComplianceScoreCard
                  value={scoreValue}
                  onChange={(value) => {
                    setSubmitError(null);
                    setScoreValue(value);
                  }}
                />
              ) : null}

              {submitError ? (
                <View style={styles.errorBanner}>
                  <AppText style={styles.submitErrorText} variant="label">
                    {submitError}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={() => {
                    void handleSave();
                  }}
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed && !isSaving && styles.pressed,
                    isSaving && styles.disabledButton
                  ]}
                >
                  <Ionicons color="#d8f3dc" name="save-outline" size={20} />
                  <AppText style={styles.continueButtonText} variant="label">
                    {isSaving ? "Guardando..." : "Guardar"}
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={() => goBackToStep4()}
                  style={({ pressed }) => [
                    styles.backOutlineButton,
                    pressed && !isSaving && styles.pressed,
                    isSaving && styles.disabledButton
                  ]}
                >
                  <AppText style={styles.backOutlineButtonText} variant="label">
                    Volver
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <HelpModal item={helpItem} onClose={() => setHelpItem(null)} />
    </ScreenContainer>
  );

  async function loadStep(id: string) {
    setIsLoading(true);
    setError(null);
    setSubmitError(null);

    try {
      let nextLabores = await laboresCulturalesVisitaService.getLaboresCulturales();

      if (nextLabores.length === 0) {
        await downloadAllCatalogs();
        nextLabores = await laboresCulturalesVisitaService.getLaboresCulturales();
      }

      if (!hasStructuredLabors(nextLabores)) {
        await downloadAllCatalogs();
        nextLabores = await laboresCulturalesVisitaService.getLaboresCulturales();
      }

      if (!hasStructuredLabors(nextLabores)) {
        throw new Error(
          "El catalogo local del paso 6 esta desactualizado. Sincroniza catalogos para continuar."
        );
      }

      const existingLabores = await laboresCulturalesVisitaService.getByVisitaId(id);

      setLabores(nextLabores.filter((labor) => labor.isActive && labor.categoryCode));
      setSelectedLaborIds(new Set(existingLabores.map((labor) => labor.laborCulturalId)));
      setScoreValue(
        visitaCalificacionesService.getByModulo(id, "labores")?.puntaje ?? null
      );
      try {
        setRecetaAnterior(await visitaCalificacionesService.fetchRecetaAnteriorForVisit(id));
      } catch {
        setRecetaAnterior({ existe: false });
      }
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo cargar labores culturales.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleLabor(labor: LaborCulturalCatalogItem) {
    setSubmitError(null);
    setSelectedLaborIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);
      const sameCategoryIds = labores
        .filter((item) => item.categoryCode === labor.categoryCode)
        .map((item) => item.id);

      if (nextSelection.has(labor.id)) {
        return nextSelection;
      }

      for (const sameCategoryId of sameCategoryIds) {
        nextSelection.delete(sameCategoryId);
      }

      nextSelection.add(labor.id);

      return nextSelection;
    });
  }

  function goBackToStep4() {
    if (!visitaId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/visitas-campo/[id]/riego",
      params: { id: visitaId }
    });
  }

  async function handleSave() {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    const selectedIds = labores
      .filter((labor) => selectedLaborIds.has(labor.id))
      .map((labor) => labor.id);

    if (selectedCategoryCodes.size < laborGroups.length) {
      setSubmitError("Selecciona una opcion en cada categoria del paso 6.");
      return;
    }

    const shouldScore = recetaAnterior?.existe === true;

    if (shouldScore && scoreValue === null) {
      setSubmitError("Selecciona un puntaje de cumplimiento para labores.");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      await laboresCulturalesVisitaService.saveSelections(visitaId, selectedIds);
      if (shouldScore) {
        await visitaCalificacionesService.upsert(visitaId, {
          modulo: "labores",
          puntaje: scoreValue ?? 3,
          observacion: null
        });
      }
      void scheduleSync();
      router.replace({
        pathname: "/visitas-campo/[id]/receta",
        params: { id: visitaId }
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 6.");
    } finally {
      setIsSaving(false);
    }
  }
}

function SelectionProgressSummary({
  completedCount,
  totalCount
}: {
  completedCount: number;
  totalCount: number;
}) {
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.completionPanel}>
      <View style={styles.completionHeader}>
        <AppText style={styles.completionTitle} variant="label">
          Avance del paso 6
        </AppText>
        <AppText style={styles.completionCount} variant="label">
          {completedCount}/{totalCount}
        </AppText>
      </View>
      <View style={styles.completionTrack}>
        <View style={[styles.completionFill, { width: `${completionPercent}%` }]} />
      </View>
      <AppText style={styles.completionHint} variant="caption">
        Completa todas las categorias para guardar la visita.
      </AppText>
    </View>
  );
}

function CategoryOptionGroup({
  group,
  isComplete,
  onHelpPress,
  onSelect,
  selectedLaborIds
}: {
  group: LaborGroup;
  isComplete: boolean;
  onHelpPress: (item: LaborCulturalCatalogItem) => void;
  onSelect: (item: LaborCulturalCatalogItem) => void;
  selectedLaborIds: Set<string>;
}) {
  const selectedItem = group.items.find((item) => selectedLaborIds.has(item.id));

  return (
    <View style={styles.categoryBlock}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryHeading}>
          <View style={styles.categoryIcon}>
            <Ionicons
              color={theme.colors.primaryDark}
              name={getLaborIcon(group.categoryName)}
              size={24}
            />
          </View>
          <View style={styles.categoryCopy}>
            <AppText style={styles.categoryTitle} variant="heading">
              {group.categoryName}
            </AppText>
            <AppText style={styles.categorySubtitle} variant="caption">
              {selectedItem
                ? `Seleccionado: ${selectedItem.optionLabel ?? selectedItem.name}`
                : "Elige una opcion"}
            </AppText>
          </View>
        </View>
        <View
          style={[
            styles.categoryBadge,
            isComplete ? styles.categoryBadgeComplete : styles.categoryBadgePending
          ]}
        >
          <AppText
            style={[
              styles.categoryBadgeText,
              isComplete
                ? styles.categoryBadgeTextComplete
                : styles.categoryBadgeTextPending
            ]}
            variant="caption"
          >
            {isComplete ? "Completo" : "Pendiente"}
          </AppText>
        </View>
      </View>

      <View style={styles.optionList}>
        {group.items.map((labor) => (
          <LaborOptionRow
            isSelected={selectedLaborIds.has(labor.id)}
            item={labor}
            key={labor.id}
            onHelpPress={onHelpPress}
            onPress={() => onSelect(labor)}
          />
        ))}
      </View>
    </View>
  );
}

function LaborOptionRow({
  isSelected,
  item,
  onHelpPress,
  onPress
}: {
  isSelected: boolean;
  item: LaborCulturalCatalogItem;
  onHelpPress: (item: LaborCulturalCatalogItem) => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={item.name}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        isSelected && styles.optionRowSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
        {isSelected ? <View style={styles.radioInner} /> : null}
      </View>
      <View style={styles.optionCopy}>
        <View style={styles.optionTitleRow}>
          <AppText style={styles.optionTitle} variant="label">
            {item.optionLabel ?? item.name}
          </AppText>
          {isSelected ? (
            <Ionicons
              color={theme.colors.primaryDark}
              name="checkmark-circle"
              size={20}
            />
          ) : null}
        </View>
        {item.legend ? (
          <AppText style={styles.optionLegend} variant="caption">
            {item.legend}
          </AppText>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={`Ver descripcion de ${item.name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onHelpPress(item)}
        style={styles.optionHelpButton}
      >
        <Ionicons
          color={theme.colors.primaryDark}
          name="information-circle-outline"
          size={22}
        />
      </Pressable>
    </Pressable>
  );
}

function WizardProgress() {
  return (
    <View style={styles.progressCard}>
      <AppText style={styles.progressLabel} variant="label">
        Paso {STEP_NUMBER} de {WIZARD_STEPS.length}
      </AppText>
      <View style={styles.progressSteps}>
        {WIZARD_STEPS.map((step) => {
          const isActive = step === STEP_NUMBER;
          const isComplete = step < STEP_NUMBER;

          return (
            <View key={step} style={styles.progressStepItem}>
              <View
                style={[
                  styles.progressCircle,
                  isActive && styles.progressCircleActive,
                  isComplete && styles.progressCircleComplete
                ]}
              >
                {isComplete ? (
                  <Ionicons color="#ffffff" name="checkmark" size={15} />
                ) : (
                  <AppText
                    style={[
                      styles.progressCircleText,
                      isActive && styles.progressCircleTextActive
                    ]}
                    variant="caption"
                  >
                    {step}
                  </AppText>
                )}
              </View>
              {isActive ? <View style={styles.progressActiveBar} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function HelpModal({
  item,
  onClose
}: {
  item: LaborCulturalCatalogItem | null;
  onClose: () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.helpModalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              {item.optionLabel ?? item.name}
            </AppText>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons color={theme.colors.primaryDark} name="close" size={22} />
            </Pressable>
          </View>
          {item.categoryName ? (
            <AppText variant="label">{item.categoryName}</AppText>
          ) : null}
          <AppText variant="muted">
            {item.legend || item.description || "Sin leyenda registrada."}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

function hasStructuredLabors(items: LaborCulturalCatalogItem[]) {
  return items.some(
    (item) => item.isActive && item.categoryCode && item.categoryName && item.optionLabel
  );
}

function groupLabores(items: LaborCulturalCatalogItem[]): LaborGroup[] {
  const groups = new Map<string, LaborGroup>();

  for (const item of items) {
    if (!item.categoryCode || !item.categoryName) {
      continue;
    }

    const group = groups.get(item.categoryCode) ?? {
      categoryCode: item.categoryCode,
      categoryName: item.categoryName,
      items: []
    };

    group.items.push(item);
    groups.set(item.categoryCode, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (left, right) =>
          (left.sortOrder ?? 9999) - (right.sortOrder ?? 9999) ||
          (left.optionLabel ?? left.name).localeCompare(right.optionLabel ?? right.name)
      )
    }))
    .sort(
      (left, right) =>
        (left.items[0]?.sortOrder ?? 9999) - (right.items[0]?.sortOrder ?? 9999) ||
        left.categoryName.localeCompare(right.categoryName)
    );
}

function getLaborIcon(name: string): IoniconName {
  const normalizedName = normalizeCatalogName(name);

  if (normalizedName.includes("maleza")) return "cut-outline";
  if (normalizedName.includes("sanitario") || normalizedName.includes("suelo")) {
    return "shield-checkmark-outline";
  }
  if (normalizedName.includes("rama")) return "git-branch-outline";
  if (normalizedName.includes("quiebre") || normalizedName.includes("cargador")) {
    return "warning-outline";
  }
  if (normalizedName.includes("copa")) return "partly-sunny-outline";
  if (normalizedName.includes("carga")) return "scale-outline";
  if (normalizedName.includes("pala")) return "construct-outline";
  if (normalizedName.includes("motoguadana")) return "hardware-chip-outline";
  if (normalizedName.includes("horqueteo")) return "git-branch-outline";
  if (normalizedName.includes("enzunchado")) return "link-outline";
  if (normalizedName.includes("fruto")) return "basket-outline";
  if (normalizedName.includes("trampa")) return "archive-outline";
  if (normalizedName.includes("poda")) return "leaf-outline";

  return "leaf-outline";
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const styles = StyleSheet.create({
  actions: {
    gap: 10
  },
  backIconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  backOutlineButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50
  },
  backOutlineButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 17
  },
  body: {
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  categoryBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  categoryBadgeComplete: {
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.success
  },
  categoryBadgePending: {
    backgroundColor: theme.colors.warningMuted,
    borderColor: theme.colors.warning
  },
  categoryBadgeText: {
    fontSize: 12
  },
  categoryBadgeTextComplete: {
    color: theme.colors.primaryDark
  },
  categoryBadgeTextPending: {
    color: "#7a4d00"
  },
  categoryBlock: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  categoryCopy: {
    flex: 1,
    gap: 2
  },
  categoryHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  categoryHeading: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  categoryIcon: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: theme.radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  categorySubtitle: {
    color: theme.colors.textMuted,
    lineHeight: 18
  },
  categoryTitle: {
    color: theme.colors.primaryDark,
    fontSize: 17,
    lineHeight: 22
  },
  completionCount: {
    color: theme.colors.primaryDark,
    fontSize: 17
  },
  completionFill: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full,
    height: "100%"
  },
  completionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  completionHint: {
    color: theme.colors.textMuted,
    lineHeight: 18
  },
  completionPanel: {
    backgroundColor: "#f7fbf4",
    borderColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  completionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  completionTrack: {
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    height: 9,
    overflow: "hidden"
  },
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54
  },
  continueButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18
  },
  disabledButton: {
    opacity: 0.55
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: 12
  },
  helpModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 12,
    padding: 18,
    width: "88%"
  },
  hero: {
    minHeight: 320
  },
  heroContent: {
    gap: 10,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 34
  },
  heroImage: {
    opacity: 0.82
  },
  heroSubtitle: {
    color: "#173f2d",
    maxWidth: 320
  },
  heroTitle: {
    color: theme.colors.primaryDark,
    fontSize: 40,
    lineHeight: 45,
    maxWidth: 300
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8, 31, 20, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  modalCloseButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  modalTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 21
  },
  optionCopy: {
    flex: 1,
    gap: 4
  },
  optionHelpButton: {
    alignItems: "center",
    alignSelf: "stretch",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    width: 44
  },
  optionLegend: {
    color: theme.colors.textMuted,
    lineHeight: 18
  },
  optionList: {
    gap: 8
  },
  optionRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    padding: 12
  },
  optionRowSelected: {
    backgroundColor: "#fbfdf7",
    borderColor: theme.colors.primaryDark,
    borderWidth: 1.5
  },
  optionTitle: {
    color: "#0d1739",
    flex: 1,
    fontSize: 17,
    lineHeight: 22
  },
  optionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  pressed: {
    opacity: 0.72
  },
  radioInner: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full,
    height: 10,
    width: 10
  },
  radioOuter: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  radioOuterSelected: {
    borderColor: theme.colors.primaryDark
  },
  progressActiveBar: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: 5,
    marginTop: 8,
    width: 48
  },
  progressCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...theme.shadow.md
  },
  progressCircle: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  progressCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  progressCircleComplete: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primaryLight
  },
  progressCircleText: {
    color: theme.colors.textMuted,
    fontSize: 15
  },
  progressCircleTextActive: {
    color: theme.colors.textInverse
  },
  progressLabel: {
    color: theme.colors.primaryDark,
    fontSize: 17
  },
  progressStepItem: {
    alignItems: "center",
    minWidth: 38
  },
  progressSteps: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  scrollContent: {
    paddingBottom: 24
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  sectionHeaderText: {
    flex: 1,
    gap: 3
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: theme.radius.full,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  sectionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 21
  },
  selectionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 18,
    padding: 16,
    ...theme.shadow.sm
  },
  submitErrorText: {
    color: theme.colors.error
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  topBarTitle: {
    color: theme.colors.textInverse,
    fontSize: 22
  }
});
