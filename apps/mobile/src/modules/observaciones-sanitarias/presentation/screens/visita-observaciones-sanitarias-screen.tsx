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
  type ImageSourcePropType,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

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
import { visitasCampoService } from "../../../visitas-campo/services";
import { observacionesSanitariasService } from "../../services";
import type {
  IncidenceLevelCatalogItem,
  OrganoAfectado,
  PestDiseaseByStageItem,
  VisitaObservacionSanitaria
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEFAULT_PEST_DISEASE_IMAGE = require("../../../../../assets/images/adaptive_icon_vsm.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHINCHE_IMAGE = require("../../../../../assets/images/chinches.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const COCHINILLA_IMAGE = require("../../../../../assets/images/Cochinillas.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ACAROS_IMAGE = require("../../../../../assets/images/Acaros.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MOSCA_FRUTA_IMAGE = require("../../../../../assets/images/mosca_fruta.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QUERESAS_IMAGE = require("../../../../../assets/images/Queresas.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TRIPS_IMAGE = require("../../../../../assets/images/trips.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ALTERNARIA_IMAGE = require("../../../../../assets/images/alternaria.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ANTRACNOSIS_IMAGE = require("../../../../../assets/images/Antracnosis.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MUERTE_REGRESIVA_IMAGE = require("../../../../../assets/images/muerte_regresiva.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OIDIUM_IMAGE = require("../../../../../assets/images/Oidiun.webp");

const PEST_DISEASE_IMAGES: Array<{
  patterns: string[];
  source: ImageSourcePropType;
}> = [
  { patterns: ["chinche", "chinches"], source: CHINCHE_IMAGE },
  { patterns: ["cochinilla", "cochinillas"], source: COCHINILLA_IMAGE },
  { patterns: ["acaro", "acaros"], source: ACAROS_IMAGE },
  { patterns: ["mosca de la fruta", "mosca fruta"], source: MOSCA_FRUTA_IMAGE },
  { patterns: ["queresa", "queresas"], source: QUERESAS_IMAGE },
  { patterns: ["trips"], source: TRIPS_IMAGE },
  { patterns: ["alternaria"], source: ALTERNARIA_IMAGE },
  { patterns: ["antracnosis"], source: ANTRACNOSIS_IMAGE },
  { patterns: ["muerte regresiva"], source: MUERTE_REGRESIVA_IMAGE },
  { patterns: ["oidium", "oidio", "oidiun"], source: OIDIUM_IMAGE }
];

type SanitarySelection = {
  incidenceLevelId: string | null;
  severityLevelId: string | null;
  organosAfectados: OrganoAfectado[];
};

type StepNoteState = {
  observation: string;
  recommendation: string;
};

const STEP_NUMBER = 2;

const WIZARD_STEPS = [
  { index: 1, title: "Datos" },
  { index: 2, title: "Sanidad" },
  { index: 3, title: "Nutricion" },
  { index: 4, title: "Riego" },
  { index: 5, title: "Labores" }
] as const;

const ORGANO_OPTIONS: Array<{
  value: OrganoAfectado;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "hoja", label: "Hoja", icon: "leaf-outline" },
  { value: "tallo", label: "Tallo", icon: "git-branch-outline" },
  { value: "flores", label: "Flores", icon: "flower-outline" },
  { value: "fruto", label: "Fruto", icon: "nutrition-outline" }
];

export function VisitaObservacionesSanitariasScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const isCompactLayout = width < 460;

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
                onPress={() => goBackToStep1()}
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
              isCompactLayout={isCompactLayout}
              items={plagas}
              onImagePress={setImagePreview}
              onSelectLevel={handleSelectLevel}
              onToggleOrgano={handleToggleOrgano}
              selections={selections}
              title="PLAGAS"
            />
          ) : null}

          {!isLoading && !error && enfermedades.length > 0 ? (
            <SanitarySection
              icon="leaf-outline"
              incidenceLevels={incidenceLevels}
              isCompactLayout={isCompactLayout}
              items={enfermedades}
              onImagePress={setImagePreview}
              onSelectLevel={handleSelectLevel}
              onToggleOrgano={handleToggleOrgano}
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
                onPress={() => goBackToStep1()}
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

      let resolvedPestDiseases = nextPestDiseases;

      if (resolvedPestDiseases.length === 0) {
        try {
          await downloadAllCatalogs();
          resolvedPestDiseases =
            await observacionesSanitariasService.getPestDiseasesByPhenologicalStage(
              visita.phenologicalStageId
            );
        } catch {
          // Conservamos el resultado local si la recarga falla.
        }
      }

      setPestDiseases(resolvedPestDiseases);
      setIncidenceLevels(nextIncidenceLevels.map(normalizeIncidenceLevel));
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

  function goBackToStep1() {
    if (!visitaId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/visitas-campo/registrar",
      params: { visitaId }
    });
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
        severityLevelId: null,
        organosAfectados: []
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

  function handleToggleOrgano(pestDiseaseId: string, organo: OrganoAfectado) {
    setSubmitError(null);
    setSelections((currentSelections) => {
      const currentSelection = currentSelections[pestDiseaseId] ?? {
        incidenceLevelId: null,
        severityLevelId: null,
        organosAfectados: []
      };
      const selectedOrganos = new Set(currentSelection.organosAfectados);

      if (selectedOrganos.has(organo)) {
        selectedOrganos.delete(organo);
      } else {
        selectedOrganos.add(organo);
      }

      return {
        ...currentSelections,
        [pestDiseaseId]: {
          ...currentSelection,
          organosAfectados: Array.from(selectedOrganos)
        }
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
        Boolean(
          selection.incidenceLevelId ||
            selection.severityLevelId ||
            selection.organosAfectados.length > 0
        )
      );

      for (const [pestDiseaseId, selection] of selectedEntries) {
        const existingObservacion = observaciones.find(
          (observacion) => observacion.pestDiseaseId === pestDiseaseId
        );
        const payload = {
          pestDiseaseId,
          incidenceLevelId: selection.incidenceLevelId,
          severityLevelId: selection.severityLevelId,
          organosAfectados: selection.organosAfectados
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
        pathname: "/visitas-campo/[id]/nutricion",
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
  isCompactLayout: boolean;
  items: PestDiseaseByStageItem[];
  onImagePress: (item: PestDiseaseByStageItem) => void;
  onSelectLevel: (
    pestDiseaseId: string,
    type: IncidenceLevelCatalogItem["type"],
    levelId: string
  ) => void;
  onToggleOrgano: (pestDiseaseId: string, organo: OrganoAfectado) => void;
  selections: Record<string, SanitarySelection>;
  title: string;
};

function SanitarySection({
  icon,
  incidenceLevels,
  isCompactLayout,
  items,
  onImagePress,
  onSelectLevel,
  onToggleOrgano,
  selections,
  title
}: SanitarySectionProps) {
  return (
    <View style={styles.sectionGroup}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleRow}>
          <View style={styles.groupIcon}>
            <Ionicons color={theme.colors.primaryDark} name={icon} size={19} />
          </View>
          <AppText style={styles.groupTitle} variant="heading">
            {title}
          </AppText>
        </View>
        <AppText style={styles.groupSubtitle} variant="caption">
          Selecciona incidencia, severidad y organos afectados.
        </AppText>
      </View>

      {items.map((item) => (
        <SanitaryCard
          incidenceLevels={incidenceLevels}
          isCompactLayout={isCompactLayout}
          item={item}
          key={item.id}
          onImagePress={onImagePress}
          onSelectLevel={onSelectLevel}
          onToggleOrgano={onToggleOrgano}
          selection={selections[item.id]}
        />
      ))}
    </View>
  );
}

type SanitaryCardProps = {
  incidenceLevels: IncidenceLevelCatalogItem[];
  isCompactLayout: boolean;
  item: PestDiseaseByStageItem;
  onImagePress: (item: PestDiseaseByStageItem) => void;
  onSelectLevel: (
    pestDiseaseId: string,
    type: IncidenceLevelCatalogItem["type"],
    levelId: string
  ) => void;
  onToggleOrgano: (pestDiseaseId: string, organo: OrganoAfectado) => void;
  selection?: SanitarySelection;
};

function SanitaryCard({
  incidenceLevels,
  isCompactLayout,
  item,
  onImagePress,
  onSelectLevel,
  onToggleOrgano,
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
  const imageSource = getPestDiseaseImageSource(item);

  const levelDescriptions = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const rel of item.stageLevels) {
      map[rel.nivelIncidenciaSeveridadId] = rel.description;
    }
    return map;
  }, [item.stageLevels]);

  const hasLevelSelected =
    (selection?.incidenceLevelId ?? null) !== null ||
    (selection?.severityLevelId ?? null) !== null;

  return (
    <View style={[styles.sanitaryCard, isCompactLayout && styles.sanitaryCardCompact]}>
      <Pressable
        accessibilityLabel={`Ver imagen de ${item.name}`}
        accessibilityRole="imagebutton"
        onPress={() => onImagePress(item)}
      >
        <Image
          resizeMode="cover"
          source={imageSource}
          style={[styles.pestImage, isCompactLayout && styles.pestImageCompact]}
        />
      </Pressable>

      <View style={[styles.cardContent, isCompactLayout && styles.cardContentCompact]}>
        <View style={[styles.cardHeader, isCompactLayout && styles.cardHeaderCompact]}>
          <View style={styles.cardTitleColumn}>
            <AppText style={styles.pestName} variant="label">
              {item.name}
            </AppText>
          </View>
        </View>

        {incidenceOptions.length > 0 ? (
          <LevelSelectorRow
            accentColor="#12622f"
            label="Incidencia"
            levels={incidenceOptions}
            isCompactLayout={isCompactLayout}
            levelDescriptions={levelDescriptions}
            onSelect={(levelId) => onSelectLevel(item.id, "incidencia", levelId)}
            selectedLevelId={selection?.incidenceLevelId ?? null}
          />
        ) : null}
        {severityOptions.length > 0 ? (
          <LevelSelectorRow
            accentColor="#7b4b00"
            label="Severidad"
            levels={severityOptions}
            isCompactLayout={isCompactLayout}
            levelDescriptions={levelDescriptions}
            onSelect={(levelId) => onSelectLevel(item.id, "severidad", levelId)}
            selectedLevelId={selection?.severityLevelId ?? null}
          />
        ) : null}

        <OrganoSelector
          disabled={!hasLevelSelected}
          onToggle={(organo) => onToggleOrgano(item.id, organo)}
          selectedOrganos={selection?.organosAfectados ?? []}
        />
      </View>
    </View>
  );
}

function OrganoSelector({
  disabled,
  onToggle,
  selectedOrganos
}: {
  disabled: boolean;
  onToggle: (organo: OrganoAfectado) => void;
  selectedOrganos: OrganoAfectado[];
}) {
  return (
    <View style={[styles.organosBlock, disabled && styles.organosBlockDisabled]}>
      <View
        style={[
          styles.levelPill,
          { backgroundColor: disabled ? theme.colors.textMuted : "#1a5276" }
        ]}
      >
        <AppText style={styles.levelPillText} variant="caption">
          Organos afectados
        </AppText>
      </View>
      {disabled ? (
        <AppText style={styles.organosDisabledHint} variant="caption">
          Selecciona incidencia o severidad primero
        </AppText>
      ) : (
        <View style={styles.organosGrid}>
          {ORGANO_OPTIONS.map((option) => {
            const selected = selectedOrganos.includes(option.value);

            return (
              <Pressable
                accessibilityLabel={`Organo afectado ${option.label}`}
                accessibilityRole="button"
                key={option.value}
                onPress={() => onToggle(option.value)}
                style={[
                  styles.organoChip,
                  selected ? styles.organoChipSelected : styles.organoChipInactive
                ]}
              >
                <Ionicons
                  color={selected ? theme.colors.textInverse : theme.colors.primaryDark}
                  name={option.icon}
                  size={16}
                />
                <AppText
                  style={[
                    styles.organoChipText,
                    selected
                      ? styles.organoChipTextSelected
                      : styles.organoChipTextInactive
                  ]}
                  variant="caption"
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

type LevelSelectorRowProps = {
  accentColor: string;
  label: string;
  isCompactLayout: boolean;
  levels: IncidenceLevelCatalogItem[];
  onSelect: (levelId: string) => void;
  selectedLevelId: string | null;
  levelDescriptions: Record<string, string | null>;
};

function LevelSelectorRow({
  accentColor,
  label,
  isCompactLayout,
  levels,
  onSelect,
  selectedLevelId,
  levelDescriptions
}: LevelSelectorRowProps) {
  const [expanded, setExpanded] = useState(false);
  const selectedLevel = levels.find((l) => l.id === selectedLevelId);
  const description = selectedLevelId
    ? (levelDescriptions[selectedLevelId] ?? null)
    : null;
  const hasDescription = typeof description === "string" && description.trim().length > 0;
  const isLongDescription = hasDescription && description.length > 50;

  return (
    <View style={[styles.levelRow, isCompactLayout && styles.levelRowCompact]}>
      <View style={[styles.levelRowTop, isCompactLayout && styles.levelRowTopCompact]}>
        <View style={[styles.levelPill, { backgroundColor: accentColor }]}>
          <AppText style={styles.levelPillText} variant="caption">
            {label}
          </AppText>
        </View>
        <View style={[styles.levelButtons, isCompactLayout && styles.levelButtonsCompact]}>
          {levels.map((level) => {
            const selected = level.id === selectedLevelId;
            return (
              <Pressable
                accessibilityLabel={`${label} grado ${level.sortOrder}`}
                accessibilityRole="button"
                key={level.id}
                onPress={() => {
                  onSelect(level.id);
                  setExpanded(false);
                }}
                style={[
                  styles.levelButton,
                  isCompactLayout && styles.levelButtonCompact,
                  selected
                    ? {
                        backgroundColor: getLevelColor(level.sortOrder),
                        borderColor: getLevelColor(level.sortOrder)
                      }
                    : styles.levelButtonInactive
                ]}
              >
              <AppText
                numberOfLines={1}
                style={[
                  styles.levelButtonText,
                  selected
                    ? styles.levelButtonTextSelected
                    : styles.levelButtonTextInactive
                ]}
                variant="label"
              >
                {level.name}
              </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {selectedLevel && hasDescription ? (
        <Pressable
          accessibilityLabel={`Ver descripcion de ${label} ${selectedLevel.name}`}
          accessibilityRole="button"
          onPress={() => setExpanded(!expanded)}
          style={styles.levelDescriptionBlock}
        >
          <AppText
            style={[
              styles.levelDescriptionText,
              !expanded && isLongDescription && styles.levelDescriptionTextCollapsed
            ]}
            numberOfLines={expanded ? undefined : isLongDescription ? 2 : undefined}
            variant="caption"
          >
            {description}
          </AppText>
          {isLongDescription ? (
            <View style={styles.levelDescriptionToggle}>
              <AppText style={styles.levelDescriptionToggleText} variant="caption">
                {expanded ? "Mostrar menos" : "Mostrar mas"}
              </AppText>
              <Ionicons
                color={accentColor}
                name={expanded ? "chevron-up" : "chevron-down"}
                size={14}
              />
            </View>
          ) : null}
        </Pressable>
      ) : null}
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

function ImagePreviewModal({
  item,
  onClose
}: {
  item: PestDiseaseByStageItem | null;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const frameWidth = Math.max(240, width * 0.86 - 36);
  const frameHeight = 260;
  const scale = useSharedValue(1);
  const scaleBase = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateStartX = useSharedValue(0);
  const translateStartY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    scaleBase.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    translateStartX.value = 0;
    translateStartY.value = 0;
  }, [
    item,
    scale,
    scaleBase,
    translateX,
    translateY,
    translateStartX,
    translateStartY
  ]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin(() => {
          scaleBase.value = scale.value;
        })
        .onUpdate((event) => {
          const nextScale = scaleBase.value * event.scale;
          scale.value = Math.min(3, Math.max(1, nextScale));
          const maxTranslateX = ((scale.value - 1) * frameWidth) / 2;
          const maxTranslateY = ((scale.value - 1) * frameHeight) / 2;
          translateX.value = Math.min(
            maxTranslateX,
            Math.max(-maxTranslateX, translateX.value)
          );
          translateY.value = Math.min(
            maxTranslateY,
            Math.max(-maxTranslateY, translateY.value)
          );
        })
        .onEnd(() => {
          if (scale.value < 1.01) {
            scale.value = withTiming(1, { duration: 140 });
            translateX.value = withTiming(0, { duration: 140 });
            translateY.value = withTiming(0, { duration: 140 });
          }
        }),
    [frameHeight, frameWidth, scale, scaleBase, translateX, translateY]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          translateStartX.value = translateX.value;
          translateStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          if (scale.value <= 1) {
            translateX.value = 0;
            translateY.value = 0;
            return;
          }

          const maxTranslateX = ((scale.value - 1) * frameWidth) / 2;
          const maxTranslateY = ((scale.value - 1) * frameHeight) / 2;
          const nextTranslateX = translateStartX.value + event.translationX;
          const nextTranslateY = translateStartY.value + event.translationY;

          translateX.value = Math.min(
            maxTranslateX,
            Math.max(-maxTranslateX, nextTranslateX)
          );
          translateY.value = Math.min(
            maxTranslateY,
            Math.max(-maxTranslateY, nextTranslateY)
          );
        }),
    [
      frameHeight,
      frameWidth,
      scale,
      translateStartX,
      translateStartY,
      translateX,
      translateY
    ]
  );

  const resetGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          scale.value = withTiming(1, { duration: 160 });
          scaleBase.value = 1;
          translateX.value = withTiming(0, { duration: 160 });
          translateY.value = withTiming(0, { duration: 160 });
          translateStartX.value = 0;
          translateStartY.value = 0;
        }),
    [scale, scaleBase, translateStartX, translateStartY, translateX, translateY]
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture, resetGesture),
    [panGesture, pinchGesture, resetGesture]
  );
  const imageSource = item ? getPestDiseaseImageSource(item) : DEFAULT_PEST_DISEASE_IMAGE;

  if (!item) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <GestureHandlerRootView style={styles.modalRoot}>
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
            <GestureDetector gesture={composedGesture}>
              <View style={styles.previewImageFrame}>
                <Animated.Image
                  resizeMode="contain"
                  source={imageSource}
                  style={[styles.previewImage, imageAnimatedStyle]}
                />
              </View>
            </GestureDetector>
          </View>
        </View>
      </GestureHandlerRootView>
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

    if (
      !selection?.incidenceLevelId &&
      !selection?.severityLevelId &&
      !selection?.organosAfectados.length
    ) {
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

    if (selection.organosAfectados.length === 0) {
      return `Selecciona al menos un organo afectado para ${pestDisease.name}.`;
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
         severityLevelId: observacion.severityLevelId,
         organosAfectados: observacion.organosAfectados
       }
    ])
  );
}

function getPestDiseaseImageSource(
  item: PestDiseaseByStageItem
): ImageSourcePropType {
  const normalizedName = normalizeCatalogName(item.name);
  const imageConfig = PEST_DISEASE_IMAGES.find(({ patterns }) =>
    patterns.some((pattern) => normalizedName.includes(pattern))
  );

  return imageConfig?.source ?? DEFAULT_PEST_DISEASE_IMAGE;
}

function normalizeIncidenceLevel(
  level: IncidenceLevelCatalogItem
): IncidenceLevelCatalogItem {
  return {
    ...level,
    type: normalizeIncidenceLevelType(level.type)
  };
}

function normalizeIncidenceLevelType(value: string): IncidenceLevelCatalogItem["type"] {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (normalized.startsWith("sever")) {
    return "severidad";
  }

  return "incidencia";
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
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
  cardContentCompact: {
    width: "100%"
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardHeaderCompact: {
    flexDirection: "column",
    gap: 8
  },
  cardTitleColumn: {
    flex: 1,
    alignItems: "center"
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
    fontSize: 18,
    textAlign: "center"
  },
  groupSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 17
  },
  groupHeader: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: "#d2ead8"
  },
  groupTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
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
  previewImageFrame: {
    alignItems: "center",
    height: 260,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%"
  },
  pestImageCompact: {
    alignSelf: "center",
    height: 68,
    width: 68
  },
  levelButton: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 34,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 4
  },
  levelButtonCompact: {
    flexBasis: "22%",
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "22%",
    minWidth: 0
  },
  levelButtonInactive: {
    backgroundColor: "#eef1ef",
    borderColor: theme.colors.border
  },
  levelButtonText: {
    fontSize: 13,
    fontWeight: "600"
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
  levelButtonsCompact: {
    flexWrap: "wrap",
    width: "100%"
  },
  levelLabel: {
    color: theme.colors.text,
    fontSize: 14,
    width: 78
  },
  levelPill: {
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  levelPillText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700"
  },
  levelRow: {
    gap: 6
  },
  levelRowCompact: {
    gap: 4
  },
  levelRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  levelRowTopCompact: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 6
  },
  levelDescriptionBlock: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    padding: 8,
    width: "100%"
  },
  levelDescriptionText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16
  },
  levelDescriptionTextCollapsed: {
    maxHeight: 32
  },
  levelDescriptionToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "flex-end",
    marginTop: 4
  },
  levelDescriptionToggleText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "600"
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
  modalRoot: {
    flex: 1
  },
  pestImage: {
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 82,
    width: 82
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
  sanitaryCardCompact: {
    alignItems: "stretch",
    flexDirection: "column"
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
  organosBlock: {
    gap: 7,
    paddingTop: 2
  },
  organosBlockDisabled: {
    opacity: 0.55
  },
  organosDisabledHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontStyle: "italic"
  },
  organosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  organoChip: {
    alignItems: "center",
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  organoChipInactive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border
  },
  organoChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  organoChipText: {
    fontSize: 12,
    fontWeight: "700"
  },
  organoChipTextInactive: {
    color: theme.colors.primaryDark
  },
  organoChipTextSelected: {
    color: theme.colors.textInverse
  },
  pestName: {
    color: theme.colors.text,
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.72
  },
  previewImage: {
    height: 260,
    width: "100%"
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
