import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
import { processOutbox } from "../../../../shared/sync";
import { laboresCulturalesVisitaService } from "../../services";
import type { LaborCulturalCatalogItem } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

const STEP_NUMBER = 5;
const WIZARD_STEPS = [1, 2, 3, 4, 5] as const;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export function VisitaLaboresCulturalesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const isCompactLayout = width < 460;

  const [labores, setLabores] = useState<LaborCulturalCatalogItem[]>([]);
  const [selectedLaborIds, setSelectedLaborIds] = useState<Set<string>>(() => new Set());
  const [helpItem, setHelpItem] = useState<LaborCulturalCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
              Labores culturales
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Selecciona las labores culturales realizadas durante la visita.
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
              <AppText variant="heading">No se pudo cargar el paso 5</AppText>
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
                    name="leaf-outline"
                    size={22}
                  />
                </View>
                <View style={styles.sectionHeaderText}>
                  <AppText style={styles.sectionTitle} variant="heading">
                    Selecciona labores culturales
                  </AppText>
                  <AppText variant="muted">
                    Puedes elegir una o mas opciones para guardar la visita.
                  </AppText>
                </View>
              </View>

              <View style={styles.optionGrid}>
                {labores.map((labor) => (
                  <CatalogOptionCard
                    iconName={getLaborIcon(labor.name)}
                    isCompactLayout={isCompactLayout}
                    isSelected={selectedLaborIds.has(labor.id)}
                    item={labor}
                    key={labor.id}
                    onHelpPress={setHelpItem}
                    onPress={() => toggleLabor(labor.id)}
                  />
                ))}
              </View>

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

      const existingLabores = await laboresCulturalesVisitaService.getByVisitaId(id);

      setLabores(nextLabores.filter((labor) => labor.isActive));
      setSelectedLaborIds(new Set(existingLabores.map((labor) => labor.laborCulturalId)));
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo cargar labores culturales.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleLabor(laborId: string) {
    setSubmitError(null);
    setSelectedLaborIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(laborId)) {
        nextSelection.delete(laborId);
      } else {
        nextSelection.add(laborId);
      }

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

    const selectedIds = Array.from(selectedLaborIds);

    if (selectedIds.length === 0) {
      setSubmitError("Selecciona al menos una labor cultural.");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      await laboresCulturalesVisitaService.saveSelections(visitaId, selectedIds);
      await processOutbox();
      router.replace("/visitas-campo/historial");
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 5.");
    } finally {
      setIsSaving(false);
    }
  }
}

function CatalogOptionCard({
  iconName,
  isCompactLayout,
  isSelected,
  item,
  onHelpPress,
  onPress
}: {
  iconName: IoniconName;
  isCompactLayout: boolean;
  isSelected: boolean;
  item: LaborCulturalCatalogItem;
  onHelpPress: (item: LaborCulturalCatalogItem) => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={item.name}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        isCompactLayout && styles.optionCardCompact,
        isSelected && styles.optionCardSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.iconTile}>
        <Ionicons color={theme.colors.primaryDark} name={iconName} size={38} />
      </View>
      <AppText style={styles.optionTitle} variant="label">
        {item.name}
      </AppText>
      <Pressable
        accessibilityLabel={`Ver descripcion de ${item.name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onHelpPress(item)}
        style={styles.helpButton}
      >
        <Ionicons color={theme.colors.primaryDark} name="help" size={22} />
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
              {item.name}
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
          <AppText variant="muted">
            {item.description || "Sin descripcion registrada."}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

function getLaborIcon(name: string): IoniconName {
  const normalizedName = normalizeCatalogName(name);

  if (normalizedName.includes("maleza")) return "cut-outline";
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
  helpButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 16,
    width: 40
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
  iconTile: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: 14,
    height: 70,
    justifyContent: "center",
    width: 70
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
  optionCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexBasis: "48%",
    gap: 14,
    justifyContent: "center",
    minHeight: 178,
    padding: 18,
    position: "relative"
  },
  optionCardCompact: {
    flexBasis: "100%"
  },
  optionCardSelected: {
    backgroundColor: "#fbfdf7",
    borderColor: theme.colors.primaryDark,
    borderWidth: 2
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  optionTitle: {
    color: "#0d1739",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.72
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
