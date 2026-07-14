import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
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
  FormScrollView,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { downloadAllCatalogs } from "../../../../shared/database/seed-catalogs";
import { toApiError } from "../../../../shared/services";
import { nutricionService } from "../../../nutricion/services";
import type {
  NutrientCatalogItem,
  NutrientDetailCatalogItem
} from "../../../nutricion/types";
import type { OrganoAfectado } from "../../../observaciones-sanitarias/types";
import { observacionesSanitariasService } from "../../../observaciones-sanitarias/services";
import {
  ComplianceScoreCard,
  PreviousRecipeSummaryCard,
  StepObservationCard
} from "../../../visita-calificaciones/presentation/components";
import { visitaCalificacionesService } from "../../../visita-calificaciones/services";
import type { RecetaAnterior } from "../../../visita-calificaciones/types";
import { visitasCampoService } from "../../../visitas-campo/services";
import { evaluacionesService } from "../../services";
import type { VisitaEvaluacion } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEFAULT_NUTRIENT_IMAGE = require("../../../../../assets/images/adaptive_icon_vsm.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const BORO_IMAGE = require("../../../../../assets/images/boro.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HIERRO_IMAGE = require("../../../../../assets/images/hierro.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MAGNESIO_IMAGE = require("../../../../../assets/images/magnesio.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NITROGENO_IMAGE = require("../../../../../assets/images/nitrogeno.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const POTASIO_IMAGE = require("../../../../../assets/images/potasio.webp");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ZINC_IMAGE = require("../../../../../assets/images/zinc.webp");

const STEP_NUMBER = 4;
const NUTRITION_ORDER_OFFSET = 3000;
const NUTRITION_DESCRIPTION_PREFIX = "Nutricion -";
const NUTRIENT_DISPLAY_ORDER = [
  "nitrogeno",
  "magnesio",
  "potasio",
  "hierro",
  "zinc",
  "boro"
];

const WIZARD_STEPS = [
  { index: 1, title: "Datos" },
  { index: 2, title: "Plagas" },
  { index: 3, title: "Enfermedades" },
  { index: 4, title: "Nutricion" },
  { index: 5, title: "Riego" },
  { index: 6, title: "Labores" }
] as const;

const NUTRIENT_IMAGES: Array<{
  patterns: string[];
  source: ImageSourcePropType;
}> = [
  { patterns: ["boro"], source: BORO_IMAGE },
  { patterns: ["hierro"], source: HIERRO_IMAGE },
  { patterns: ["magnesio"], source: MAGNESIO_IMAGE },
  { patterns: ["nitrogeno"], source: NITROGENO_IMAGE },
  { patterns: ["potasio"], source: POTASIO_IMAGE },
  { patterns: ["zinc"], source: ZINC_IMAGE }
];

const ORGANO_OPTIONS: Array<{
  value: OrganoAfectado;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "tronco_rama", label: "Tronco/rama", icon: "git-branch-outline" },
  { value: "yema_apical", label: "Yema apical", icon: "radio-button-on-outline" },
  { value: "brote_vegetativo", label: "Brote vegetativo", icon: "leaf-outline" },
  { value: "hoja_tierna", label: "Hoja tierna", icon: "leaf-outline" },
  { value: "hoja_madura", label: "Hoja madura", icon: "leaf-outline" },
  { value: "panicula_floral", label: "Panicula floral", icon: "flower-outline" },
  { value: "flor_individual", label: "Flor individual", icon: "rose-outline" },
  {
    value: "fruto_recien_cuajado",
    label: "Fruto recien cuajado",
    icon: "ellipse-outline"
  },
  { value: "fruto_verde", label: "Fruto verde", icon: "nutrition-outline" },
  { value: "fruto_maduro", label: "Fruto maduro", icon: "basket-outline" },
  { value: "raices", label: "Raices", icon: "nutrition-outline" }
];

type NutritionSelection = {
  detailId: string | null;
  incidencePercentage: string;
  organosAfectados: OrganoAfectado[];
};

export function VisitaNutricionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const isCompactLayout = width < 460;

  const [nutrients, setNutrients] = useState<NutrientCatalogItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<VisitaEvaluacion[]>([]);
  const [selections, setSelections] = useState<Record<string, NutritionSelection>>({});
  const [scoreValue, setScoreValue] = useState<number | null>(null);
  const [scoreJustificado, setScoreJustificado] = useState<boolean | null>(null);
  const [categoriaJustificacion, setCategoriaJustificacion] = useState<string | null>(
    null
  );
  const [motivoJustificacion, setMotivoJustificacion] = useState<string | null>(null);
  const [stepObservation, setStepObservation] = useState("");
  const [recetaAnterior, setRecetaAnterior] = useState<RecetaAnterior | null>(null);
  const [imagePreview, setImagePreview] = useState<NutrientCatalogItem | null>(null);
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
      <FormScrollView contentContainerStyle={styles.scrollContent}>
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
                onPress={() => goBackToStep2()}
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
              Nutricion
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Evalua el grado observado en cada nutriente de la parcela.
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <WizardProgress />

          {isLoading ? (
            <AppCard>
              <AppText variant="muted">Cargando nutrientes...</AppText>
            </AppCard>
          ) : null}

          {!isLoading && error ? (
            <AppCard>
              <AppText variant="heading">No se pudo cargar el paso 4</AppText>
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

          {!isLoading && !error && nutrients.length === 0 ? (
            <AppEmptyState
              title="Sin nutrientes"
              message="No hay nutrientes activos para el cultivo de esta visita."
            />
          ) : null}

          {!isLoading && !error && nutrients.length > 0 ? (
            <NutrientSection
              isCompactLayout={isCompactLayout}
              nutrients={nutrients}
              onIncidencePercentageChange={handleIncidencePercentageChange}
              onImagePress={setImagePreview}
              onSelectDetail={handleSelectDetail}
              onToggleOrgano={handleToggleOrgano}
              selections={selections}
            />
          ) : null}

          {!isLoading && !error ? (
            <>
              <PreviousRecipeSummaryCard modulo="nutricion" receta={recetaAnterior} />
              {recetaAnterior?.existe ? (
                <ComplianceScoreCard
                  value={scoreValue}
                  onChange={handleScoreChange}
                  justificado={scoreJustificado}
                  onJustificadoChange={handleJustificadoChange}
                  categoriaJustificacion={categoriaJustificacion}
                  onCategoriaJustificacionChange={setCategoriaJustificacion}
                  motivoJustificacion={motivoJustificacion}
                  onMotivoJustificacionChange={setMotivoJustificacion}
                  observacion={stepObservation}
                  onObservacionChange={setStepObservation}
                />
              ) : (
                <StepObservationCard
                  value={stepObservation}
                  onChange={setStepObservation}
                />
              )}
            </>
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
                onPress={() => goBackToStep2()}
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
      </FormScrollView>

      <NutrientImageModal nutrient={imagePreview} onClose={() => setImagePreview(null)} />
    </ScreenContainer>
  );

  async function loadStep(id: string) {
    setIsLoading(true);
    setError(null);
    setSubmitError(null);

    try {
      const visita = await visitasCampoService.getById(id);
      let nextNutrients = nutricionService.getNutrientsByCrop(visita.cropId);

      if (nextNutrients.length === 0) {
        try {
          await downloadAllCatalogs();
          nextNutrients = nutricionService.getNutrientsByCrop(visita.cropId);
        } catch {
          // Conservamos el resultado local si no hay conexion para recargar.
        }
      }

      const nextEvaluaciones = await evaluacionesService.getByVisitaId(id);
      const nextStepNote = await observacionesSanitariasService.getStepNote(
        id,
        STEP_NUMBER
      );
      const sortedNutrients = sortNutrients(nextNutrients).map((nutrient) => ({
        ...nutrient,
        details: sortDetails(nutrient.details)
      }));
      const currentCalificacion = visitaCalificacionesService.getByModulo(
        id,
        "nutricion"
      );

      setNutrients(sortedNutrients);
      setEvaluaciones(nextEvaluaciones);
      setSelections(buildSelectionMap(nextEvaluaciones, sortedNutrients));
      setScoreValue(currentCalificacion?.puntaje ?? null);
      setScoreJustificado(
        currentCalificacion && currentCalificacion.puntaje < 3
          ? (currentCalificacion.justificado ?? false)
          : null
      );
      setCategoriaJustificacion(currentCalificacion?.categoriaJustificacion ?? null);
      setMotivoJustificacion(currentCalificacion?.motivoJustificacion ?? null);
      setStepObservation(nextStepNote?.observation ?? "");
      try {
        setRecetaAnterior(
          await visitaCalificacionesService.fetchRecetaAnteriorForVisit(id)
        );
      } catch {
        setRecetaAnterior({ existe: false });
      }
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo cargar nutricion.");
    } finally {
      setIsLoading(false);
    }
  }

  function goBackToStep2() {
    if (!visitaId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/visitas-campo/[id]/enfermedades",
      params: { id: visitaId }
    });
  }

  function handleSelectDetail(nutrientId: string, detailId: string) {
    setSubmitError(null);
    setSelections((currentSelections) => {
      const currentSelection = currentSelections[nutrientId] ?? createEmptySelection();

      return {
        ...currentSelections,
        [nutrientId]: {
          ...currentSelection,
          detailId: currentSelection.detailId === detailId ? null : detailId
        }
      };
    });
  }

  function handleIncidencePercentageChange(nutrientId: string, value: string) {
    setSubmitError(null);
    setSelections((currentSelections) => {
      const currentSelection = currentSelections[nutrientId] ?? createEmptySelection();
      const normalizedValue = sanitizePercentageInput(value);
      const shouldClearDependents =
        normalizedValue === "" || Number(normalizedValue) === 0;

      return {
        ...currentSelections,
        [nutrientId]: {
          ...currentSelection,
          incidencePercentage: normalizedValue,
          detailId: shouldClearDependents ? null : currentSelection.detailId,
          organosAfectados: shouldClearDependents ? [] : currentSelection.organosAfectados
        }
      };
    });
  }

  function handleToggleOrgano(nutrientId: string, organo: OrganoAfectado) {
    setSubmitError(null);
    setSelections((currentSelections) => {
      const currentSelection = currentSelections[nutrientId] ?? createEmptySelection();
      const selectedOrganos = new Set(currentSelection.organosAfectados);

      if (selectedOrganos.has(organo)) {
        selectedOrganos.delete(organo);
      } else {
        selectedOrganos.add(organo);
      }

      return {
        ...currentSelections,
        [nutrientId]: {
          ...currentSelection,
          organosAfectados: Array.from(selectedOrganos)
        }
      };
    });
  }

  function handleScoreChange(value: number) {
    setSubmitError(null);
    setScoreValue(value);

    if (value === 3) {
      setScoreJustificado(null);
      setCategoriaJustificacion(null);
      setMotivoJustificacion(null);
      return;
    }

    setScoreJustificado((currentValue) => currentValue ?? false);
  }

  function handleJustificadoChange(value: boolean) {
    setSubmitError(null);
    setScoreJustificado(value);

    if (!value) {
      setCategoriaJustificacion(null);
      setMotivoJustificacion(null);
    }
  }

  async function handleContinue() {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    const hasRegisteredData = hasAnyNutritionSelection(selections, nutrients);
    const shouldScore = recetaAnterior?.existe === true;
    const validationMessage = hasRegisteredData
      ? validateNutritionSelections(selections, nutrients)
      : null;

    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    if (shouldScore && hasRegisteredData && scoreValue === null) {
      setSubmitError("Selecciona un puntaje de cumplimiento para nutricion.");
      return;
    }

    if (
      shouldScore &&
      scoreValue !== null &&
      scoreValue < 3 &&
      scoreJustificado === true &&
      (!categoriaJustificacion || !motivoJustificacion)
    ) {
      setSubmitError("Selecciona categoria y motivo de justificacion.");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      for (const nutrient of nutrients) {
        const order = getNutrientEvaluationOrder(nutrient);
        const existingEvaluation = evaluaciones.find(
          (evaluacion) => evaluacion.order === order
        );
        const selection = selections[nutrient.id] ?? createEmptySelection();
        const selectedDetail = nutrient.details.find(
          (detail) => detail.id === selection.detailId
        );
        const hasIncidence = selection.incidencePercentage !== "";

        if (!hasIncidence && !selectedDetail) {
          if (existingEvaluation) {
            await evaluacionesService.remove(existingEvaluation.id);
          }
          continue;
        }

        const payload = {
          order,
          incidencePercentage: Number(selection.incidencePercentage),
          percentage: selectedDetail ? getDetailNumericValue(selectedDetail) : null,
          description: buildEvaluationDescription(nutrient, selectedDetail, selection),
          organosAfectados: selection.organosAfectados
        };

        if (existingEvaluation) {
          await evaluacionesService.update(existingEvaluation.id, payload);
        } else {
          await evaluacionesService.create(visitaId, payload);
        }
      }

      if (shouldScore) {
        await visitaCalificacionesService.upsert(visitaId, {
          modulo: "nutricion",
          puntaje: scoreValue ?? 3,
          observacion: stepObservation.trim() || null,
          justificado: resolveJustificado(scoreValue ?? 3, scoreJustificado),
          categoriaJustificacion:
            scoreJustificado === true ? categoriaJustificacion : null,
          motivoJustificacion: scoreJustificado === true ? motivoJustificacion : null
        });
      }

      await observacionesSanitariasService.upsertStepNote(visitaId, STEP_NUMBER, {
        observation: stepObservation.trim() || null
      });

      router.replace({
        pathname: "/visitas-campo/[id]/riego",
        params: { id: visitaId }
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 4.");
    } finally {
      setIsSaving(false);
    }
  }
}

type NutrientSectionProps = {
  isCompactLayout: boolean;
  nutrients: NutrientCatalogItem[];
  onIncidencePercentageChange: (nutrientId: string, value: string) => void;
  onImagePress: (nutrient: NutrientCatalogItem) => void;
  onSelectDetail: (nutrientId: string, detailId: string) => void;
  onToggleOrgano: (nutrientId: string, organo: OrganoAfectado) => void;
  selections: Record<string, NutritionSelection>;
};

function NutrientSection({
  isCompactLayout,
  nutrients,
  onIncidencePercentageChange,
  onImagePress,
  onSelectDetail,
  onToggleOrgano,
  selections
}: NutrientSectionProps) {
  const [expandedNutrientIds, setExpandedNutrientIds] = useState<Set<string>>(
    () => new Set(nutrients.length === 1 ? [nutrients[0].id] : [])
  );

  useEffect(() => {
    setExpandedNutrientIds(new Set(nutrients.length === 1 ? [nutrients[0].id] : []));
  }, [nutrients]);

  const hasMultipleNutrients = nutrients.length > 1;

  return (
    <View style={styles.sectionGroup}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleRow}>
          <View style={styles.groupIcon}>
            <Ionicons
              color={theme.colors.primaryDark}
              name="nutrition-outline"
              size={19}
            />
          </View>
          <AppText style={styles.groupTitle} variant="heading">
            NUTRIENTES
          </AppText>
        </View>
        <AppText style={styles.groupSubtitle} variant="caption">
          {hasMultipleNutrients
            ? "Selecciona una deficiencia para expandirla y registrar la evaluacion."
            : "Registra la evaluacion de la deficiencia nutricional."}
        </AppText>
      </View>

      {nutrients.map((nutrient) => {
        const isExpanded = expandedNutrientIds.has(nutrient.id);

        return (
          <NutrientCard
            isCompactLayout={isCompactLayout}
            isExpanded={isExpanded}
            key={nutrient.id}
            nutrient={nutrient}
            onIncidencePercentageChange={onIncidencePercentageChange}
            onImagePress={onImagePress}
            onSelectDetail={onSelectDetail}
            onToggleExpanded={() =>
              setExpandedNutrientIds((currentIds) => {
                const nextIds = new Set(currentIds);
                if (nextIds.has(nutrient.id)) {
                  nextIds.delete(nutrient.id);
                } else {
                  nextIds.add(nutrient.id);
                }
                return nextIds;
              })
            }
            onToggleOrgano={onToggleOrgano}
            selection={selections[nutrient.id] ?? createEmptySelection()}
          />
        );
      })}
    </View>
  );
}

type NutrientCardProps = {
  isCompactLayout: boolean;
  isExpanded: boolean;
  nutrient: NutrientCatalogItem;
  onIncidencePercentageChange: (nutrientId: string, value: string) => void;
  onImagePress: (nutrient: NutrientCatalogItem) => void;
  onSelectDetail: (nutrientId: string, detailId: string) => void;
  onToggleExpanded: () => void;
  onToggleOrgano: (nutrientId: string, organo: OrganoAfectado) => void;
  selection: NutritionSelection;
};

function NutrientCard({
  isCompactLayout,
  isExpanded,
  nutrient,
  onIncidencePercentageChange,
  onImagePress,
  onSelectDetail,
  onToggleExpanded,
  onToggleOrgano,
  selection
}: NutrientCardProps) {
  const [expanded, setExpanded] = useState(false);
  const imageSource = getNutrientImageSource(nutrient);
  const selectedDetail = nutrient.details.find((d) => d.id === selection.detailId);
  const description = selectedDetail?.description ?? null;
  const hasDescription = typeof description === "string" && description.trim().length > 0;
  const isLongDescription = hasDescription && description.length > 50;
  const hasIncidence = selection.incidencePercentage !== "";
  const incidenceIsZero = hasIncidence && Number(selection.incidencePercentage) === 0;
  const disablesSeverity = !hasIncidence || incidenceIsZero;
  const hasRegisteredSelection = Boolean(
    selection.incidencePercentage ||
    selection.detailId ||
    selection.organosAfectados.length > 0
  );

  return (
    <View style={[styles.nutrientCard, isCompactLayout && styles.nutrientCardCompact]}>
      <Pressable
        accessibilityLabel={`${isExpanded ? "Contraer" : "Expandir"} ${nutrient.name}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggleExpanded}
        style={({ pressed }) => [styles.accordionHeader, pressed && styles.pressed]}
      >
        {!isExpanded ? (
          <>
            <Image
              resizeMode="cover"
              source={imageSource}
              style={styles.accordionThumbnail}
            />
            <View style={styles.accordionCollapsedCopy}>
              <View style={styles.accordionCollapsedTitleRow}>
                <AppText numberOfLines={2} style={styles.accordionTitle} variant="label">
                  {nutrient.name}
                </AppText>
                <View
                  style={[
                    styles.accordionStatusBadge,
                    hasRegisteredSelection
                      ? styles.accordionStatusBadgeDone
                      : styles.accordionStatusBadgePending
                  ]}
                >
                  <AppText
                    style={[
                      styles.accordionStatusText,
                      hasRegisteredSelection
                        ? styles.accordionStatusTextDone
                        : styles.accordionStatusTextPending
                    ]}
                    variant="caption"
                  >
                    {hasRegisteredSelection ? "Con registro" : "Sin registro"}
                  </AppText>
                </View>
              </View>
              <AppText style={styles.accordionHint} variant="caption">
                Toca para expandir y registrar la evaluacion.
              </AppText>
            </View>
            <View style={styles.accordionChevronCircle}>
              <Ionicons color={theme.colors.primaryDark} name="chevron-down" size={18} />
            </View>
          </>
        ) : (
          <>
            <AppText style={styles.accordionTitle} variant="label">
              {nutrient.name}
            </AppText>
            <Ionicons color={theme.colors.primaryDark} name="chevron-up" size={20} />
          </>
        )}
      </Pressable>

      {!isExpanded ? null : (
        <View
          style={[
            styles.accordionContent,
            isCompactLayout && styles.accordionContentCompact
          ]}
        >
          <Pressable
            accessibilityLabel={`Ver imagen de ${nutrient.name}`}
            accessibilityRole="imagebutton"
            onPress={() => onImagePress(nutrient)}
          >
            <Image
              resizeMode="cover"
              source={imageSource}
              style={[
                styles.nutrientImage,
                isCompactLayout && styles.nutrientImageCompact
              ]}
            />
          </Pressable>

          <View
            style={[styles.cardContent, isCompactLayout && styles.cardContentCompact]}
          >
            <View
              style={[styles.cardHeader, isCompactLayout && styles.cardHeaderCompact]}
            >
              <View style={styles.cardTitleColumn}>
                <AppText style={styles.nutrientName} variant="label">
                  {nutrient.name}
                </AppText>
              </View>
            </View>

            <PercentageInputBlock
              label="Incidencia"
              onChangeText={(value) => onIncidencePercentageChange(nutrient.id, value)}
              value={selection.incidencePercentage}
            />

            {nutrient.details.length > 0 ? (
              <>
                <View
                  style={[styles.detailLabelRow, disablesSeverity && styles.disabledArea]}
                >
                  <AppText style={styles.detailLabel} variant="caption">
                    Severidad
                  </AppText>
                  {disablesSeverity ? (
                    <AppText style={styles.disabledHint} variant="caption">
                      {incidenceIsZero
                        ? "Incidencia 0: no hay severidad que evaluar."
                        : "Indica primero la incidencia."}
                    </AppText>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.detailButtons,
                    isCompactLayout && styles.detailButtonsCompact,
                    disablesSeverity && styles.disabledArea
                  ]}
                >
                  {nutrient.details.map((detail, index) => {
                    const selected = detail.id === selection.detailId;

                    return (
                      <Pressable
                        accessibilityLabel={`${nutrient.name} ${detail.name}`}
                        accessibilityRole="button"
                        disabled={disablesSeverity}
                        key={detail.id}
                        onPress={() => {
                          onSelectDetail(nutrient.id, detail.id);
                          setExpanded(false);
                        }}
                        style={[
                          styles.detailButton,
                          isCompactLayout && styles.detailButtonCompact,
                          selected
                            ? {
                                backgroundColor: getDetailColor(index + 1),
                                borderColor: getDetailColor(index + 1)
                              }
                            : styles.detailButtonInactive
                        ]}
                      >
                        <AppText
                          numberOfLines={1}
                          style={[
                            styles.detailButtonText,
                            selected
                              ? styles.detailButtonTextSelected
                              : styles.detailButtonTextInactive
                          ]}
                          variant="label"
                        >
                          {detail.name}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {!disablesSeverity && selectedDetail && hasDescription ? (
                  <Pressable
                    accessibilityLabel={`Ver descripcion de ${selectedDetail.name}`}
                    accessibilityRole="button"
                    onPress={() => setExpanded(!expanded)}
                    style={styles.detailDescriptionBlock}
                  >
                    <AppText
                      style={[
                        styles.detailDescriptionText,
                        !expanded &&
                          isLongDescription &&
                          styles.detailDescriptionTextCollapsed
                      ]}
                      numberOfLines={
                        expanded ? undefined : isLongDescription ? 2 : undefined
                      }
                      variant="caption"
                    >
                      {description}
                    </AppText>
                    {isLongDescription ? (
                      <View style={styles.detailDescriptionToggle}>
                        <AppText
                          style={styles.detailDescriptionToggleText}
                          variant="caption"
                        >
                          {expanded ? "Mostrar menos" : "Mostrar mas"}
                        </AppText>
                        <Ionicons
                          color={theme.colors.primary}
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={14}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                ) : null}
              </>
            ) : (
              <AppText variant="muted">Sin grados registrados.</AppText>
            )}

            <OrganoSelector
              disabled={disablesSeverity}
              disabledHint={
                incidenceIsZero
                  ? "Incidencia 0: no hay organos afectados."
                  : "Indica primero la incidencia."
              }
              onToggle={(organo) => onToggleOrgano(nutrient.id, organo)}
              selectedOrganos={selection.organosAfectados}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function PercentageInputBlock({
  label,
  onChangeText,
  value
}: {
  label: string;
  onChangeText: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.percentageBlock}>
      <View style={styles.percentageHeader}>
        <AppText style={styles.detailLabel} variant="caption">
          {label}
        </AppText>
        <AppText style={styles.percentageHint} variant="caption">
          Arboles afectados. Escala de 1% en 1%.
        </AppText>
      </View>
      <View style={styles.percentageInputShell}>
        <TextInput
          accessibilityLabel={`${label} en porcentaje`}
          keyboardType="number-pad"
          maxLength={3}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.percentageInput}
          value={value}
        />
        <AppText style={styles.percentageSymbol} variant="label">
          %
        </AppText>
      </View>
    </View>
  );
}

function OrganoSelector({
  disabled,
  disabledHint,
  onToggle,
  selectedOrganos
}: {
  disabled: boolean;
  disabledHint: string;
  onToggle: (organo: OrganoAfectado) => void;
  selectedOrganos: OrganoAfectado[];
}) {
  return (
    <View style={[styles.organosBlock, disabled && styles.disabledArea]}>
      <View style={styles.detailLabelRow}>
        <AppText style={styles.detailLabel} variant="caption">
          Organos afectados
        </AppText>
        {disabled ? (
          <AppText style={styles.disabledHint} variant="caption">
            {disabledHint}
          </AppText>
        ) : null}
      </View>
      {!disabled ? (
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
                  color={selected ? theme.colors.primary : theme.colors.primaryDark}
                  name={option.icon}
                  size={17}
                />
                <AppText
                  numberOfLines={2}
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
      ) : null}
    </View>
  );
}

function WizardProgress() {
  return (
    <View style={styles.progressCard}>
      <AppText style={styles.progressLabel} variant="label">
        Paso
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
                    {step.index}
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

function NutrientImageModal({
  nutrient,
  onClose
}: {
  nutrient: NutrientCatalogItem | null;
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
    nutrient,
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
  const imageSource = nutrient
    ? getNutrientImageSource(nutrient)
    : DEFAULT_NUTRIENT_IMAGE;

  if (!nutrient) {
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
            <View style={styles.imageDescription}>
              <AppText style={styles.modalTitle} variant="heading">
                {nutrient.name}
              </AppText>
              <AppText variant="muted">
                {nutrient.description || "Sin descripcion registrada."}
              </AppText>
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function sortNutrients(nutrients: NutrientCatalogItem[]) {
  return [...nutrients].sort((left, right) => {
    const leftOrder = getNutrientDisplayIndex(left);
    const rightOrder = getNutrientDisplayIndex(right);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function sortDetails(details: NutrientDetailCatalogItem[]) {
  return [...details].sort((left, right) => {
    const leftOrder = getDetailSortValue(left.name);
    const rightOrder = getDetailSortValue(right.name);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function buildSelectionMap(
  evaluaciones: VisitaEvaluacion[],
  nutrients: NutrientCatalogItem[]
) {
  const selectionEntries = nutrients.map((nutrient) => {
    const evaluation = evaluaciones.find(
      (item) => item.order === getNutrientEvaluationOrder(nutrient)
    );

    if (!evaluation) {
      return [nutrient.id, createEmptySelection()] as const;
    }

    return [
      nutrient.id,
      {
        detailId: findSelectedDetailId(nutrient, evaluation) ?? null,
        incidencePercentage: evaluation.incidencePercentage ?? "",
        organosAfectados: evaluation.organosAfectados
      }
    ] as const;
  });

  return Object.fromEntries(selectionEntries);
}

function hasAnyNutritionSelection(
  selections: Record<string, NutritionSelection>,
  nutrients: NutrientCatalogItem[]
) {
  return nutrients.some((nutrient) => {
    const selection = selections[nutrient.id];

    return Boolean(
      selection?.incidencePercentage ||
      selection?.detailId ||
      selection?.organosAfectados.length
    );
  });
}

function validateNutritionSelections(
  selections: Record<string, NutritionSelection>,
  nutrients: NutrientCatalogItem[]
) {
  const hasAnySelection = hasAnyNutritionSelection(selections, nutrients);

  if (nutrients.length > 0 && !hasAnySelection) {
    return "Indica al menos una incidencia nutricional.";
  }

  for (const nutrient of nutrients) {
    const selection = selections[nutrient.id] ?? createEmptySelection();

    if (
      !selection.incidencePercentage &&
      !selection.detailId &&
      selection.organosAfectados.length === 0
    ) {
      continue;
    }

    if (!selection.incidencePercentage) {
      return `Indica incidencia para ${nutrient.name}.`;
    }

    const incidenceIsZero = Number(selection.incidencePercentage) === 0;

    if (!incidenceIsZero && !selection.detailId) {
      return `Selecciona severidad para ${nutrient.name}.`;
    }

    if (!incidenceIsZero && selection.organosAfectados.length === 0) {
      return `Selecciona al menos un organo afectado para ${nutrient.name}.`;
    }
  }

  return null;
}

function findSelectedDetailId(
  nutrient: NutrientCatalogItem,
  evaluation: VisitaEvaluacion
) {
  const expectedPrefix = `${NUTRITION_DESCRIPTION_PREFIX} ${nutrient.name}: `;

  if (evaluation.description.startsWith(expectedPrefix)) {
    const detailName = evaluation.description.slice(expectedPrefix.length);
    const selectedByName = nutrient.details.find(
      (detail) => normalizeCatalogName(detail.name) === normalizeCatalogName(detailName)
    );

    if (selectedByName) {
      return selectedByName.id;
    }
  }

  if (evaluation.percentage) {
    const numericValue = Number(evaluation.percentage);
    const selectedByNumber = nutrient.details.find(
      (detail) => getDetailNumericValue(detail) === numericValue
    );

    return selectedByNumber?.id ?? null;
  }

  return null;
}

function buildEvaluationDescription(
  nutrient: NutrientCatalogItem,
  detail: NutrientDetailCatalogItem | undefined,
  selection: NutritionSelection
) {
  const parts = [`Incidencia ${selection.incidencePercentage}%`];

  if (detail) {
    parts.push(`Severidad ${detail.name}`);
  }

  const description = `${NUTRITION_DESCRIPTION_PREFIX} ${nutrient.name}: ${parts.join(
    " - "
  )}`;

  return description.length <= 190 ? description : description.slice(0, 190);
}

function createEmptySelection(): NutritionSelection {
  return {
    detailId: null,
    incidencePercentage: "",
    organosAfectados: []
  };
}

function resolveJustificado(score: number, justificado: boolean | null) {
  return score === 3 ? null : (justificado ?? false);
}

function sanitizePercentageInput(value: string) {
  const digits = value.replace(/\D/gu, "").slice(0, 3);

  if (digits === "") {
    return "";
  }

  return String(Math.min(100, Number(digits)));
}

function getNutrientEvaluationOrder(nutrient: NutrientCatalogItem) {
  const displayIndex = getNutrientDisplayIndex(nutrient);

  if (displayIndex < NUTRIENT_DISPLAY_ORDER.length) {
    return NUTRITION_ORDER_OFFSET + displayIndex + 1;
  }

  return NUTRITION_ORDER_OFFSET + 100 + (hashString(nutrient.id) % 800);
}

function getNutrientDisplayIndex(nutrient: NutrientCatalogItem) {
  const normalizedName = normalizeCatalogName(nutrient.name);
  const configuredIndex = NUTRIENT_DISPLAY_ORDER.findIndex((name) =>
    normalizedName.includes(name)
  );

  return configuredIndex >= 0 ? configuredIndex : NUTRIENT_DISPLAY_ORDER.length + 1;
}

function getDetailNumericValue(detail: NutrientDetailCatalogItem) {
  const match = detail.name.match(/\d+/);
  const parsedValue = match ? Number(match[0]) : NaN;

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getDetailSortValue(value: string) {
  const match = value.match(/\d+/);

  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function getDetailColor(sortOrder: number) {
  if (sortOrder <= 1) {
    return "#7fbf20";
  }

  if (sortOrder === 2) {
    return "#ffad0a";
  }

  return "#ef3b2d";
}

function getNutrientImageSource(nutrient: NutrientCatalogItem): ImageSourcePropType {
  const normalizedName = normalizeCatalogName(nutrient.name);
  const imageConfig = NUTRIENT_IMAGES.find(({ patterns }) =>
    patterns.some((pattern) => normalizedName.includes(pattern))
  );

  return imageConfig?.source ?? DEFAULT_NUTRIENT_IMAGE;
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
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
  accordionContent: {
    flexDirection: "row",
    gap: 12
  },
  accordionContentCompact: {
    alignItems: "stretch",
    flexDirection: "column"
  },
  accordionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 56
  },
  accordionCollapsedCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  accordionCollapsedTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  accordionChevronCircle: {
    alignItems: "center",
    backgroundColor: "#eef7e4",
    borderColor: "#d2ead8",
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  accordionHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  accordionStatusBadge: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  accordionStatusBadgeDone: {
    backgroundColor: "#eef9e8",
    borderColor: "#b7dfb4"
  },
  accordionStatusBadgePending: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa"
  },
  accordionStatusText: {
    fontSize: 10,
    fontWeight: "700"
  },
  accordionStatusTextDone: {
    color: theme.colors.primaryDark
  },
  accordionStatusTextPending: {
    color: "#9a5b13"
  },
  accordionThumbnail: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: "#d2ead8",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    height: 52,
    width: 52
  },
  accordionTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 17,
    lineHeight: 22
  },
  cardContent: {
    flex: 1,
    gap: 10
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
    flexDirection: "row"
  },
  cardTitleColumn: {
    flex: 1,
    gap: 4
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
  detailButton: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 42
  },
  detailButtonCompact: {
    flexBasis: "22%",
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: "22%"
  },
  detailButtonInactive: {
    backgroundColor: "#eef1ef",
    borderColor: theme.colors.border
  },
  detailLabel: {
    color: "#000000",
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "700",
    textDecorationLine: "underline"
  },
  detailLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  detailButtonText: {
    fontSize: 16
  },
  detailButtonTextInactive: {
    color: theme.colors.textMuted
  },
  detailButtonTextSelected: {
    color: theme.colors.textInverse
  },
  detailButtons: {
    flex: 1,
    flexDirection: "row",
    gap: 7
  },
  detailButtonsCompact: {
    flexWrap: "wrap",
    width: "100%"
  },
  detailDescriptionBlock: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
    width: "100%"
  },
  detailDescriptionText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16
  },
  detailDescriptionTextCollapsed: {
    maxHeight: 32
  },
  detailDescriptionToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "flex-end",
    marginTop: 4
  },
  detailDescriptionToggleText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.55
  },
  disabledArea: {
    opacity: 0.58
  },
  disabledHint: {
    color: theme.colors.textMuted,
    flex: 1,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "right"
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: 12
  },
  groupHeader: {
    borderBottomColor: "#d2ead8",
    borderBottomWidth: 2,
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4
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
  groupSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 17
  },
  groupTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18,
    textAlign: "center"
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
  imageDescription: {
    alignSelf: "stretch",
    gap: 6,
    paddingTop: 12
  },
  imageModalContent: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 18,
    width: "86%"
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
  modalRoot: {
    flex: 1
  },
  modalTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 20
  },
  organosBlock: {
    gap: 8,
    paddingTop: 2
  },
  organosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    justifyContent: "space-between"
  },
  organoChip: {
    alignItems: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 70,
    paddingHorizontal: 5,
    paddingVertical: 8,
    width: "30.8%"
  },
  organoChipInactive: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border
  },
  organoChipSelected: {
    backgroundColor: "#eef9e8",
    borderColor: theme.colors.primary
  },
  organoChipText: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center"
  },
  organoChipTextInactive: {
    color: theme.colors.primaryDark
  },
  organoChipTextSelected: {
    color: theme.colors.primaryDark,
    fontWeight: "700"
  },
  percentageBlock: {
    gap: 8
  },
  percentageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  percentageHint: {
    color: theme.colors.textMuted,
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "right"
  },
  percentageInput: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700",
    minWidth: 44,
    paddingVertical: 0,
    textAlign: "right"
  },
  percentageInputShell: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1.2,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 9,
    width: 92
  },
  percentageSymbol: {
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  nutrientCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 12,
    ...theme.shadow.sm
  },
  nutrientCardCompact: {
    alignItems: "stretch",
    flexDirection: "column"
  },
  nutrientImage: {
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 82,
    width: 82
  },
  nutrientImageCompact: {
    alignSelf: "center",
    height: 78,
    width: 78
  },
  nutrientName: {
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
  previewImageFrame: {
    alignItems: "center",
    height: 260,
    justifyContent: "center",
    overflow: "hidden",
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
