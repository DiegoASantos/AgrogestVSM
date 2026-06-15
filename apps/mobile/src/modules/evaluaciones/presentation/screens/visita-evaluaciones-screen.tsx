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
import { nutricionService } from "../../../nutricion/services";
import type {
  NutrientCatalogItem,
  NutrientDetailCatalogItem
} from "../../../nutricion/types";
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

const STEP_NUMBER = 3;
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
  { index: 2, title: "Sanidad" },
  { index: 3, title: "Nutricion" },
  { index: 4, title: "Riego" },
  { index: 5, title: "Labores" }
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

export function VisitaNutricionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const isCompactLayout = width < 460;

  const [nutrients, setNutrients] = useState<NutrientCatalogItem[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<VisitaEvaluacion[]>([]);
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [imagePreview, setImagePreview] = useState<NutrientCatalogItem | null>(
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
              <AppText variant="heading">No se pudo cargar el paso 3</AppText>
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
              onImagePress={setImagePreview}
              onSelectDetail={handleSelectDetail}
              selections={selections}
            />
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
      </ScrollView>

      <NutrientImageModal
        nutrient={imagePreview}
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
      const sortedNutrients = sortNutrients(nextNutrients).map((nutrient) => ({
        ...nutrient,
        details: sortDetails(nutrient.details)
      }));

      setNutrients(sortedNutrients);
      setEvaluaciones(nextEvaluaciones);
      setSelections(buildSelectionMap(nextEvaluaciones, sortedNutrients));
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
      pathname: "/visitas-campo/[id]/observaciones-sanitarias",
      params: { id: visitaId }
    });
  }

  function handleSelectDetail(nutrientId: string, detailId: string) {
    setSubmitError(null);
    setSelections((currentSelections) => ({
      ...currentSelections,
      [nutrientId]:
        currentSelections[nutrientId] === detailId ? null : detailId
    }));
  }

  async function handleContinue() {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    const selectedCount = Object.values(selections).filter(Boolean).length;

    if (nutrients.length > 0 && selectedCount === 0) {
      setSubmitError("Selecciona al menos un grado nutricional.");
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
        const selectedDetail = nutrient.details.find(
          (detail) => detail.id === selections[nutrient.id]
        );

        if (!selectedDetail) {
          if (existingEvaluation) {
            await evaluacionesService.remove(existingEvaluation.id);
          }
          continue;
        }

        const payload = {
          order,
          percentage: getDetailNumericValue(selectedDetail),
          description: buildEvaluationDescription(nutrient, selectedDetail)
        };

        if (existingEvaluation) {
          await evaluacionesService.update(existingEvaluation.id, payload);
        } else {
          await evaluacionesService.create(visitaId, payload);
        }
      }

      router.replace({
        pathname: "/visitas-campo/[id]/riego",
        params: { id: visitaId }
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 3.");
    } finally {
      setIsSaving(false);
    }
  }
}

type NutrientSectionProps = {
  isCompactLayout: boolean;
  nutrients: NutrientCatalogItem[];
  onImagePress: (nutrient: NutrientCatalogItem) => void;
  onSelectDetail: (nutrientId: string, detailId: string) => void;
  selections: Record<string, string | null>;
};

function NutrientSection({
  isCompactLayout,
  nutrients,
  onImagePress,
  onSelectDetail,
  selections
}: NutrientSectionProps) {
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
          Selecciona el grado observado en cada nutriente.
        </AppText>
      </View>

      {nutrients.map((nutrient) => (
        <NutrientCard
          isCompactLayout={isCompactLayout}
          key={nutrient.id}
          nutrient={nutrient}
          onImagePress={onImagePress}
          onSelectDetail={onSelectDetail}
          selectedDetailId={selections[nutrient.id] ?? null}
        />
      ))}
    </View>
  );
}

type NutrientCardProps = {
  isCompactLayout: boolean;
  nutrient: NutrientCatalogItem;
  onImagePress: (nutrient: NutrientCatalogItem) => void;
  onSelectDetail: (nutrientId: string, detailId: string) => void;
  selectedDetailId: string | null;
};

function NutrientCard({
  isCompactLayout,
  nutrient,
  onImagePress,
  onSelectDetail,
  selectedDetailId
}: NutrientCardProps) {
  const [expanded, setExpanded] = useState(false);
  const imageSource = getNutrientImageSource(nutrient);
  const selectedDetail = nutrient.details.find(
    (d) => d.id === selectedDetailId
  );
  const description = selectedDetail?.description ?? null;
  const hasDescription =
    typeof description === "string" && description.trim().length > 0;
  const isLongDescription = hasDescription && description.length > 50;

  return (
    <View style={[styles.nutrientCard, isCompactLayout && styles.nutrientCardCompact]}>
      <Pressable
        accessibilityLabel={`Ver imagen de ${nutrient.name}`}
        accessibilityRole="imagebutton"
        onPress={() => onImagePress(nutrient)}
      >
        <Image
          resizeMode="cover"
          source={imageSource}
          style={[styles.nutrientImage, isCompactLayout && styles.nutrientImageCompact]}
        />
      </Pressable>

      <View style={[styles.cardContent, isCompactLayout && styles.cardContentCompact]}>
        <View style={[styles.cardHeader, isCompactLayout && styles.cardHeaderCompact]}>
          <View style={styles.cardTitleColumn}>
            <AppText style={styles.nutrientName} variant="label">
              {nutrient.name}
            </AppText>
          </View>
        </View>

        {nutrient.details.length > 0 ? (
          <>
            <View style={[styles.detailButtons, isCompactLayout && styles.detailButtonsCompact]}>
              {nutrient.details.map((detail, index) => {
                const selected = detail.id === selectedDetailId;

                return (
                  <Pressable
                    accessibilityLabel={`${nutrient.name} ${detail.name}`}
                    accessibilityRole="button"
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

            {selectedDetail && hasDescription ? (
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
      return [nutrient.id, null] as const;
    }

    return [
      nutrient.id,
      findSelectedDetailId(nutrient, evaluation) ?? null
    ] as const;
  });

  return Object.fromEntries(selectionEntries);
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
  detail: NutrientDetailCatalogItem
) {
  const description = `${NUTRITION_DESCRIPTION_PREFIX} ${nutrient.name}: ${detail.name}`;

  return description.length <= 190 ? description : description.slice(0, 190);
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

  return configuredIndex >= 0
    ? configuredIndex
    : NUTRIENT_DISPLAY_ORDER.length + 1;
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

function getNutrientImageSource(
  nutrient: NutrientCatalogItem
): ImageSourcePropType {
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
  nutrientCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
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
