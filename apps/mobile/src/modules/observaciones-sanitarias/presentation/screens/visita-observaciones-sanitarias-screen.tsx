import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { toApiError } from "../../../../shared/services";
import { visitasCampoService } from "../../../visitas-campo/services";
import { observacionesSanitariasService } from "../../services";
import type {
  IncidenceLevelCatalogItem,
  PestDiseaseByStageItem,
  VisitaObservacionSanitaria
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");
// TODO: Reemplazar esta imagen temporal por fotografias reales de cada plaga y enfermedad cuando el catalogo las defina.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TEMP_PEST_IMAGE = require("../../../../../assets/images/adaptive_icon_vsm.png");

type SanitarySelection = {
  incidenceLevelId: string | null;
  severityLevelId: string | null;
};

type StepNoteState = {
  observation: string;
  recommendation: string;
};

const STEP_NUMBER = 2;

const WIZARD_STEPS = [
  { index: 1, title: "Datos" },
  { index: 2, title: "Sanidad" },
  { index: 3, title: "Evaluaciones" },
  { index: 4, title: "Recom." },
  { index: 5, title: "Productos" }
] as const;

export function VisitaObservacionesSanitariasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [pestDiseases, setPestDiseases] = useState<PestDiseaseByStageItem[]>([]);
  const [incidenceLevels, setIncidenceLevels] = useState<
    IncidenceLevelCatalogItem[]
  >([]);
  const [observaciones, setObservaciones] = useState<
    VisitaObservacionSanitaria[]
  >([]);
  const [selections, setSelections] = useState<Record<string, SanitarySelection>>(
    {}
  );
  const [stepNote, setStepNote] = useState<StepNoteState>({
    observation: "",
    recommendation: ""
  });
  const [helpItem, setHelpItem] = useState<PestDiseaseByStageItem | null>(null);
  const [imagePreview, setImagePreview] = useState<PestDiseaseByStageItem | null>(
    null
  );
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

  const plagas = useMemo(
    () => pestDiseases.filter((item) => item.type === "plaga"),
    [pestDiseases]
  );

  const enfermedades = useMemo(
    () => pestDiseases.filter((item) => item.type === "enfermedad"),
    [pestDiseases]
  );

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
                onPress={() => router.back()}
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
              Plagas y enfermedades
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Evalua incidencia y severidad segun la etapa fenologica registrada.
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <WizardProgress />

          {isLoading ? (
            <AppCard>
              <AppText variant="muted">Cargando plagas y enfermedades...</AppText>
            </AppCard>
          ) : null}

          {!isLoading && error ? (
            <AppCard>
              <AppText variant="heading">No se pudo cargar el paso 2</AppText>
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

          {!isLoading && !error && pestDiseases.length === 0 ? (
            <AppEmptyState
              title="Sin plagas o enfermedades"
              message="No hay registros activos asociados a la etapa fenologica seleccionada."
            />
          ) : null}

          {!isLoading && !error && plagas.length > 0 ? (
            <SanitarySection
              icon="bug-outline"
              incidenceLevels={incidenceLevels}
              items={plagas}
              onHelpPress={setHelpItem}
              onImagePress={setImagePreview}
              onSelectLevel={handleSelectLevel}
              selections={selections}
              title="PLAGAS"
            />
          ) : null}

          {!isLoading && !error && enfermedades.length > 0 ? (
            <SanitarySection
              icon="leaf-outline"
              incidenceLevels={incidenceLevels}
              items={enfermedades}
              onHelpPress={setHelpItem}
              onImagePress={setImagePreview}
              onSelectLevel={handleSelectLevel}
              selections={selections}
              title="ENFERMEDADES"
            />
          ) : null}

          {!isLoading && !error ? (
            <View style={styles.noteCard}>
              <View style={styles.sectionHeader}>
                <AppText style={styles.sectionTitle} variant="heading">
                  Observacion y recomendacion
                </AppText>
                <AppText style={styles.sectionSubtitle} variant="caption">
                  Esta informacion pertenece solo al paso 2.
                </AppText>
              </View>

              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={(value) =>
                  setStepNote((current) => ({
                    ...current,
                    observation: value
                  }))
                }
                placeholder="Observacion del paso"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.noteInput}
                textAlignVertical="top"
                value={stepNote.observation}
              />

              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={(value) =>
                  setStepNote((current) => ({
                    ...current,
                    recommendation: value
                  }))
                }
                placeholder="Recomendacion del paso"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.noteInput}
                textAlignVertical="top"
                value={stepNote.recommendation}
              />
            </View>
          ) : null}

          {submitError ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.submitErrorText} variant="label">
                {submitError}
              </AppText>
            </View>
          ) : null}

          {!isLoading && !error ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => {
                  void handleContinue();
                }}
                style={({ pressed }) => [
                  styles.continueButton,
                  pressed && !isSaving && styles.pressed,
                  isSaving && styles.disabledButton
                ]}
              >
                <Ionicons color="#d8f3dc" name="leaf" size={20} />
                <AppText style={styles.continueButtonText} variant="label">
                  {isSaving ? "Guardando..." : "Continuar"}
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => router.back()}
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
          ) : null}
        </View>
      </ScrollView>

      <HelpModal
        incidenceLevels={incidenceLevels}
        item={helpItem}
        onClose={() => setHelpItem(null)}
      />
      <ImagePreviewModal
        item={imagePreview}
        onClose={() => setImagePreview(null)}
      />
    </ScreenContainer>
  );

  async function loadStep(id: string) {
    setIsLoading(true);
    setError(null);
    setSubmitError(null);

    try {
      const visita = await visitasCampoService.getById(id);

      if (!visita.phenologicalStageId) {
        setPestDiseases([]);
        setError("La visita no tiene etapa fenologica seleccionada.");
        return;
      }

      const [
        nextPestDiseases,
        nextIncidenceLevels,
        nextObservaciones,
        nextStepNote
      ] = await Promise.all([
        observacionesSanitariasService.getPestDiseasesByPhenologicalStage(
          visita.phenologicalStageId
        ),
        observacionesSanitariasService.getIncidenceLevels(),
        observacionesSanitariasService.getByVisitaId(id),
        observacionesSanitariasService.getStepNote(id, STEP_NUMBER)
      ]);

      setPestDiseases(nextPestDiseases);
      setIncidenceLevels(nextIncidenceLevels);
      setObservaciones(nextObservaciones);
      setSelections(buildSelectionMap(nextObservaciones));
      setStepNote({
        observation: nextStepNote?.observation ?? "",
        recommendation: nextStepNote?.recommendation ?? ""
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo cargar el paso 2.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectLevel(
    pestDiseaseId: string,
    type: IncidenceLevelCatalogItem["type"],
    levelId: string
  ) {
    setSubmitError(null);
    setSelections((currentSelections) => {
      const currentSelection = currentSelections[pestDiseaseId] ?? {
        incidenceLevelId: null,
        severityLevelId: null
      };
      const nextSelection =
        type === "incidencia"
          ? {
              ...currentSelection,
              incidenceLevelId:
                currentSelection.incidenceLevelId === levelId ? null : levelId
            }
          : {
              ...currentSelection,
              severityLevelId:
                currentSelection.severityLevelId === levelId ? null : levelId
            };

      return {
        ...currentSelections,
        [pestDiseaseId]: nextSelection
      };
    });
  }

  async function handleContinue() {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    const validationMessage = validateSelections(
      selections,
      pestDiseases,
      incidenceLevels
    );

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      const selectedEntries = Object.entries(selections).filter(([, selection]) =>
        Boolean(selection.incidenceLevelId || selection.severityLevelId)
      );

      for (const [pestDiseaseId, selection] of selectedEntries) {
        const existingObservacion = observaciones.find(
          (observacion) => observacion.pestDiseaseId === pestDiseaseId
        );
        const payload = {
          pestDiseaseId,
          incidenceLevelId: selection.incidenceLevelId,
          severityLevelId: selection.severityLevelId
        };

        if (existingObservacion) {
          await observacionesSanitariasService.update(
            existingObservacion.id,
            payload
          );
        } else {
          await observacionesSanitariasService.create(visitaId, payload);
        }
      }

      if (stepNote.observation.trim() || stepNote.recommendation.trim()) {
        await observacionesSanitariasService.upsertStepNote(
          visitaId,
          STEP_NUMBER,
          {
            observation: stepNote.observation.trim() || null,
            recommendation: stepNote.recommendation.trim() || null
          }
        );
      }

      router.replace({
        pathname: "/visitas-campo/[id]/evaluaciones",
        params: { id: visitaId }
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 2.");
    } finally {
      setIsSaving(false);
    }
  }
}

type SanitarySectionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  incidenceLevels: IncidenceLevelCatalogItem[];
  items: PestDiseaseByStageItem[];
  onHelpPress: (item: PestDiseaseByStageItem) => void;
  onImagePress: (item: PestDiseaseByStageItem) => void;
  onSelectLevel: (
    pestDiseaseId: string,
    type: IncidenceLevelCatalogItem["type"],
    levelId: string
  ) => void;
  selections: Record<string, SanitarySelection>;
  title: string;
};

function SanitarySection({
  icon,
  incidenceLevels,
  items,
  onHelpPress,
  onImagePress,
  onSelectLevel,
  selections,
  title
}: SanitarySectionProps) {
  return (
    <View style={styles.sectionGroup}>
      <View style={styles.groupTitleRow}>
        <View style={styles.groupIcon}>
          <Ionicons color={theme.colors.primaryDark} name={icon} size={19} />
        </View>
        <AppText style={styles.groupTitle} variant="heading">
          {title}
        </AppText>
      </View>

      {items.map((item) => (
        <SanitaryCard
          incidenceLevels={incidenceLevels}
          item={item}
          key={item.id}
          onHelpPress={onHelpPress}
          onImagePress={onImagePress}
          onSelectLevel={onSelectLevel}
          selection={selections[item.id]}
        />
      ))}
    </View>
  );
}

type SanitaryCardProps = {
  incidenceLevels: IncidenceLevelCatalogItem[];
  item: PestDiseaseByStageItem;
  onHelpPress: (item: PestDiseaseByStageItem) => void;
  onImagePress: (item: PestDiseaseByStageItem) => void;
  onSelectLevel: (
    pestDiseaseId: string,
    type: IncidenceLevelCatalogItem["type"],
    levelId: string
  ) => void;
  selection?: SanitarySelection;
};

function SanitaryCard({
  incidenceLevels,
  item,
  onHelpPress,
  onImagePress,
  onSelectLevel,
  selection
}: SanitaryCardProps) {
  const incidenceOptions = getLevelOptionsForItem(
    item,
    incidenceLevels,
    "incidencia"
  );
  const severityOptions = getLevelOptionsForItem(
    item,
    incidenceLevels,
    "severidad"
  );

  return (
    <View style={styles.sanitaryCard}>
      <Pressable
        accessibilityLabel={`Ver imagen de ${item.name}`}
        accessibilityRole="imagebutton"
        onPress={() => onImagePress(item)}
      >
        <Image resizeMode="cover" source={TEMP_PEST_IMAGE} style={styles.pestImage} />
      </Pressable>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleColumn}>
            <AppText style={styles.pestName} variant="label">
              {formatPestName(item)}
            </AppText>
          </View>

          <Pressable
            accessibilityLabel={`Ver guia de ${item.name}`}
            accessibilityRole="button"
            onPress={() => onHelpPress(item)}
            style={styles.helpButton}
          >
            <Ionicons
              color={theme.colors.primaryDark}
              name="help"
              size={16}
            />
          </Pressable>
        </View>

        <LevelSelectorRow
          label="Incidencia"
          levels={incidenceOptions}
          onSelect={(levelId) => onSelectLevel(item.id, "incidencia", levelId)}
          selectedLevelId={selection?.incidenceLevelId ?? null}
        />
        <LevelSelectorRow
          label="Severidad"
          levels={severityOptions}
          onSelect={(levelId) => onSelectLevel(item.id, "severidad", levelId)}
          selectedLevelId={selection?.severityLevelId ?? null}
        />
      </View>
    </View>
  );
}

type LevelSelectorRowProps = {
  label: string;
  levels: IncidenceLevelCatalogItem[];
  onSelect: (levelId: string) => void;
  selectedLevelId: string | null;
};

function LevelSelectorRow({
  label,
  levels,
  onSelect,
  selectedLevelId
}: LevelSelectorRowProps) {
  return (
    <View style={styles.levelRow}>
      <AppText style={styles.levelLabel} variant="caption">
        {label}
      </AppText>
      <View style={styles.levelButtons}>
        {levels.length > 0 ? (
          levels.map((level) => {
            const selected = level.id === selectedLevelId;
            return (
              <Pressable
                accessibilityLabel={`${label} grado ${level.sortOrder}`}
                accessibilityRole="button"
                key={level.id}
                onPress={() => onSelect(level.id)}
                style={[
                  styles.levelButton,
                  selected
                    ? {
                        backgroundColor: getLevelColor(level.sortOrder),
                        borderColor: getLevelColor(level.sortOrder)
                      }
                    : styles.levelButtonInactive
                ]}
              >
                <AppText
                  style={[
                    styles.levelButtonText,
                    selected
                      ? styles.levelButtonTextSelected
                      : styles.levelButtonTextInactive
                  ]}
                  variant="label"
                >
                  {level.sortOrder}
                </AppText>
              </Pressable>
            );
          })
        ) : (
          <AppText style={styles.noLevelsText} variant="caption">
            Sin niveles
          </AppText>
        )}
      </View>
    </View>
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
          const isActive = step.index === STEP_NUMBER;
          const isComplete = step.index < STEP_NUMBER;

          return (
            <View key={step.index} style={styles.progressStepItem}>
              <View
                style={[
                  styles.progressCircle,
                  isActive && styles.progressCircleActive,
                  isComplete && styles.progressCircleComplete
                ]}
              >
                <AppText
                  style={[
                    styles.progressCircleText,
                    (isActive || isComplete) && styles.progressCircleTextActive
                  ]}
                  variant="caption"
                >
                  {isComplete ? "✓" : step.index}
                </AppText>
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
  incidenceLevels,
  item,
  onClose
}: {
  incidenceLevels: IncidenceLevelCatalogItem[];
  item: PestDiseaseByStageItem | null;
  onClose: () => void;
}) {
  const levelLookup = useMemo(
    () => Object.fromEntries(incidenceLevels.map((level) => [level.id, level])),
    [incidenceLevels]
  );

  if (!item) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.helpModalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              {formatPestName(item)}
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

          <ScrollView style={styles.helpList}>
            {item.stageLevels.map((relation) => {
              const level = levelLookup[relation.nivelIncidenciaSeveridadId];

              return (
                <View key={relation.id} style={styles.helpItem}>
                  <AppText style={styles.helpItemTitle} variant="label">
                    {level
                      ? `${formatLevelType(level.type)} ${level.sortOrder} - ${level.name}`
                      : `Nivel ${relation.nivelIncidenciaSeveridadId}`}
                  </AppText>
                  <AppText variant="muted">
                    {relation.description || "Sin descripcion registrada."}
                  </AppText>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ImagePreviewModal({
  item,
  onClose
}: {
  item: PestDiseaseByStageItem | null;
  onClose: () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.imageModalContent}>
          <Pressable
            accessibilityLabel="Cerrar imagen"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.modalCloseButton}
          >
            <Ionicons color={theme.colors.primaryDark} name="close" size={22} />
          </Pressable>
          <Image resizeMode="contain" source={TEMP_PEST_IMAGE} style={styles.previewImage} />
          <AppText style={styles.previewTitle} variant="heading">
            {formatPestName(item)}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

function getLevelOptionsForItem(
  item: PestDiseaseByStageItem,
  incidenceLevels: IncidenceLevelCatalogItem[],
  type: IncidenceLevelCatalogItem["type"]
) {
  const levelIds = new Set(
    item.stageLevels.map((relation) => relation.nivelIncidenciaSeveridadId)
  );

  return incidenceLevels
    .filter((level) => level.type === type && levelIds.has(level.id))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function validateSelections(
  selections: Record<string, SanitarySelection>,
  pestDiseases: PestDiseaseByStageItem[],
  incidenceLevels: IncidenceLevelCatalogItem[]
) {
  for (const pestDisease of pestDiseases) {
    const selection = selections[pestDisease.id];

    if (!selection?.incidenceLevelId && !selection?.severityLevelId) {
      continue;
    }

    const incidenceOptions = getLevelOptionsForItem(
      pestDisease,
      incidenceLevels,
      "incidencia"
    );
    const severityOptions = getLevelOptionsForItem(
      pestDisease,
      incidenceLevels,
      "severidad"
    );

    if (incidenceOptions.length > 0 && !selection.incidenceLevelId) {
      return `Selecciona incidencia para ${pestDisease.name}.`;
    }

    if (severityOptions.length > 0 && !selection.severityLevelId) {
      return `Selecciona severidad para ${pestDisease.name}.`;
    }
  }

  return null;
}

function buildSelectionMap(observaciones: VisitaObservacionSanitaria[]) {
  return Object.fromEntries(
    observaciones.map((observacion) => [
      observacion.pestDiseaseId,
      {
        incidenceLevelId: observacion.incidenceLevelId,
        severityLevelId: observacion.severityLevelId
      }
    ])
  );
}

function formatPestName(item: PestDiseaseByStageItem) {
  return item.scientificName
    ? `${item.name} (${item.scientificName})`
    : item.name;
}

function formatLevelType(type: IncidenceLevelCatalogItem["type"]) {
  return type === "incidencia" ? "Incidencia" : "Severidad";
}

function getLevelColor(sortOrder: number) {
  if (sortOrder <= 0) {
    return "#007f4f";
  }

  if (sortOrder === 1) {
    return "#7fbf20";
  }

  if (sortOrder === 2) {
    return "#ffad0a";
  }

  return "#ef3b2d";
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
  cardContent: {
    flex: 1,
    gap: 8
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardTitleColumn: {
    flex: 1
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
  groupIcon: {
    alignItems: "center",
    backgroundColor: "#f3faf5",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  groupTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18
  },
  groupTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  helpButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  helpItem: {
    borderBottomColor: theme.colors.borderLight,
    borderBottomWidth: 1,
    gap: 5,
    paddingVertical: 12
  },
  helpItemTitle: {
    color: theme.colors.primaryDark
  },
  helpList: {
    maxHeight: 420
  },
  helpModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    maxHeight: "82%",
    padding: 18,
    width: "90%"
  },
  hero: {
    minHeight: 300
  },
  heroContent: {
    gap: 10,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 40
  },
  heroImage: {
    opacity: 0.82
  },
  heroSubtitle: {
    color: "#173f2d",
    maxWidth: 310
  },
  heroTitle: {
    color: theme.colors.primaryDark,
    fontSize: 38,
    lineHeight: 44,
    maxWidth: 300
  },
  imageModalContent: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    width: "86%"
  },
  levelButton: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
    minWidth: 46
  },
  levelButtonInactive: {
    backgroundColor: "#eef1ef",
    borderColor: theme.colors.border
  },
  levelButtonText: {
    fontSize: 16
  },
  levelButtonTextInactive: {
    color: theme.colors.textMuted
  },
  levelButtonTextSelected: {
    color: theme.colors.textInverse
  },
  levelButtons: {
    flex: 1,
    flexDirection: "row",
    gap: 7
  },
  levelLabel: {
    color: theme.colors.text,
    fontSize: 14,
    width: 78
  },
  levelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
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
    alignSelf: "flex-end",
    height: 34,
    justifyContent: "center",
    width: 34
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modalTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 20
  },
  noLevelsText: {
    color: theme.colors.textMuted
  },
  noteCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    ...theme.shadow.sm
  },
  noteInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 92,
    padding: 12
  },
  pestImage: {
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 82,
    width: 82
  },
  pestName: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22
  },
  pressed: {
    opacity: 0.72
  },
  previewImage: {
    height: 260,
    width: "100%"
  },
  previewTitle: {
    color: theme.colors.primaryDark,
    marginTop: 12,
    textAlign: "center"
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
  sanitaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    ...theme.shadow.sm
  },
  scrollContent: {
    paddingBottom: 24
  },
  sectionGroup: {
    gap: 10
  },
  sectionHeader: {
    gap: 3
  },
  sectionSubtitle: {
    color: theme.colors.textMuted
  },
  sectionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18
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
