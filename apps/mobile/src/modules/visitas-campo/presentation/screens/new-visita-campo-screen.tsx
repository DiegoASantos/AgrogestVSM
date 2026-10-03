import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Keyboard,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type LayoutChangeEvent,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
  AppSelectField,
  AppText,
  FormScrollView,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import {
  buildNewVisitDraftScopeKey,
  buildVisitDraftScopeKey,
  readVisitFormDraft,
  type VisitFormDraftIdentity
} from "../../../../shared/database/visit-form-drafts";
import { useVisitFormDraft } from "../../../../shared/hooks/use-visit-form-draft";
import { captureCurrentDeviceLocation } from "../../../../shared/location/device-location";
import type { GeoJsonPointGeometry } from "../../../../shared/maps/geo";
import { toApiError } from "../../../../shared/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { visitaCampoCatalogsService, visitasCampoService } from "../../services";
import type {
  CreateVisitaCampoDraft,
  NewVisitaCampoFormErrors,
  NewVisitaCampoFormValues
} from "../../types";
import type { VisitPhenologicalStage } from "../../types/visita-campo.types";
import type {
  CampaniaCatalogItem,
  CatalogSelectOption,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  SubEtapaCatalogItem,
  VariedadCatalogItem
} from "../../types";
import { getSubEtapaImageSource } from "../../utils/sub-etapa-images";
import {
  formatEditable12HourInput,
  isComplete12HourInput,
  type TimePeriod
} from "../../domain/time-input";
import { validateRequiredPhenologicalStage } from "../../domain/required-phenological-stage";
import {
  buildStepOneTutorialSteps,
  findFirstPendingTutorialStep,
  findNextPendingTutorialStep,
  getAreaHectaresIssue,
  getPlantsCountIssue,
  getSowingDateIssue,
  mergeStepOneFormValues,
  takePreviousTutorialStep,
  type StepOneTutorialFieldId
} from "../../domain/step-one-tutorial";
import { GuidedFormTutorial } from "../components/guided-form-tutorial";
import { Time12HourInput } from "../components/time-12-hour-input";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

type ActiveVisitaField = "crop" | "variety" | "phenologicalStage" | "sowingDate" | "subStage";
type AdditionalStageRow = {
  key: string;
  phenologicalStageId: string;
  subEtapaId: string;
  coveragePercentage: string;
  laborProgressPercentage: string;
};
type DefaultLockedFields = {
  plantsCount: boolean;
  areaHectares: boolean;
  sowingDate: boolean;
};
type VisitDataFormDraft = {
  values: NewVisitaCampoFormValues;
  additionalStages?: AdditionalStageRow[];
  defaultLockedFields: DefaultLockedFields;
  startVisitTimeInput: string;
  startVisitTimePeriod: TimePeriod;
};
type WizardStep = {
  index: number;
  title: string;
  routeLabel: string;
};

const WIZARD_STEPS: WizardStep[] = [
  { index: 1, title: "Datos basicos y etapas fenologicas", routeLabel: "Datos" },
  { index: 2, title: "Plagas", routeLabel: "Plagas" },
  { index: 3, title: "Enfermedades", routeLabel: "Enfermedades" },
  { index: 4, title: "Nutricion", routeLabel: "Nutricion" },
  { index: 5, title: "Riego", routeLabel: "Riego" },
  { index: 6, title: "Labores culturales", routeLabel: "Labores" }
];

const CURRENT_STEP = 1;

export function NewVisitaCampoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuthSession();
  const params = useLocalSearchParams<{
    id?: string | string[];
    parcelaCode?: string | string[];
    parcelaName?: string | string[];
    parcelaAreaHectares?: string | string[];
    visitaId?: string | string[];
  }>();

  const today = useMemo(() => formatDateForApi(new Date()), []);
  const parcelaId = toSingleParam(params.id);
  const existingVisitaId = toSingleParam(params.visitaId);
  const isEditingVisita = !!existingVisitaId;
  const parcelaCode = toSingleParam(params.parcelaCode);
  const parcelaName = toSingleParam(params.parcelaName);
  const parcelaAreaHectares = toSingleParam(params.parcelaAreaHectares) ?? "";
  const parcelaLabel = [parcelaCode, parcelaName].filter(Boolean).join(" - ");
  const isTwoColumnLayout = width >= 620;
  const isCompactProgress = width < 540;
  const [activeCatalog, setActiveCatalog] = useState<ActiveVisitaField | null>(null);

  const [cultivos, setCultivos] = useState<CultivoCatalogItem[]>([]);
  const [isLoadingCultivos, setIsLoadingCultivos] = useState(true);
  const [cultivosError, setCultivosError] = useState<string | null>(null);
  const [previousSelectionNotice, setPreviousSelectionNotice] = useState<string | null>(
    null
  );
  const previousDefaultsAppliedRef = useRef<string | null>(null);

  const [variedades, setVariedades] = useState<VariedadCatalogItem[]>([]);
  const [isLoadingVariedades, setIsLoadingVariedades] = useState(false);
  const [variedadesError, setVariedadesError] = useState<string | null>(null);

  const [campanias, setCampanias] = useState<CampaniaCatalogItem[]>([]);
  const [isLoadingCampanias, setIsLoadingCampanias] = useState(false);
  const [campaniasError, setCampaniasError] = useState<string | null>(null);

  const [etapasFenologicas, setEtapasFenologicas] = useState<
    EtapaFenologicaCatalogItem[]
  >([]);
  const [isLoadingEtapasFenologicas, setIsLoadingEtapasFenologicas] = useState(false);
  const [etapasFenologicasError, setEtapasFenologicasError] = useState<string | null>(
    null
  );
  const [subEtapas, setSubEtapas] = useState<SubEtapaCatalogItem[]>([]);
  const [isLoadingSubEtapas, setIsLoadingSubEtapas] = useState(false);
  const [subEtapasError, setSubEtapasError] = useState<string | null>(null);
  const [selectedSubEtapaInfo, setSelectedSubEtapaInfo] =
    useState<SubEtapaCatalogItem | null>(null);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);
  const [additionalStages, setAdditionalStages] = useState<AdditionalStageRow[]>([]);

  const [values, setValues] = useState<NewVisitaCampoFormValues>(() => ({
    crop: "",
    variety: "",
    parcelaId: parcelaId ?? "",
    parcelaLabel: parcelaLabel || parcelaId || "",
    campaign: "",
    plantsCount: "",
    areaHectares: parcelaAreaHectares,
    sowingDate: "",
    visitDate: today,
    startVisitTime: "",
    phenologicalStage: "",
    subEtapaId: "",
    subEtapaPercentage: "",
    coveragePercentage: "100",
    generalObservation: ""
  }));
  const [defaultLockedFields, setDefaultLockedFields] = useState<DefaultLockedFields>({
    plantsCount: false,
    areaHectares: parcelaAreaHectares.length > 0,
    sowingDate: false
  });
  const [startVisitTimeInput, setStartVisitTimeInput] = useState("");
  const [startVisitTimePeriod, setStartVisitTimePeriod] = useState<TimePeriod>("AM");
  const [errors, setErrors] = useState<NewVisitaCampoFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stageDistributionError, setStageDistributionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const tutorialScrollRef = useRef<ScrollView>(null);
  const tutorialTargets = useRef<Partial<Record<StepOneTutorialFieldId, View | null>>>(
    {}
  );
  const [tutorialScrollY, setTutorialScrollY] = useState(0);
  const [tutorialStepId, setTutorialStepId] = useState<StepOneTutorialFieldId | null>(
    null
  );
  const [tutorialHistory, setTutorialHistory] = useState<StepOneTutorialFieldId[]>([]);
  const [tutorialNotice, setTutorialNotice] = useState<string | null>(null);
  const draftIdentity = useMemo<VisitFormDraftIdentity | null>(() => {
    const ownerUserId = session.user?.publicId;
    const scopeKey = existingVisitaId
      ? buildVisitDraftScopeKey(existingVisitaId)
      : parcelaId
        ? buildNewVisitDraftScopeKey(parcelaId)
        : null;

    return ownerUserId && scopeKey ? { ownerUserId, scopeKey, moduleKey: "datos" } : null;
  }, [existingVisitaId, parcelaId, session.user?.publicId]);
  const draftValue = useMemo<VisitDataFormDraft>(
    () => ({
      values,
      additionalStages,
      defaultLockedFields,
      startVisitTimeInput,
      startVisitTimePeriod
    }),
    [additionalStages, defaultLockedFields, startVisitTimeInput, startVisitTimePeriod, values]
  );
  const { clearDraft } = useVisitFormDraft({
    enabled: isDraftReady,
    identity: draftIdentity,
    value: draftValue
  });

  useEffect(() => {
    void loadCultivos();
  }, []);

  useEffect(() => {
    if (!draftIdentity || existingVisitaId) {
      return;
    }

    const draft = readVisitFormDraft<VisitDataFormDraft>(draftIdentity);
    if (draft) {
      setAdditionalStages(draft.additionalStages ?? []);
      setValues((currentValues) =>
        mergeStepOneFormValues(currentValues, draft.values, {
          parcelaId: currentValues.parcelaId,
          parcelaLabel: currentValues.parcelaLabel
        })
      );
      setDefaultLockedFields((current) => ({
        ...current,
        ...(draft.defaultLockedFields ?? {})
      }));
      setStartVisitTimeInput(draft.startVisitTimeInput ?? "");
      setStartVisitTimePeriod(draft.startVisitTimePeriod ?? "AM");
    }
    setIsDraftReady(true);
  }, [draftIdentity, existingVisitaId]);

  useEffect(() => {
    if (isEditingVisita || !isDraftReady || isLoadingCultivos) {
      return;
    }

    if (!values.parcelaId) {
      return;
    }

    const defaults = visitasCampoService.getLastVisitDefaultsByParcelaId(
      values.parcelaId
    );

    if (!defaults) {
      previousDefaultsAppliedRef.current = values.parcelaId;
      return;
    }

    if (previousDefaultsAppliedRef.current === values.parcelaId) {
      return;
    }
    previousDefaultsAppliedRef.current = values.parcelaId;

    const previousCropAvailable = cultivos.some(
      (cultivo) => cultivo.id === defaults.cropId
    );
    const shouldPrefillCrop = !values.crop && previousCropAvailable;
    const shouldPrefillVariety = !values.variety && shouldPrefillCrop;
    setPreviousSelectionNotice(
      shouldPrefillCrop || shouldPrefillVariety
        ? "Cultivo y variedad precargados desde la visita anterior. Puedes cambiarlos."
        : previousCropAvailable
          ? null
          : "El cultivo de la visita anterior ya no esta disponible. Selecciona uno para continuar."
    );

    setValues((currentValues) => {
      const nextPlantsCount =
        currentValues.plantsCount ||
        (defaults.plantsCount === null || defaults.plantsCount === undefined
          ? ""
          : String(defaults.plantsCount));
      const nextSowingDate = currentValues.sowingDate || defaults.sowingDate || "";
      const nextAreaHectares = currentValues.areaHectares || defaults.areaHectares || "";
      const nextCrop =
        currentValues.crop || (previousCropAvailable ? defaults.cropId : "");
      const nextVariety =
        currentValues.variety || (previousCropAvailable ? defaults.varietyId : "");

      setDefaultLockedFields({
        plantsCount: !currentValues.plantsCount && nextPlantsCount.length > 0,
        areaHectares: !currentValues.areaHectares && nextAreaHectares.length > 0,
        sowingDate: !currentValues.sowingDate && nextSowingDate.length > 0
      });

      return {
        ...currentValues,
        crop: nextCrop,
        variety: nextVariety,
        plantsCount: nextPlantsCount,
        sowingDate: nextSowingDate,
        areaHectares: nextAreaHectares
      };
    });
  }, [cultivos, isDraftReady, isEditingVisita, isLoadingCultivos, values.parcelaId]);

  useEffect(() => {
    if (!existingVisitaId) {
      return;
    }

    let isActive = true;

    setSubmitError(null);

    void (async () => {
      try {
        const visita = await visitasCampoService.getById(existingVisitaId);

        if (!isActive) {
          return;
        }

        const baseValues: NewVisitaCampoFormValues = {
          crop: visita.cropId,
          variety: visita.varietyId,
          parcelaId: visita.parcelaId,
          parcelaLabel: visita.parcelaId,
          campaign: visita.campaignId,
          plantsCount:
            visita.plantsCount === null || visita.plantsCount === undefined
              ? ""
              : String(visita.plantsCount),
          areaHectares: visita.areaHectares ?? "",
          sowingDate: visita.sowingDate ?? "",
          visitDate: visita.visitDate,
          startVisitTime: visita.startVisitTime,
          phenologicalStage: visita.phenologicalStages[0]?.phenologicalStageId ?? visita.phenologicalStageId ?? "",
          subEtapaId: visita.phenologicalStages[0]?.subEtapaId ?? visita.subEtapaId ?? "",
          subEtapaPercentage:
            (visita.phenologicalStages.length
              ? visita.phenologicalStages[0]?.laborProgressPercentage
              : visita.subEtapaPercentage) == null
              ? ""
              : String(visita.phenologicalStages.length
                  ? visita.phenologicalStages[0]?.laborProgressPercentage
                  : visita.subEtapaPercentage),
          coveragePercentage: String(visita.phenologicalStages[0]?.coveragePercentage ?? 100),
          generalObservation: visita.generalObservation ?? ""
        };
        const draft = draftIdentity
          ? readVisitFormDraft<VisitDataFormDraft>(draftIdentity)
          : null;
        setValues(mergeStepOneFormValues(baseValues, draft?.values));
        setAdditionalStages(draft?.additionalStages ?? visita.phenologicalStages.slice(1).map((entry) => ({
          key: `${entry.phenologicalStageId}-${Math.random()}`,
          phenologicalStageId: entry.phenologicalStageId,
          subEtapaId: entry.subEtapaId ?? "",
          coveragePercentage: entry.coveragePercentage === null ? "" : String(entry.coveragePercentage),
          laborProgressPercentage: entry.laborProgressPercentage === null ? "" : String(entry.laborProgressPercentage)
        })));
        if (draft) {
          setDefaultLockedFields((current) => ({
            ...current,
            ...(draft.defaultLockedFields ?? {})
          }));
          setStartVisitTimeInput(draft.startVisitTimeInput ?? "");
          setStartVisitTimePeriod(draft.startVisitTimePeriod ?? "AM");
        } else {
          syncStartTimeInputFromApi(visita.startVisitTime);
        }
        setIsDraftReady(true);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const apiError = toApiError(error);
        setSubmitError(apiError.message || "No se pudo cargar la visita a editar.");
      }
    })();

    return () => {
      isActive = false;
    };
  }, [draftIdentity, existingVisitaId]);

  useEffect(() => {
    if (!values.crop) {
      setVariedades([]);
      setCampanias([]);
      setEtapasFenologicas([]);
      setSubEtapas([]);
      setVariedadesError(null);
      setCampaniasError(null);
      setEtapasFenologicasError(null);
      setSubEtapasError(null);
      updateField("campaign", "");
      return;
    }

    void loadDependentCatalogs(values.crop);
  }, [values.crop]);

  const selectedEtapaFenologica = useMemo(
    () =>
      etapasFenologicas.find((etapa) => etapa.id === values.phenologicalStage) ?? null,
    [etapasFenologicas, values.phenologicalStage]
  );

  useEffect(() => {
    if (!selectedEtapaFenologica) {
      setSubEtapas([]);
      setSubEtapasError(null);
      return;
    }

    if (selectedEtapaFenologica.type === "Etapa") {
      void loadSubEtapas(selectedEtapaFenologica.id);
      return;
    }

    setSubEtapas([]);
    setSubEtapasError(null);
    setValues((currentValues) => ({
      ...currentValues,
      subEtapaId: "",
      coveragePercentage: "",
      subEtapaPercentage: isPendingLabor(selectedEtapaFenologica)
        ? ""
        : currentValues.subEtapaPercentage || "0"
    }));
  }, [selectedEtapaFenologica?.id, selectedEtapaFenologica?.type]);

  const cultivoOptions = useMemo(
    () =>
      cultivos.map((cultivo) => ({
        value: cultivo.id,
        label: cultivo.name,
        helper: cultivo.code
      })),
    [cultivos]
  );

  const variedadOptions = useMemo(
    () =>
      variedades.map((variedad) => ({
        value: variedad.id,
        label: variedad.name,
        helper: variedad.code
      })),
    [variedades]
  );

  const etapaFenologicaOptions = useMemo(
    () =>
      etapasFenologicas.map((etapa) => ({
        value: etapa.id,
        label: etapa.name
      })),
    [etapasFenologicas]
  );

  const selectedCampania = useMemo(
    () => campanias.find((campania) => campania.id === values.campaign),
    [campanias, values.campaign]
  );

  const subEtapaProgress = values.subEtapaPercentage.trim()
    ? Number(values.subEtapaPercentage)
    : 0;
  const shouldShowSubEtapas =
    selectedEtapaFenologica?.type === "Etapa";
  const shouldShowLaborProgress =
    selectedEtapaFenologica?.type === "Labor" && !isPendingLabor(selectedEtapaFenologica);
  const coverageTotal =
    (Number(values.coveragePercentage) || 0) +
    additionalStages.reduce((total, row) => total + (Number(row.coveragePercentage) || 0), 0);
  const primaryStageId = buildStageEntries(values, additionalStages, etapasFenologicas)
    .reduce((best, entry) => (entry.coveragePercentage ?? -1) >
      (best.coveragePercentage ?? -1) ? entry : best).phenologicalStageId;
  const tutorialSteps = useMemo(
    () =>
      buildStepOneTutorialSteps({
        values,
        today,
        activeCatalog: activeCatalog === "subStage" ? null : activeCatalog,
        isLoadingCultivos,
        isLoadingVariedades,
        isLoadingEtapasFenologicas,
        isLoadingProgress: shouldShowSubEtapas && isLoadingSubEtapas,
        showProgress: shouldShowSubEtapas || shouldShowLaborProgress,
        requireSubStage: shouldShowSubEtapas
      }),
    [
      activeCatalog,
      isLoadingCultivos,
      isLoadingEtapasFenologicas,
      isLoadingSubEtapas,
      isLoadingVariedades,
      shouldShowLaborProgress,
      shouldShowSubEtapas,
      today,
      values
    ]
  );
  const currentTutorialStep = tutorialStepId
    ? (tutorialSteps.find((step) => step.id === tutorialStepId) ?? null)
    : null;

  useEffect(() => {
    if (!tutorialStepId || currentTutorialStep) {
      return;
    }

    const fallbackStep = findFirstPendingTutorialStep(tutorialSteps);
    if (fallbackStep) {
      setTutorialStepId(fallbackStep.id);
      return;
    }

    setTutorialStepId(null);
    setTutorialHistory([]);
    setTutorialNotice(
      "Tutorial terminado. Revisa los datos y pulsa Continuar cuando estes listo."
    );
  }, [currentTutorialStep, tutorialStepId, tutorialSteps]);

  if (!session.accessToken) {
    return (
      <ScreenContainer contentStyle={styles.authContainer}>
        <StatusBar style="light" />
        <AppCard>
          <AppText variant="heading">Registrar visita</AppText>
          <AppText variant="muted">
            Necesitas iniciar sesion para registrar una visita de campo.
          </AppText>
          <View style={styles.authActions}>
            <AppButton label="Iniciar sesion" onPress={() => router.replace("/login")} />
            <AppButton label="Volver" onPress={() => router.back()} variant="outline" />
          </View>
        </AppCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar backgroundColor="#064b31" style="light" />
      <SafeAreaView edges={["top"]} style={styles.safeTop}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons color="#ffffff" name="arrow-back" size={27} />
          </Pressable>
          <AppText style={styles.topBarTitle} variant="title">
            Registro de visita
          </AppText>
          <Pressable
            accessibilityLabel="Iniciar tutorial del formulario"
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={openTutorial}
            style={({ pressed }) => [
              styles.tutorialButton,
              pressed && !isSubmitting && styles.pressed,
              isSubmitting && styles.disabledButton
            ]}
          >
            <Ionicons color="#f4c95d" name="navigate" size={17} />
            <AppText style={styles.tutorialButtonText} variant="label">
              Tutorial
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>

      <FormScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleTutorialScroll}
        ref={tutorialScrollRef}
        scrollEnabled={tutorialStepId === null}
        scrollEventThrottle={16}
      >
        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={VISITA_HERO_IMAGE}
          style={styles.hero}
        >
          <View style={styles.heroScrim}>
            <AppText style={styles.heroEyebrow} variant="eyebrow">
              {isEditingVisita ? "Editar visita" : "Nueva visita"}
            </AppText>
            <AppText style={styles.heroTitle} variant="title">
              Datos basicos y etapas fenologicas
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Completa la informacion inicial de la visita y selecciona la etapa del
              cultivo.
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <WizardProgress
            compact={isCompactProgress}
            currentStep={CURRENT_STEP}
            steps={WIZARD_STEPS}
          />

          {tutorialNotice ? (
            <View style={styles.tutorialNotice}>
              <Ionicons color="#1b4332" name="checkmark-circle" size={20} />
              <AppText style={styles.tutorialNoticeText} variant="label">
                {tutorialNotice}
              </AppText>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Datos basicos
              </AppText>
              <AppText style={styles.sectionSubtitle} variant="caption">
                Las campañas y la fecha de visita se completan automaticamente.
              </AppText>
            </View>

            {previousSelectionNotice ? (
              <AppText variant="muted">{previousSelectionNotice}</AppText>
            ) : null}

            <View style={isTwoColumnLayout ? styles.fieldGrid : styles.fieldStack}>
              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.crop = node;
                }}
                style={styles.fieldColumn}
              >
                <AppSelectField
                  disabled={isLoadingCultivos}
                  emptyMessage="No hay cultivos disponibles."
                  error={getCatalogError(cultivosError, errors.crop)}
                  icon="leaf-outline"
                  isLoading={isLoadingCultivos}
                  isOpen={activeCatalog === "crop"}
                  label="Cultivo"
                  onSelect={(value) => handleCatalogSelection("crop", value)}
                  onToggle={() => toggleCatalog("crop")}
                  options={cultivoOptions}
                  placeholder="Selecciona cultivo"
                  selectedLabel={getSelectedLabel(cultivoOptions, values.crop)}
                />
              </View>

              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.variety = node;
                }}
                style={styles.fieldColumn}
              >
                <AppSelectField
                  disabled={!values.crop || isLoadingVariedades}
                  emptyMessage="No hay variedades para el cultivo seleccionado."
                  error={getCatalogError(variedadesError, errors.variety)}
                  icon="flower-outline"
                  isLoading={isLoadingVariedades}
                  isOpen={activeCatalog === "variety"}
                  label="Variedad"
                  onSelect={(value) => handleCatalogSelection("variety", value)}
                  onToggle={() => toggleCatalog("variety")}
                  options={variedadOptions}
                  placeholder={values.crop ? "Selecciona variedad" : "Selecciona cultivo"}
                  selectedLabel={getSelectedLabel(variedadOptions, values.variety)}
                />
              </View>

              <View style={styles.fieldColumn}>
                <ReadonlyField
                  error={getCatalogError(campaniasError, errors.campaign)}
                  helper={
                    isLoadingCampanias
                      ? "Buscando campaña activa..."
                      : "Se asigna segun el cultivo seleccionado"
                  }
                  icon="calendar-outline"
                  label="Campañas"
                  value={
                    selectedCampania?.name ||
                    (values.crop ? "Sin campaña activa" : "Selecciona cultivo")
                  }
                />
              </View>

              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.plantsCount = node;
                }}
                style={styles.fieldColumn}
              >
                <IconTextInput
                  editable={!defaultLockedFields.plantsCount}
                  error={errors.plantsCount}
                  icon="flower-outline"
                  keyboardType="number-pad"
                  label="Numero de plantas *"
                  onEditPress={() => unlockDefaultField("plantsCount")}
                  onChangeText={(value) => updateField("plantsCount", value)}
                  placeholder="Ingresa el numero"
                  value={values.plantsCount}
                />
              </View>

              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.areaHectares = node;
                }}
                style={styles.fieldColumn}
              >
                <IconTextInput
                  editable={!defaultLockedFields.areaHectares}
                  error={errors.areaHectares}
                  icon="resize-outline"
                  keyboardType="decimal-pad"
                  label="Area (ha) *"
                  onEditPress={() => unlockDefaultField("areaHectares")}
                  onChangeText={(value) =>
                    updateField("areaHectares", formatDecimalInput(value))
                  }
                  placeholder="Ingresa el area"
                  value={values.areaHectares}
                />
              </View>

              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.sowingDate = node;
                }}
                style={styles.fieldColumn}
              >
                <DatePickerField
                  allowClear
                  editable={!defaultLockedFields.sowingDate}
                  error={errors.sowingDate}
                  isOpen={activeCatalog === "sowingDate"}
                  label="Fecha de siembra *"
                  maxDate={today}
                  onClear={() => handleDateSelection("sowingDate", "")}
                  onEditPress={() => unlockDefaultField("sowingDate")}
                  onSelect={(value) => handleDateSelection("sowingDate", value)}
                  onToggle={() => toggleCatalog("sowingDate")}
                  placeholder="Selecciona fecha"
                  value={values.sowingDate}
                />
              </View>

              <View style={styles.fieldColumn}>
                <ReadonlyField
                  icon="calendar-outline"
                  label="Fecha de visita"
                  value={formatDisplayDate(values.visitDate) || values.visitDate}
                />
              </View>

              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.startVisitTime = node;
                }}
                style={styles.fieldColumn}
              >
                <Time12HourInput
                  error={errors.startVisitTime}
                  label="Hora de inicio"
                  onChangeText={handleStartTimeInputChange}
                  onEndEditing={handleStartTimeInputEndEditing}
                  onPeriodChange={handleStartTimePeriodChange}
                  period={startVisitTimePeriod}
                  value={startVisitTimeInput}
                />
                <AppText style={styles.fieldHint} variant="caption">
                  Ingresa la hora en formato 12 h
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Etapa fenologica
              </AppText>
              <AppText style={styles.sectionSubtitle} variant="caption">
                Registra qué parte de la parcela corresponde a cada etapa o labor.
              </AppText>
            </View>

            <View
              collapsable={false}
              ref={(node) => {
                tutorialTargets.current.phenologicalStage = node;
              }}
            >
              {values.phenologicalStage === primaryStageId ? (
                <AppText variant="caption">Etapa principal según el mayor porcentaje</AppText>
              ) : null}
              <AppSelectField
                disabled={!values.crop}
                emptyMessage="No hay etapas fenologicas disponibles."
                error={getCatalogError(etapasFenologicasError, errors.phenologicalStage)}
                icon="flower"
                isLoading={isLoadingEtapasFenologicas}
                isOpen={activeCatalog === "phenologicalStage"}
                label="Etapa *"
                onSelect={(value) => handleCatalogSelection("phenologicalStage", value)}
                onToggle={() => toggleCatalog("phenologicalStage")}
                options={etapaFenologicaOptions}
                placeholder={
                  values.crop ? "Selecciona etapa" : "Selecciona primero un cultivo"
                }
                selectedLabel={getSelectedLabel(
                  etapaFenologicaOptions,
                  values.phenologicalStage
                )}
              />
            </View>

            {shouldShowSubEtapas ? (
              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.subEtapaPercentage = node;
                }}
              >
                <AppSelectField
                  disabled={isLoadingSubEtapas || !subEtapas.length}
                  emptyMessage="No hay subetapas para esta etapa."
                  error={getCatalogError(subEtapasError, errors.subEtapaId)}
                  icon="flower-outline"
                  isLoading={isLoadingSubEtapas}
                  isOpen={activeCatalog === "subStage"}
                  label="Subetapa *"
                  onSelect={(value) => { updateField("subEtapaId", value); setActiveCatalog(null); }}
                  onToggle={() => toggleCatalog("subStage")}
                  options={subEtapas.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Selecciona la subetapa"
                  selectedLabel={subEtapas.find((item) => item.id === values.subEtapaId)?.name}
                />
                <SubEtapaReferenceGallery
                  items={subEtapas}
                  selectedId={values.subEtapaId}
                  onSelect={(item) => { updateField("subEtapaId", item.id); setSelectedSubEtapaInfo(item); }}
                />
              </View>
            ) : null}

            {selectedEtapaFenologica ? (
              <View>
                <AppText variant="label">Porcentaje de la parcela *</AppText>
                <View style={styles.percentageInputShell}>
                  <TextInput
                    accessibilityLabel="Porcentaje de la parcela de la primera etapa o labor"
                    keyboardType="number-pad"
                    maxLength={3}
                    onChangeText={(value) => updateField("coveragePercentage", value.replace(/\D/g, ""))}
                    placeholder="100"
                    style={styles.percentageInput}
                    value={values.coveragePercentage}
                  />
                  <AppText style={styles.percentageSymbol} variant="label">%</AppText>
                </View>
                {errors.coveragePercentage ? <AppText style={styles.localErrorText} variant="caption">{errors.coveragePercentage}</AppText> : null}
              </View>
            ) : null}

            {shouldShowLaborProgress ? (
              <View
                collapsable={false}
                ref={(node) => {
                  tutorialTargets.current.subEtapaPercentage = node;
                }}
              >
                <ProgressGuide
                  error={errors.subEtapaPercentage ?? null}
                  isLoading={false}
                  onImagePress={(subEtapa) => setSelectedSubEtapaInfo(subEtapa)}
                  onTrackLayout={(event) =>
                    setSliderTrackWidth(event.nativeEvent.layout.width)
                  }
                  onValueChange={handleSubEtapaProgressChange}
                  onValueCommit={commitSubEtapaProgress}
                  progress={Number.isFinite(subEtapaProgress) ? subEtapaProgress : 0}
                  showMarkers={false}
                  sliderTrackWidth={sliderTrackWidth}
                  subEtapas={[]}
                  subtitle="Ajusta el porcentaje de avance de la labor."
                  title="Avance de labor"
                  valueText={values.subEtapaPercentage}
                />
              </View>
            ) : null}
            {additionalStages.map((row, index) => (
              <AdditionalStageEditor
                key={row.key}
                row={row}
                position={index + 2}
                isPrimary={row.phenologicalStageId === primaryStageId}
                cropSelected={!!values.crop}
                stages={etapasFenologicas}
                disabledStageIds={[values.phenologicalStage, ...additionalStages.filter((other) => other.key !== row.key).map((other) => other.phenologicalStageId)]}
                onChange={(next) => { setAdditionalStages((current) => current.map((item) => item.key === row.key ? next : item)); setStageDistributionError(null); }}
                onRemove={() => { setAdditionalStages((current) => current.filter((item) => item.key !== row.key)); setStageDistributionError(null); }}
                onImagePress={setSelectedSubEtapaInfo}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={!values.crop || additionalStages.length >= 29}
              onPress={() => setAdditionalStages((current) => [...current, {
                key: `${Date.now()}-${current.length}`,
                phenologicalStageId: "", subEtapaId: "", coveragePercentage: "", laborProgressPercentage: ""
              }])}
              style={styles.addStageButton}
            >
              <Ionicons color={theme.colors.primary} name="add-circle-outline" size={21} />
              <AppText variant="label">Agregar otra etapa o labor</AppText>
            </Pressable>
            {selectedEtapaFenologica || additionalStages.some((row) => row.phenologicalStageId) ? (
              <AppText variant="label">Parcela distribuida: {coverageTotal}% de 100%</AppText>
            ) : null}
            {stageDistributionError ? <AppText style={styles.localErrorText} variant="caption">{stageDistributionError}</AppText> : null}
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Observacion general
              </AppText>
              <AppText style={styles.sectionSubtitle} variant="caption">
                Opcional para esta primera etapa del registro.
              </AppText>
            </View>

            <View
              collapsable={false}
              ref={(node) => {
                tutorialTargets.current.generalObservation = node;
              }}
            >
              <TextInput
                multiline
                numberOfLines={4}
                onChangeText={(value) => updateField("generalObservation", value)}
                placeholder="Observaciones generales de la visita"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.observationInput}
                textAlignVertical="top"
                value={values.generalObservation}
              />
            </View>
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
              disabled={isSubmitting}
              onPress={() => {
                void handleSubmit();
              }}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && !isSubmitting && styles.pressed,
                isSubmitting && styles.disabledButton
              ]}
            >
              <Ionicons color="#d8f3dc" name="leaf" size={20} />
              <AppText style={styles.continueButtonText} variant="label">
                {isSubmitting
                  ? "Guardando..."
                  : isEditingVisita
                    ? "Actualizar"
                    : "Continuar"}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backOutlineButton,
                pressed && !isSubmitting && styles.pressed,
                isSubmitting && styles.disabledButton
              ]}
            >
              <AppText style={styles.backOutlineButtonText} variant="label">
                Volver
              </AppText>
            </Pressable>
          </View>
        </View>
      </FormScrollView>

      <SubEtapaInfoModal
        onClose={() => setSelectedSubEtapaInfo(null)}
        subEtapa={selectedSubEtapaInfo}
      />

      {currentTutorialStep ? (
        <GuidedFormTutorial
          canGoBack={tutorialHistory.length > 0}
          currentPosition={
            tutorialSteps.findIndex((step) => step.id === currentTutorialStep.id) + 1
          }
          onBack={goToPreviousTutorialStep}
          onClose={closeTutorial}
          onNext={goToNextTutorialStep}
          refreshKey={[
            currentTutorialStep.id,
            activeCatalog ?? "closed",
            currentTutorialStep.isLoading ? "loading" : "ready",
            width
          ].join(":")}
          scrollRef={tutorialScrollRef}
          scrollY={tutorialScrollY}
          step={currentTutorialStep}
          target={tutorialTargets.current[currentTutorialStep.id] ?? null}
          totalSteps={tutorialSteps.length}
        />
      ) : null}
    </ScreenContainer>
  );

  function updateField<K extends keyof NewVisitaCampoFormValues>(
    field: K,
    value: NewVisitaCampoFormValues[K]
  ) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
    setSubmitError(null);
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
  }

  function unlockDefaultField(field: keyof DefaultLockedFields) {
    setDefaultLockedFields((currentFields) => ({
      ...currentFields,
      [field]: false
    }));
  }

  function handleTutorialScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setTutorialScrollY(event.nativeEvent.contentOffset.y);
  }

  function openTutorial() {
    Keyboard.dismiss();
    setActiveCatalog(null);
    setTutorialNotice(null);
    setTutorialHistory([]);

    const firstPendingStep = findFirstPendingTutorialStep(tutorialSteps);
    if (!firstPendingStep) {
      setTutorialStepId(null);
      setTutorialNotice("Todos los campos del paso 1 ya estan completos.");
      return;
    }

    setTutorialStepId(firstPendingStep.id);
  }

  function closeTutorial() {
    Keyboard.dismiss();
    setActiveCatalog(null);
    setTutorialStepId(null);
    setTutorialHistory([]);
  }

  function goToPreviousTutorialStep() {
    const { previousId, remainingHistory } = takePreviousTutorialStep(tutorialHistory);
    if (!previousId) {
      return;
    }

    Keyboard.dismiss();
    setActiveCatalog(null);
    setTutorialHistory(remainingHistory);
    setTutorialStepId(previousId);
  }

  function goToNextTutorialStep() {
    if (!currentTutorialStep?.isEnabled) {
      return;
    }

    if (!currentTutorialStep.isComplete && !currentTutorialStep.isOptional) {
      return;
    }

    Keyboard.dismiss();
    setActiveCatalog(null);
    const nextStep = findNextPendingTutorialStep(tutorialSteps, currentTutorialStep.id);

    if (!nextStep) {
      setTutorialStepId(null);
      setTutorialHistory([]);
      setTutorialNotice(
        "Tutorial terminado. Revisa los datos y pulsa Continuar cuando estes listo."
      );
      return;
    }

    setTutorialHistory((history) => [...history, currentTutorialStep.id]);
    setTutorialStepId(nextStep.id);
  }

  function syncStartTimeInputFromApi(value: string) {
    const displayValue = formatTimeFor12HourInput(value);
    setStartVisitTimeInput(displayValue.time);
    setStartVisitTimePeriod(displayValue.period);
  }

  function handleStartTimeInputChange(value: string) {
    const nextValue = formatEditable12HourInput(startVisitTimeInput, value);
    setStartVisitTimeInput(nextValue);

    updateField(
      "startVisitTime",
      isComplete12HourInput(nextValue)
        ? normalize12HourTimeForApi(nextValue, startVisitTimePeriod)
        : ""
    );
  }

  function handleStartTimeInputEndEditing() {
    const normalizedValue = normalizeTyped12HourInput(startVisitTimeInput);
    setStartVisitTimeInput(normalizedValue);
    updateField(
      "startVisitTime",
      normalize12HourTimeForApi(normalizedValue, startVisitTimePeriod)
    );
  }

  function handleStartTimePeriodChange(period: TimePeriod) {
    setStartVisitTimePeriod(period);
    updateField("startVisitTime", normalize12HourTimeForApi(startVisitTimeInput, period));
  }

  function toggleCatalog(field: ActiveVisitaField) {
    setActiveCatalog((currentField) => (currentField === field ? null : field));
  }

  function handleCatalogSelection(
    field: "crop" | "variety" | "phenologicalStage",
    value: string
  ) {
    if (field === "crop") {
      setVariedades([]);
      setCampanias([]);
      setEtapasFenologicas([]);
      setSubEtapas([]);
      setErrors((currentErrors) => ({
        ...currentErrors,
        crop: undefined,
        variety: undefined,
        campaign: undefined
      }));
      setValues((currentValues) => ({
        ...currentValues,
        crop: value,
        variety: "",
        campaign: "",
        phenologicalStage: "",
        subEtapaId: "",
        subEtapaPercentage: "",
        coveragePercentage: "100"
      }));
      setAdditionalStages([]);
    } else if (field === "phenologicalStage") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        phenologicalStage: undefined
      }));
      setValues((currentValues) => ({
        ...currentValues,
        phenologicalStage: value,
        subEtapaId: "",
        subEtapaPercentage: "",
        coveragePercentage: "100"
      }));
    } else {
      updateField(field, value);
    }

    setActiveCatalog(null);
  }

  function handleDateSelection(field: "sowingDate", value: string) {
    updateField(field, value);
    setActiveCatalog(null);
  }

  function handleSubEtapaProgressChange(value: number | string) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      subEtapaPercentage: undefined
    }));
    setSubmitError(null);

    const parsedPercentage =
      typeof value === "number"
        ? roundPercentageToStep(value)
        : parsePercentageValue(value);

    if (parsedPercentage === null) {
      setValues((currentValues) => ({
        ...currentValues,
        subEtapaPercentage: ""
      }));
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      subEtapaPercentage: formatPercentageValue(parsedPercentage)
    }));
  }

  function commitSubEtapaProgress(value: number | string) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      subEtapaPercentage: undefined
    }));
    setSubmitError(null);

    const parsedPercentage = parsePercentageValue(value);

    if (parsedPercentage === null) {
      setValues((currentValues) => ({
        ...currentValues,
        subEtapaPercentage: ""
      }));
      return;
    }

    const roundedPercentage = roundPercentageToStep(parsedPercentage);

    setValues((currentValues) => ({
      ...currentValues,
      subEtapaPercentage: formatPercentageValue(roundedPercentage)
    }));
  }

  async function handleSubmit() {
    const normalizedValues = normalizeFormValuesForSubmit(values, subEtapas);
    const nextErrors = validateForm(normalizedValues, today, selectedEtapaFenologica?.type);
    const stageEntries = buildStageEntries(normalizedValues, additionalStages, etapasFenologicas);
    const distributionIssue = validateStageDistribution(stageEntries, etapasFenologicas);

    if (Object.keys(nextErrors).length > 0 || distributionIssue) {
      setErrors(nextErrors);
      setStageDistributionError(distributionIssue);
      setSubmitError("Revisa los campos obligatorios antes de continuar.");
      return;
    }

    if (!session.accessToken) {
      setSubmitError("Tu sesion ya no es valida. Vuelve a iniciar sesion.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setValues(normalizedValues);

    try {
      const location = await captureLocationSilently();
      const draft = buildCreateDraft(normalizedValues, location, stageEntries);
      const targetVisitaId = existingVisitaId ?? null;
      const savedVisita = targetVisitaId
        ? await visitasCampoService.update(targetVisitaId, draft)
        : await visitasCampoService.create(draft, {
            accessToken: session.accessToken,
            tokenType: session.tokenType
          });

      clearDraft();

      router.replace({
        pathname: "/visitas-campo/[id]/observaciones-sanitarias",
        params: {
          id: savedVisita.id
        }
      });
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError.message || "No se pudo guardar la visita de campo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function captureLocationSilently() {
    try {
      const capturedLocation = await captureCurrentDeviceLocation();
      return capturedLocation.point;
    } catch {
      return null;
    }
  }

  async function loadCultivos() {
    setIsLoadingCultivos(true);
    setCultivosError(null);

    try {
      const nextCultivos = await visitaCampoCatalogsService.getCultivos();
      setCultivos(nextCultivos);
    } catch (error) {
      const apiError = toApiError(error);
      setCultivosError(apiError.message || "No se pudo cargar cultivos.");
    } finally {
      setIsLoadingCultivos(false);
    }
  }

  async function loadDependentCatalogs(cultivoId: string) {
    setIsLoadingVariedades(true);
    setIsLoadingCampanias(true);
    setIsLoadingEtapasFenologicas(true);
    setVariedadesError(null);
    setCampaniasError(null);
    setEtapasFenologicasError(null);

    const [variedadesResult, campaniasResult, etapasResult] = await Promise.allSettled([
      visitaCampoCatalogsService.getVariedadesByCultivo(cultivoId),
      visitaCampoCatalogsService.getCampaniasByCultivo(cultivoId),
      visitaCampoCatalogsService.getEtapasFenologicasByCultivo(cultivoId)
    ]);

    if (variedadesResult.status === "fulfilled") {
      setVariedades(variedadesResult.value);
      setValues((currentValues) => {
        const isSelectedVarietyAvailable = variedadesResult.value.some(
          (variedad) => variedad.id === currentValues.variety
        );
        if (currentValues.variety && !isSelectedVarietyAvailable) {
          setPreviousSelectionNotice(
            "La variedad de la visita anterior ya no esta disponible. Selecciona una para continuar."
          );
        }
        return {
          ...currentValues,
          variety: isSelectedVarietyAvailable ? currentValues.variety : ""
        };
      });
    } else {
      setVariedades([]);
      setVariedadesError(
        toApiError(variedadesResult.reason).message || "No se pudo cargar variedades."
      );
    }

    if (campaniasResult.status === "fulfilled") {
      setCampanias(campaniasResult.value);
      const selectedCampaign = campaniasResult.value.find(
        (campania) => campania.id === values.campaign
      );
      updateField("campaign", selectedCampaign?.id ?? campaniasResult.value[0]?.id ?? "");

      if (campaniasResult.value.length === 0) {
        setCampaniasError("No hay campaña activa para el cultivo seleccionado.");
      }
    } else {
      setCampanias([]);
      updateField("campaign", "");
      setCampaniasError(
        toApiError(campaniasResult.reason).message || "No se pudo cargar campañas."
      );
    }

    if (etapasResult.status === "fulfilled") {
      setEtapasFenologicas(etapasResult.value);
    } else {
      setEtapasFenologicas([]);
      setEtapasFenologicasError(
        toApiError(etapasResult.reason).message || "No se pudo cargar etapas fenologicas."
      );
    }

    setIsLoadingVariedades(false);
    setIsLoadingCampanias(false);
    setIsLoadingEtapasFenologicas(false);
  }

  async function loadSubEtapas(etapaFenologicaId: string) {
    setIsLoadingSubEtapas(true);
    setSubEtapasError(null);

    try {
      const nextSubEtapas =
        await visitaCampoCatalogsService.getSubEtapasByEtapaFenologica(etapaFenologicaId);

      setSubEtapas(nextSubEtapas);
    } catch (error) {
      setSubEtapas([]);
      setSubEtapasError(toApiError(error).message || "No se pudo cargar sub etapas.");
    } finally {
      setIsLoadingSubEtapas(false);
    }
  }
}

type WizardProgressProps = {
  compact: boolean;
  currentStep: number;
  steps: WizardStep[];
};

function WizardProgress({ compact, currentStep, steps }: WizardProgressProps) {
  const activeStep = steps.find((step) => step.index === currentStep) ?? steps[0];

  return (
    <View style={[styles.progressCard, compact && styles.progressCardCompact]}>
      <View style={[styles.progressCopy, compact && styles.progressCopyCompact]}>
        <AppText style={styles.progressStepText} variant="label">
          Paso
        </AppText>
        <AppText style={styles.progressTitle} variant="body">
          {activeStep.title}
        </AppText>
      </View>

      <View style={styles.progressTrack}>
        {steps.map((step, index) => {
          const isActive = step.index === currentStep;
          const isComplete = step.index < currentStep;

          return (
            <View key={step.index} style={styles.progressStepItem}>
              {index > 0 ? (
                <View
                  style={[
                    styles.progressConnector,
                    isComplete && styles.progressConnectorActive
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.progressNode,
                  (isActive || isComplete) && styles.progressNodeActive
                ]}
              >
                <AppText
                  style={[
                    styles.progressNodeText,
                    (isActive || isComplete) && styles.progressNodeTextActive
                  ]}
                  variant="label"
                >
                  {step.index}
                </AppText>
              </View>
              {isActive ? <View style={styles.progressActiveDot} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AdditionalStageEditor({ row, position, isPrimary, cropSelected, stages, disabledStageIds, onChange, onRemove, onImagePress }: {
  row: AdditionalStageRow;
  position: number;
  isPrimary: boolean;
  cropSelected: boolean;
  stages: EtapaFenologicaCatalogItem[];
  disabledStageIds: string[];
  onChange: (value: AdditionalStageRow) => void;
  onRemove: () => void;
  onImagePress: (item: SubEtapaCatalogItem) => void;
}) {
  const [openField, setOpenField] = useState<"stage" | "subStage" | null>(null);
  const [subStages, setSubStages] = useState<SubEtapaCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedStage = stages.find((stage) => stage.id === row.phenologicalStageId);

  useEffect(() => {
    if (selectedStage?.type !== "Etapa") {
      setSubStages([]);
      return;
    }
    let active = true;
    setLoading(true);
    void visitaCampoCatalogsService.getSubEtapasByEtapaFenologica(selectedStage.id)
      .then((items) => { if (active) setSubStages(items); })
      .catch(() => { if (active) setSubStages([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedStage?.id, selectedStage?.type]);

  return (
    <View style={styles.additionalStageCard}>
      <View style={styles.sectionHeader}>
        <AppText variant="label">Etapa o labor {position}{isPrimary ? " · Principal" : ""}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar etapa o labor ${position}`}
          onPress={onRemove}
          style={styles.removeStageButton}
        >
          <Ionicons color={theme.colors.error} name="trash-outline" size={20} />
          <AppText style={styles.removeStageButtonText} variant="label">Quitar</AppText>
        </Pressable>
      </View>
      <AppSelectField
        disabled={!cropSelected}
        emptyMessage="No quedan etapas o labores disponibles."
        icon="flower-outline"
        isOpen={openField === "stage"}
        label="Etapa o labor *"
        onSelect={(value) => {
          onChange({ ...row, phenologicalStageId: value, subEtapaId: "", coveragePercentage: "", laborProgressPercentage: "" });
          setOpenField(null);
        }}
        onToggle={() => setOpenField((current) => current === "stage" ? null : "stage")}
        options={stages.filter((stage) => !disabledStageIds.includes(stage.id) || stage.id === row.phenologicalStageId)
          .map((stage) => ({ value: stage.id, label: stage.name }))}
        placeholder="Selecciona otra etapa o labor"
        selectedLabel={selectedStage?.name ?? ""}
      />
      {selectedStage?.type === "Etapa" ? (
        <>
          <AppSelectField
            disabled={loading || !subStages.length}
            emptyMessage="No hay subetapas para esta etapa."
            icon="flower-outline"
            isLoading={loading}
            isOpen={openField === "subStage"}
            label="Subetapa *"
            onSelect={(value) => { onChange({ ...row, subEtapaId: value }); setOpenField(null); }}
            onToggle={() => setOpenField((current) => current === "subStage" ? null : "subStage")}
            options={subStages.map((item) => ({ value: item.id, label: item.name }))}
            placeholder="Selecciona la subetapa"
            selectedLabel={subStages.find((item) => item.id === row.subEtapaId)?.name ?? ""}
          />
          <SubEtapaReferenceGallery
            items={subStages}
            selectedId={row.subEtapaId}
            onSelect={(item) => { onChange({ ...row, subEtapaId: item.id }); onImagePress(item); }}
          />
        </>
      ) : null}
      {selectedStage ? (
        <View>
          <AppText variant="label">Porcentaje de la parcela *</AppText>
          <View style={styles.percentageInputShell}>
            <TextInput
              accessibilityLabel={`Porcentaje de la parcela de la etapa o labor ${position}`}
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={(value) => onChange({ ...row, coveragePercentage: value.replace(/\D/g, "") })}
              placeholder="0"
              style={styles.percentageInput}
              value={row.coveragePercentage}
            />
            <AppText style={styles.percentageSymbol} variant="label">%</AppText>
          </View>
        </View>
      ) : null}
      {selectedStage?.type === "Labor" && !isPendingLabor(selectedStage) ? (
        <>
          <AppText variant="label">Avance de labor</AppText>
          <View style={styles.percentageInputShell}>
            <TextInput
              accessibilityLabel={`Avance de labor ${position}`}
              keyboardType="number-pad"
              maxLength={3}
              onChangeText={(value) => onChange({ ...row, laborProgressPercentage: value.replace(/\D/g, "") })}
              placeholder="0"
              style={styles.percentageInput}
              value={row.laborProgressPercentage}
            />
            <AppText style={styles.percentageSymbol} variant="label">%</AppText>
          </View>
        </>
      ) : null}
    </View>
  );
}

function SubEtapaReferenceGallery({ items, selectedId, onSelect }: {
  items: SubEtapaCatalogItem[];
  selectedId: string;
  onSelect: (item: SubEtapaCatalogItem) => void;
}) {
  if (!items.length) return null;
  return (
    <View style={styles.subEtapaGallery}>
      <AppText variant="label">Imágenes de referencia de subetapas</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {items.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver imagen de ${item.name}`}
            key={item.id}
            onPress={() => onSelect(item)}
            style={[styles.subEtapaGalleryItem, item.id === selectedId && styles.subEtapaGalleryItemSelected]}
          >
            <Image source={getSubEtapaImageSource(item.name)} style={styles.subEtapaGalleryImage} />
            <AppText numberOfLines={2} style={styles.subEtapaGalleryLabel} variant="caption">{item.name}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

type ProgressGuideProps = {
  subEtapas: SubEtapaCatalogItem[];
  progress: number;
  valueText: string;
  sliderTrackWidth: number;
  isLoading: boolean;
  error: string | null;
  title: string;
  subtitle: string;
  showMarkers: boolean;
  onTrackLayout: (event: LayoutChangeEvent) => void;
  onValueChange: (value: number | string) => void;
  onValueCommit: (value: number | string) => void;
  onImagePress: (subEtapa: SubEtapaCatalogItem) => void;
};

function ProgressGuide({
  subEtapas,
  progress,
  valueText,
  sliderTrackWidth,
  isLoading,
  error,
  title,
  subtitle,
  showMarkers,
  onTrackLayout,
  onValueChange,
  onValueCommit,
  onImagePress
}: ProgressGuideProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateProgressFromTouch(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateProgressFromTouch(event.nativeEvent.locationX);
        }
      }),
    [onValueChange, sliderTrackWidth]
  );

  const markerSize = sliderTrackWidth < 320 ? 48 : 58;
  const markerImageSize = markerSize - 8;
  const clampedProgress = clampNumber(progress, 0, 100);
  const thumbLeft =
    sliderTrackWidth > 0 ? (clampedProgress / 100) * sliderTrackWidth - 13 : 0;

  return (
    <View style={styles.subEtapasPanel}>
      <View style={styles.subEtapasHeader}>
        <View style={styles.subEtapasHeaderCopy}>
          <AppText style={styles.subEtapasTitle} variant="label">
            {title}
          </AppText>
          <AppText style={styles.subEtapasSubtitle} variant="caption">
            {subtitle}
          </AppText>
        </View>
        <View style={styles.percentageInputShell}>
          <TextInput
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={onValueChange}
            onEndEditing={() => onValueCommit(valueText)}
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.percentageInput}
            value={valueText}
          />
          <AppText style={styles.percentageSymbol} variant="label">
            %
          </AppText>
        </View>
      </View>

      {isLoading ? (
        <AppText style={styles.fieldHint} variant="caption">
          Cargando sub etapas...
        </AppText>
      ) : null}

      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}

      {!isLoading && !error && (subEtapas.length > 0 || !showMarkers) ? (
        <View style={styles.sliderArea}>
          <View
            onLayout={onTrackLayout}
            style={styles.sliderTrack}
            {...panResponder.panHandlers}
          >
            <View style={[styles.sliderTrackFill, { width: `${clampedProgress}%` }]} />
            <View
              style={[
                styles.sliderThumb,
                {
                  left: clampNumber(thumbLeft, 0, Math.max(0, sliderTrackWidth - 26))
                }
              ]}
            />
            {showMarkers
              ? subEtapas.map((subEtapa) => {
                  const percentage = subEtapa.percentage ?? 0;
                  const markerLeft =
                    sliderTrackWidth > 0
                      ? (clampNumber(percentage, 0, 100) / 100) * sliderTrackWidth -
                        markerSize / 2
                      : 0;

                  return (
                    <Pressable
                      accessibilityLabel={`Ver sub etapa ${subEtapa.name}`}
                      accessibilityRole="button"
                      key={subEtapa.id}
                      onPress={() => onImagePress(subEtapa)}
                      style={({ pressed }) => [
                        styles.subEtapaMarker,
                        {
                          width: markerSize,
                          left: clampNumber(
                            markerLeft,
                            0,
                            Math.max(0, sliderTrackWidth - markerSize)
                          )
                        },
                        pressed && styles.pressed
                      ]}
                    >
                      <Image
                        source={getSubEtapaImageSource(subEtapa.name)}
                        style={[
                          styles.subEtapaMarkerImage,
                          {
                            width: markerImageSize,
                            height: markerImageSize
                          }
                        ]}
                      />
                      <AppText
                        numberOfLines={1}
                        style={styles.subEtapaMarkerPercent}
                        variant="caption"
                      >
                        {formatPercentageValue(percentage)}%
                      </AppText>
                    </Pressable>
                  );
                })
              : null}
          </View>
          <View style={styles.sliderFooter}>
            <AppText style={styles.sliderBoundText} variant="caption">
              0%
            </AppText>
            <AppText style={styles.sliderBoundText} variant="caption">
              100%
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );

  function updateProgressFromTouch(locationX: number) {
    if (sliderTrackWidth <= 0) {
      return;
    }

    const rawValue =
      (clampNumber(locationX, 0, sliderTrackWidth) / sliderTrackWidth) * 100;
    onValueChange(Math.round(rawValue / 5) * 5);
  }
}

function SubEtapaInfoModal({
  subEtapa,
  onClose
}: {
  subEtapa: SubEtapaCatalogItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={subEtapa !== null}
    >
      <View style={styles.modalScrim}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.subEtapaModalCard}>
          {subEtapa ? (
            <>
              <Image
                resizeMode="contain"
                source={getSubEtapaImageSource(subEtapa.name)}
                style={styles.subEtapaModalImage}
              />
              <AppText style={styles.subEtapaModalTitle} variant="heading">
                {subEtapa.name}
              </AppText>
              <AppText style={styles.subEtapaModalPercent} variant="label">
                {subEtapa.percentage === null
                  ? "Sin porcentaje"
                  : `${formatPercentageValue(subEtapa.percentage)}%`}
              </AppText>
              <AppText style={styles.subEtapaModalDescription} variant="body">
                {subEtapa.description || "Sin descripcion registrada."}
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.pressed
                ]}
              >
                <AppText style={styles.modalCloseButtonText} variant="label">
                  Cerrar
                </AppText>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type ReadonlyFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  helper?: string;
  error?: string | null;
};

function ReadonlyField({ icon, label, value, helper, error }: ReadonlyFieldProps) {
  return (
    <View style={styles.localFieldWrapper}>
      <AppText style={styles.localFieldLabel} variant="label">
        {label}
      </AppText>
      <View style={[styles.readonlyTrigger, error && styles.localFieldError]}>
        <View style={styles.localFieldIcon}>
          <Ionicons color="#064b31" name={icon} size={22} />
        </View>
        <AppText
          style={[
            styles.readonlyValue,
            value.startsWith("Sin") && styles.placeholderValue
          ]}
          variant="body"
        >
          {value}
        </AppText>
      </View>
      {helper ? (
        <AppText style={styles.fieldHint} variant="caption">
          {helper}
        </AppText>
      ) : null}
      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type IconTextInputProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder: string;
  editable?: boolean;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  error?: string | null;
  onChangeText: (value: string) => void;
  onEditPress?: () => void;
  onEndEditing?: () => void;
};

function IconTextInput({
  icon,
  label,
  value,
  placeholder,
  editable = true,
  keyboardType = "default",
  error,
  onChangeText,
  onEditPress,
  onEndEditing
}: IconTextInputProps) {
  return (
    <View style={styles.localFieldWrapper}>
      <AppText style={styles.localFieldLabel} variant="label">
        {label}
      </AppText>
      <View
        style={[
          styles.inputFrame,
          !editable && styles.inputFrameReadonly,
          error && styles.localFieldError
        ]}
      >
        <View style={styles.localFieldIcon}>
          <Ionicons color="#064b31" name={icon} size={22} />
        </View>
        <TextInput
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.iconInput, !editable && styles.iconInputReadonly]}
          value={value}
        />
        {!editable && onEditPress ? (
          <Pressable
            accessibilityLabel={`Editar ${label}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onEditPress}
            style={({ pressed }) => [styles.editIconButton, pressed && styles.pressed]}
          >
            <Ionicons color="#064b31" name="pencil-outline" size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type InlinePickerFieldProps = {
  label: string;
  placeholder: string;
  valueLabel?: string;
  isOpen: boolean;
  disabled?: boolean;
  error?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  onEditPress?: () => void;
  onToggle: () => void;
  children: ReactNode;
};

type DatePickerFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  isOpen: boolean;
  editable?: boolean;
  error?: string | null;
  allowClear?: boolean;
  maxDate?: string;
  onEditPress?: () => void;
  onToggle: () => void;
  onSelect: (value: string) => void;
  onClear?: () => void;
};

function InlinePickerField({
  label,
  placeholder,
  valueLabel,
  isOpen,
  disabled = false,
  error,
  icon,
  onEditPress,
  onToggle,
  children
}: InlinePickerFieldProps) {
  return (
    <View style={styles.localFieldWrapper}>
      <AppText style={styles.localFieldLabel} variant="label">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        disabled={disabled && !onEditPress}
        onPress={() => {
          if (!disabled) {
            onToggle();
          }
        }}
        style={({ pressed }) => [
          styles.pickerTrigger,
          isOpen && styles.pickerTriggerOpen,
          error && styles.localFieldError,
          disabled && styles.pickerTriggerDisabled,
          pressed && !disabled && styles.pressed
        ]}
      >
        <View style={styles.localFieldIcon}>
          <Ionicons color="#064b31" name={icon} size={22} />
        </View>
        <AppText
          style={[styles.pickerValue, !valueLabel && styles.placeholderValue]}
          variant="body"
        >
          {valueLabel || placeholder}
        </AppText>
        <Ionicons
          color="#064b31"
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={21}
          style={styles.pickerChevron}
        />
        {disabled && onEditPress ? (
          <Pressable
            accessibilityLabel={`Editar ${label}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onEditPress}
            style={({ pressed }) => [styles.editIconButton, pressed && styles.pressed]}
          >
            <Ionicons color="#064b31" name="pencil-outline" size={20} />
          </Pressable>
        ) : null}
      </Pressable>
      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
      {isOpen ? <View style={styles.pickerPanel}>{children}</View> : null}
    </View>
  );
}

function DatePickerField({
  label,
  placeholder,
  value,
  isOpen,
  editable = true,
  error,
  allowClear = false,
  maxDate,
  onEditPress,
  onToggle,
  onSelect,
  onClear
}: DatePickerFieldProps) {
  const [pickerView, setPickerView] = useState<"calendar" | "months" | "years">(
    "calendar"
  );
  const [viewedYear, setViewedYear] = useState(() =>
    (parseDateValue(value) ?? new Date()).getFullYear()
  );
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(parseDateValue(value) ?? new Date())
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultDate = parseDateValue(value) ?? new Date();
    setVisibleMonth(getMonthStart(defaultDate));
    setViewedYear(defaultDate.getFullYear());
    setPickerView("calendar");
  }, [isOpen, value]);

  const calendarWeeks = useMemo(() => buildCalendarWeeks(visibleMonth), [visibleMonth]);

  const yearRange = useMemo(() => buildYearRange(viewedYear), [viewedYear]);

  const handleMonthPress = (monthIndex: number) => {
    setVisibleMonth(new Date(viewedYear, monthIndex, 1));
    setPickerView("calendar");
  };

  const handleYearPress = (year: number) => {
    setViewedYear(year);
    setPickerView("months");
  };

  const renderCalendarHeader = () => (
    <View style={styles.calendarHeader}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
        style={({ pressed }) => [
          styles.calendarNavButton,
          pressed && styles.calendarNavButtonPressed
        ]}
      >
        <Ionicons color="#064b31" name="chevron-back" size={20} />
      </Pressable>
      <Pressable
        onPress={() => setPickerView("months")}
        style={({ pressed }) => [
          styles.calendarMonthPressable,
          pressed && styles.calendarMonthPressablePressed
        ]}
      >
        <AppText style={styles.calendarMonthText} variant="label">
          {formatMonthYear(visibleMonth)}
        </AppText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
        style={({ pressed }) => [
          styles.calendarNavButton,
          pressed && styles.calendarNavButtonPressed
        ]}
      >
        <Ionicons color="#064b31" name="chevron-forward" size={20} />
      </Pressable>
    </View>
  );

  const renderMonthsView = () => (
    <>
      <View style={styles.drillHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setViewedYear((prev) => prev - 1)}
          style={({ pressed }) => [
            styles.calendarNavButton,
            pressed && styles.calendarNavButtonPressed
          ]}
        >
          <Ionicons color="#064b31" name="chevron-back" size={20} />
        </Pressable>
        <Pressable
          onPress={() => setPickerView("years")}
          style={({ pressed }) => [
            styles.drillTitle,
            pressed && styles.calendarMonthPressablePressed
          ]}
        >
          <AppText style={styles.calendarMonthText} variant="label">
            {viewedYear}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setViewedYear((prev) => prev + 1)}
          style={({ pressed }) => [
            styles.calendarNavButton,
            pressed && styles.calendarNavButtonPressed
          ]}
        >
          <Ionicons color="#064b31" name="chevron-forward" size={20} />
        </Pressable>
      </View>
      <View style={styles.monthGrid}>
        {MONTH_LABELS.map((monthLabel, index) => {
          const isCurrent =
            visibleMonth.getMonth() === index &&
            visibleMonth.getFullYear() === viewedYear;

          return (
            <Pressable
              key={monthLabel}
              onPress={() => handleMonthPress(index)}
              style={({ pressed }) => [
                styles.monthCell,
                pressed && styles.calendarDayCellPressed,
                isCurrent && styles.monthCellSelected
              ]}
            >
              <AppText
                style={[styles.monthCellText, isCurrent && styles.monthCellTextSelected]}
                variant="body"
              >
                {monthLabel.substring(0, 3)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderYearsView = () => (
    <>
      <View style={styles.drillHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setViewedYear((prev) => prev - 12)}
          style={({ pressed }) => [
            styles.calendarNavButton,
            pressed && styles.calendarNavButtonPressed
          ]}
        >
          <Ionicons color="#064b31" name="chevron-back" size={20} />
        </Pressable>
        <AppText style={styles.calendarMonthText} variant="label">
          {yearRange[0]} – {yearRange[yearRange.length - 1]}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => setViewedYear((prev) => prev + 12)}
          style={({ pressed }) => [
            styles.calendarNavButton,
            pressed && styles.calendarNavButtonPressed
          ]}
        >
          <Ionicons color="#064b31" name="chevron-forward" size={20} />
        </Pressable>
      </View>
      <View style={styles.yearGrid}>
        {yearRange.map((year) => {
          const isSelected = year === viewedYear;

          return (
            <Pressable
              key={year}
              onPress={() => handleYearPress(year)}
              style={({ pressed }) => [
                styles.yearCell,
                pressed && styles.calendarDayCellPressed,
                isSelected && styles.yearCellSelected
              ]}
            >
              <AppText
                style={[styles.yearCellText, isSelected && styles.yearCellTextSelected]}
                variant="body"
              >
                {year}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  const renderBody = () => {
    if (pickerView === "months") {
      return renderMonthsView();
    }
    if (pickerView === "years") {
      return renderYearsView();
    }

    return (
      <>
        {renderCalendarHeader()}

        <View style={styles.calendarWeekHeader}>
          {DAY_LABELS.map((dayLabel) => (
            <View key={dayLabel} style={styles.calendarDayLabelCell}>
              <AppText style={styles.calendarDayLabelText} variant="caption">
                {dayLabel}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarWeeks.map((week, weekIndex) => (
            <View
              key={`${visibleMonth.toISOString()}-${weekIndex}`}
              style={styles.calendarWeekRow}
            >
              {week.map((day, dayIndex) => {
                const isFutureDay =
                  !!day.value && !!maxDate && compareDateValues(day.value, maxDate) > 0;
                const isDisabled = !day.isCurrentMonth || isFutureDay;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isDisabled}
                    key={`${weekIndex}-${dayIndex}-${day.value || "empty"}`}
                    onPress={() => {
                      if (day.value) {
                        onSelect(day.value);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.calendarDayCell,
                      !day.isCurrentMonth && styles.calendarDayCellOutsideMonth,
                      isFutureDay && styles.calendarDayCellDisabled,
                      day.value === value && styles.calendarDayCellSelected,
                      pressed &&
                        !isDisabled &&
                        day.value !== value &&
                        styles.calendarDayCellPressed
                    ]}
                  >
                    <AppText
                      style={[
                        (!day.isCurrentMonth || isFutureDay) &&
                          styles.calendarDayTextDisabled,
                        day.value === value && styles.calendarDayTextSelected
                      ]}
                      variant="body"
                    >
                      {day.dayNumber > 0 ? String(day.dayNumber) : ""}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </>
    );
  };

  return (
    <InlinePickerField
      disabled={!editable}
      error={error}
      icon="calendar-outline"
      isOpen={isOpen}
      label={label}
      onEditPress={onEditPress}
      onToggle={onToggle}
      placeholder={placeholder}
      valueLabel={formatDisplayDate(value)}
    >
      {renderBody()}

      {allowClear && value && onClear ? (
        <View style={styles.pickerActionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onClear}
            style={({ pressed }) => [
              styles.pickerActionButton,
              pressed && styles.pickerActionButtonPressed
            ]}
          >
            <AppText variant="label">Limpiar fecha</AppText>
          </Pressable>
        </View>
      ) : null}
    </InlinePickerField>
  );
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSelectedLabel(options: CatalogSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label;
}

function getCatalogError(loadError: string | null, validationError?: string) {
  return validationError || loadError;
}

function isPendingLabor(etapa: EtapaFenologicaCatalogItem) {
  return (
    etapa.type === "Labor" && normalizeCatalogName(etapa.name).includes("induccion flor")
  );
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function validateForm(
  values: NewVisitaCampoFormValues,
  today: string,
  stageType?: "Etapa" | "Labor"
): NewVisitaCampoFormErrors {
  const nextErrors: NewVisitaCampoFormErrors = {};

  if (!values.crop) {
    nextErrors.crop = "Selecciona un cultivo.";
  }

  if (!values.variety) {
    nextErrors.variety = "Selecciona una variedad.";
  }

  if (!values.campaign) {
    nextErrors.campaign = "No se encontro una campaña activa para el cultivo.";
  }

  const phenologicalStageError = validateRequiredPhenologicalStage(
    values.phenologicalStage
  );

  if (phenologicalStageError) {
    nextErrors.phenologicalStage = phenologicalStageError;
  }

  if (!values.parcelaId) {
    nextErrors.parcelaId = "No se encontro una parcela valida.";
  }

  const plantsCountIssue = getPlantsCountIssue(values.plantsCount);
  if (plantsCountIssue === "missing") {
    nextErrors.plantsCount = "Ingresa el numero de plantas.";
  } else if (plantsCountIssue === "invalid") {
    nextErrors.plantsCount = "Numero de plantas debe ser un entero mayor o igual a cero.";
  }

  const areaHectaresIssue = getAreaHectaresIssue(values.areaHectares);
  if (areaHectaresIssue === "missing") {
    nextErrors.areaHectares = "Ingresa el area en hectareas.";
  } else if (areaHectaresIssue === "invalid") {
    nextErrors.areaHectares = "Area debe ser un numero mayor que cero.";
  }

  const sowingDateIssue = getSowingDateIssue(values.sowingDate, today);
  if (sowingDateIssue === "missing") {
    nextErrors.sowingDate = "Selecciona la fecha de siembra.";
  } else if (sowingDateIssue === "invalid") {
    if (!DATE_PATTERN.test(values.sowingDate.trim())) {
      nextErrors.sowingDate = "Fecha de siembra debe tener formato AAAA-MM-DD.";
    } else {
      nextErrors.sowingDate = "Fecha de siembra no puede ser mayor a la fecha actual.";
    }
  }

  if (!values.visitDate.trim()) {
    nextErrors.visitDate = "La fecha de visita es obligatoria.";
  } else if (!DATE_PATTERN.test(values.visitDate.trim())) {
    nextErrors.visitDate = "Fecha de visita debe tener formato AAAA-MM-DD.";
  }

  if (!values.startVisitTime.trim()) {
    nextErrors.startVisitTime = "La hora de inicio es obligatoria.";
  } else if (!TIME_PATTERN.test(values.startVisitTime.trim())) {
    nextErrors.startVisitTime = "Hora de inicio debe tener formato HH:mm.";
  }

  if (stageType === "Etapa" || stageType === "Labor") {
    if (stageType === "Etapa" && !values.subEtapaId) nextErrors.subEtapaId = "Selecciona una subetapa.";
    const coverage = Number(values.coveragePercentage);
    if (!Number.isInteger(coverage) || coverage < 1 || coverage > 100) {
      nextErrors.coveragePercentage = "Ingresa un porcentaje de parcela entre 1 y 100.";
    }
  }

  if (stageType === "Labor" && values.subEtapaPercentage.trim().length > 0) {
    const subEtapaPercentage = Number(values.subEtapaPercentage);

    if (
      !Number.isFinite(subEtapaPercentage) ||
      subEtapaPercentage < 0 ||
      subEtapaPercentage > 100
    ) {
      nextErrors.subEtapaPercentage = "Porcentaje de sub etapa debe estar entre 0 y 100.";
    } else if (!isPercentageStep(subEtapaPercentage)) {
      nextErrors.subEtapaPercentage = "Porcentaje debe avanzar de 5 en 5.";
    }
  }

  return nextErrors;
}

function normalizeFormValuesForSubmit(
  values: NewVisitaCampoFormValues,
  subEtapas: SubEtapaCatalogItem[]
): NewVisitaCampoFormValues {
  if (subEtapas.length > 0) return values;
  const parsedPercentage = parsePercentageValue(values.subEtapaPercentage);

  if (parsedPercentage === null) {
    return values;
  }

  const roundedPercentage = roundPercentageToStep(parsedPercentage);
  return {
    ...values,
    subEtapaPercentage: formatPercentageValue(roundedPercentage)
  };
}

function buildCreateDraft(
  values: NewVisitaCampoFormValues,
  visitLocation: GeoJsonPointGeometry | null,
  stages: VisitPhenologicalStage[]
): CreateVisitaCampoDraft {
  const primary = stages.reduce((best, item) =>
    (item.coveragePercentage ?? -1) > (best.coveragePercentage ?? -1) ? item : best
  );
  return {
    cropId: values.crop,
    varietyId: values.variety,
    parcelaId: values.parcelaId,
    campaignId: values.campaign,
    ...(visitLocation ? { visitLocation } : {}),
    ...(values.plantsCount.trim()
      ? { plantsCount: Number(values.plantsCount.trim()) }
      : {}),
    ...(values.areaHectares.trim() ? { areaHectares: values.areaHectares.trim() } : {}),
    ...(values.sowingDate.trim() ? { sowingDate: values.sowingDate.trim() } : {}),
    visitDate: values.visitDate.trim(),
    startVisitTime: normalizeTimeForApi(values.startVisitTime),
    phenologicalStageId: primary.phenologicalStageId,
    ...(primary.subEtapaId ? { subEtapaId: primary.subEtapaId } : {}),
    ...(primary.laborProgressPercentage !== null
      ? { subEtapaPercentage: primary.laborProgressPercentage }
      : {}),
    phenologicalStages: stages,
    ...(values.generalObservation.trim()
      ? { generalObservation: values.generalObservation.trim() }
      : {})
  };
}

function buildStageEntries(
  values: NewVisitaCampoFormValues,
  additional: AdditionalStageRow[],
  catalog: EtapaFenologicaCatalogItem[]
): VisitPhenologicalStage[] {
  const rows = [{
    phenologicalStageId: values.phenologicalStage,
    subEtapaId: values.subEtapaId,
    coveragePercentage: values.coveragePercentage,
    laborProgressPercentage: values.subEtapaPercentage
  }, ...additional];
  return rows.map((row) => {
    const stage = catalog.find((item) => item.id === row.phenologicalStageId);
    return {
      phenologicalStageId: row.phenologicalStageId,
      subEtapaId: stage?.type === "Etapa" ? row.subEtapaId || null : null,
      coveragePercentage: row.coveragePercentage.trim()
        ? Number(row.coveragePercentage) : null,
      laborProgressPercentage: stage?.type === "Labor" && row.laborProgressPercentage.trim()
        ? Number(row.laborProgressPercentage) : null
    };
  });
}

function validateStageDistribution(
  entries: VisitPhenologicalStage[],
  catalog: EtapaFenologicaCatalogItem[]
): string | null {
  if (entries.some((entry) => !entry.phenologicalStageId ||
      !catalog.some((item) => item.id === entry.phenologicalStageId))) {
    return "Selecciona una etapa o labor en cada fila agregada.";
  }
  if (new Set(entries.map((entry) => entry.phenologicalStageId)).size !== entries.length) {
    return "Cada etapa o labor puede registrarse una sola vez.";
  }
  let total = 0;
  for (const entry of entries) {
    const stage = catalog.find((item) => item.id === entry.phenologicalStageId)!;
    if (stage.type === "Etapa" && !entry.subEtapaId) {
      return `Selecciona la subetapa de ${stage.name}.`;
    }
    if (!Number.isInteger(entry.coveragePercentage) ||
        entry.coveragePercentage! < 1 || entry.coveragePercentage! > 100) {
      return `Ingresa un porcentaje de parcela válido para ${stage.name}.`;
    }
    total += entry.coveragePercentage!;
    if (stage.type === "Labor" && !isPendingLabor(stage) &&
        (entry.laborProgressPercentage === null ||
         !Number.isFinite(entry.laborProgressPercentage) ||
         entry.laborProgressPercentage < 0 || entry.laborProgressPercentage > 100)) {
      return `Ingresa el avance de la labor ${stage.name}.`;
    }
  }
  return total !== 100
    ? `La distribución de la parcela debe sumar 100%; ahora suma ${total}%.` : null;
}

function parsePercentageValue(value: number | string) {
  if (typeof value === "string") {
    const normalizedValue = formatIntegerInput(value);

    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);

    if (!Number.isFinite(parsedValue)) {
      return null;
    }

    return clampNumber(parsedValue, 0, 100);
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return clampNumber(value, 0, 100);
}

function formatPercentageValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function roundPercentageToStep(value: number) {
  return clampNumber(Math.round(value / 5) * 5, 0, 100);
}

function isPercentageStep(value: number) {
  return Number.isInteger(value) && value % 5 === 0;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDecimalInput(value: string, maxDecimals = 4) {
  const normalizedValue = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalizedValue.split(".");
  const decimalPart = decimalParts.join("").slice(0, maxDecimals);

  if (normalizedValue.includes(".")) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
}

function formatIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeTimeForApi(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.length === 5 ? `${trimmedValue}:00` : trimmedValue;
}

function normalizeTyped12HourInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `${format12HourPart(digits)}:00`;
  }

  const hourDigits = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
  const minuteDigits = digits.length === 3 ? digits.slice(1) : digits.slice(2);

  return `${format12HourPart(hourDigits)}:${formatBoundedTimePart(minuteDigits, 59)}`;
}

function normalize12HourTimeForApi(value: string, period: TimePeriod) {
  const normalizedValue = normalizeTyped12HourInput(value);

  if (!normalizedValue) {
    return "";
  }

  const [hourValue, minuteValue] = normalizedValue.split(":").map(Number);
  const hour24 =
    period === "PM" ? (hourValue % 12) + 12 : hourValue === 12 ? 0 : hourValue;

  return `${padTimeValue(hour24)}:${padTimeValue(minuteValue)}`;
}

function formatTimeFor12HourInput(value: string): { time: string; period: TimePeriod } {
  const normalizedValue = normalizeTimeForApi(value);

  if (!TIME_PATTERN.test(normalizedValue)) {
    return { time: "", period: "AM" };
  }

  const [hourValue, minuteValue] = normalizedValue.split(":").map(Number);
  const period: TimePeriod = hourValue >= 12 ? "PM" : "AM";
  const hour12 = hourValue % 12 || 12;

  return {
    time: `${padTimeValue(hour12)}:${padTimeValue(minuteValue)}`,
    period
  };
}

function format12HourPart(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "12";
  }

  return padTimeValue(clampNumber(parsedValue, 1, 12));
}

function formatBoundedTimePart(value: string, max: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "00";
  }

  return padTimeValue(clampNumber(parsedValue, 0, max));
}

function parseDateValue(value: string) {
  const trimmedValue = value.trim();

  if (!DATE_PATTERN.test(trimmedValue)) {
    return null;
  }

  const [yearValue, monthValue, dayValue] = trimmedValue
    .split("-")
    .map((item) => Number(item));

  if (
    !Number.isInteger(yearValue) ||
    !Number.isInteger(monthValue) ||
    !Number.isInteger(dayValue)
  ) {
    return null;
  }

  const parsedDate = new Date(yearValue, monthValue - 1, dayValue);

  if (
    parsedDate.getFullYear() !== yearValue ||
    parsedDate.getMonth() !== monthValue - 1 ||
    parsedDate.getDate() !== dayValue
  ) {
    return null;
  }

  return parsedDate;
}

function compareDateValues(left: string, right: string) {
  const leftDate = parseDateValue(left);
  const rightDate = parseDateValue(right);

  if (!leftDate || !rightDate) {
    return 0;
  }

  return leftDate.getTime() - rightDate.getTime();
}

function formatDisplayDate(value: string) {
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return undefined;
  }

  return `${padTimeValue(parsedDate.getDate())}/${padTimeValue(parsedDate.getMonth() + 1)}/${parsedDate.getFullYear()}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatMonthYear(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function buildYearRange(center: number) {
  const start = Math.floor(center / 12) * 12;
  const range: number[] = [];

  for (let i = 0; i < 12; i += 1) {
    range.push(start + i);
  }

  return range;
}

function buildCalendarWeeks(date: Date) {
  const firstDayOfMonth = getMonthStart(date);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const weeks: Array<
    Array<{ value: string | null; dayNumber: number; isCurrentMonth: boolean }>
  > = [];

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const dayOffset = cellIndex - startOffset + 1;
    const isCurrentMonth = dayOffset >= 1 && dayOffset <= daysInMonth;
    const weekIndex = Math.floor(cellIndex / 7);
    const targetWeek = weeks[weekIndex] ?? [];

    if (isCurrentMonth) {
      const currentDate = new Date(date.getFullYear(), date.getMonth(), dayOffset);

      targetWeek.push({
        value: formatDateForApi(currentDate),
        dayNumber: dayOffset,
        isCurrentMonth: true
      });
    } else {
      targetWeek.push({
        value: null,
        dayNumber: 0,
        isCurrentMonth: false
      });
    }

    weeks[weekIndex] = targetWeek;
  }

  return weeks;
}

function formatDateForApi(date: Date) {
  return `${date.getFullYear()}-${padTimeValue(date.getMonth() + 1)}-${padTimeValue(date.getDate())}`;
}

function padTimeValue(value: number) {
  return String(value).padStart(2, "0");
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"] as const;
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
] as const;
const styles = StyleSheet.create({
  authContainer: {
    justifyContent: "center"
  },
  authActions: {
    gap: 10
  },
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  safeTop: {
    backgroundColor: "#064b31"
  },
  topBar: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 16,
    backgroundColor: "#064b31"
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24
  },
  topBarTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: 0
  },
  tutorialButton: {
    alignItems: "center",
    borderColor: "rgba(244, 201, 93, 0.58)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12
  },
  tutorialButtonText: {
    color: "#ffffff",
    fontSize: 13
  },
  scrollContent: {
    paddingBottom: 18,
    backgroundColor: "#fbfcf9"
  },
  hero: {
    minHeight: 284,
    width: "100%",
    backgroundColor: "#f7f5ed"
  },
  heroImage: {
    opacity: 0.86
  },
  heroScrim: {
    minHeight: 284,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 26,
    backgroundColor: "rgba(255, 252, 244, 0.58)"
  },
  heroEyebrow: {
    color: "#064b31",
    letterSpacing: 2
  },
  heroTitle: {
    maxWidth: 530,
    marginTop: 14,
    color: "#073b2a",
    fontSize: 37,
    lineHeight: 43,
    letterSpacing: 0
  },
  heroSubtitle: {
    maxWidth: 560,
    marginTop: 13,
    color: "#4e5b56",
    fontSize: 16,
    lineHeight: 25
  },
  body: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 16
  },
  tutorialNotice: {
    alignItems: "center",
    backgroundColor: "#e8f5ec",
    borderColor: "#b8d9c3",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  tutorialNoticeText: {
    color: "#1b4332",
    flex: 1
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    minHeight: 104,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5
  },
  progressCardCompact: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 14
  },
  progressCopy: {
    width: 210,
    maxWidth: "42%",
    gap: 5
  },
  progressCopyCompact: {
    width: "100%",
    maxWidth: "100%"
  },
  progressStepText: {
    color: "#176b2d",
    fontSize: 17
  },
  progressTitle: {
    color: "#102e23",
    fontSize: 15,
    lineHeight: 21
  },
  progressTrack: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  progressStepItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1
  },
  progressConnector: {
    width: 22,
    height: 1.5,
    backgroundColor: "#d8d3c5",
    flexShrink: 1
  },
  progressConnectorActive: {
    backgroundColor: "#3f8f21"
  },
  progressNode: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#d8d3c5",
    backgroundColor: "#ffffff"
  },
  progressNodeActive: {
    borderColor: "#12622f",
    backgroundColor: "#12622f"
  },
  progressNodeText: {
    color: "#17231d"
  },
  progressNodeTextActive: {
    color: "#ffffff"
  },
  progressActiveDot: {
    width: 8,
    height: 8,
    marginLeft: 5,
    borderRadius: 4,
    backgroundColor: "#3f8f21"
  },
  formCard: {
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 19,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ece8dd",
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 9,
    elevation: 4
  },
  additionalStageCard: {
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d6e5da",
    backgroundColor: "#f5faf6"
  },
  removeStageButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: "#fff0ef"
  },
  removeStageButtonText: {
    color: theme.colors.error
  },
  subEtapaGallery: {
    gap: 8,
    marginVertical: 10
  },
  subEtapaGalleryItem: {
    width: 108,
    minHeight: 128,
    alignItems: "center",
    gap: 6,
    marginRight: 9,
    padding: 6,
    borderWidth: 1,
    borderColor: "#d6e5da",
    borderRadius: 12,
    backgroundColor: "#ffffff"
  },
  subEtapaGalleryItemSelected: {
    borderWidth: 2,
    borderColor: theme.colors.primary
  },
  subEtapaGalleryImage: {
    width: 94,
    height: 88,
    borderRadius: 8,
    resizeMode: "contain"
  },
  subEtapaGalleryLabel: {
    textAlign: "center"
  },
  addStageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: theme.colors.primary
  },
  sectionHeader: {
    gap: 4
  },
  sectionTitle: {
    color: "#073b2a",
    fontSize: 22,
    lineHeight: 27
  },
  sectionSubtitle: {
    color: "#5f6b66",
    fontSize: 14,
    lineHeight: 19
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  fieldStack: {
    gap: 14
  },
  fieldColumn: {
    minWidth: 250,
    flex: 1
  },
  localFieldWrapper: {
    gap: 6
  },
  localFieldLabel: {
    color: "#0f1c18",
    fontSize: 15
  },
  readonlyTrigger: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#fbfbf8"
  },
  inputFrame: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#ffffff"
  },
  inputFrameReadonly: {
    backgroundColor: "#fbfbf8"
  },
  editIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#eef7e4",
    borderWidth: 1,
    borderColor: "#d2ead8"
  },
  localFieldIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f0f3e8"
  },
  readonlyValue: {
    minWidth: 0,
    flex: 1,
    color: "#1f2b26",
    fontSize: 16
  },
  iconInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 16
  },
  iconInputReadonly: {
    color: "#59635f"
  },
  placeholderValue: {
    color: theme.colors.textMuted
  },
  localFieldError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorMuted
  },
  localErrorText: {
    color: theme.colors.error
  },
  fieldHint: {
    color: "#6b716f",
    fontSize: 13,
    lineHeight: 17
  },
  periodToggle: {
    flexDirection: "row",
    gap: 4,
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#eef1ef"
  },
  periodButton: {
    minWidth: 44,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingHorizontal: 8
  },
  periodButtonSelected: {
    backgroundColor: "#12622f"
  },
  periodButtonText: {
    color: "#40504a",
    fontWeight: "700"
  },
  periodButtonTextSelected: {
    color: "#ffffff"
  },
  pickerTrigger: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#ffffff"
  },
  pickerTriggerOpen: {
    borderColor: "#12622f",
    borderWidth: 1.8
  },
  pickerTriggerDisabled: {
    opacity: 0.55
  },
  pickerValue: {
    minWidth: 0,
    flex: 1,
    color: "#1f2b26",
    fontSize: 16
  },
  pickerChevron: {
    marginRight: 5
  },
  pickerPanel: {
    gap: 12,
    borderWidth: 1.2,
    borderColor: "#e3dfd2",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  calendarNavButton: {
    minWidth: 42,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f0f3e8",
    borderWidth: 1,
    borderColor: "#e3dfd2"
  },
  calendarNavButtonPressed: {
    backgroundColor: "#d8f3dc"
  },
  calendarMonthText: {
    color: "#102e23"
  },
  calendarWeekHeader: {
    flexDirection: "row"
  },
  calendarDayLabelCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4
  },
  calendarDayLabelText: {
    color: "#65706b",
    fontWeight: "700"
  },
  calendarGrid: {
    gap: 6
  },
  calendarWeekRow: {
    flexDirection: "row",
    gap: 6
  },
  calendarDayCell: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f8faf5"
  },
  calendarDayCellOutsideMonth: {
    backgroundColor: "transparent"
  },
  calendarDayCellDisabled: {
    opacity: 0.32
  },
  calendarDayCellSelected: {
    backgroundColor: "#12622f"
  },
  calendarDayCellPressed: {
    backgroundColor: "#d8f3dc"
  },
  calendarDayTextDisabled: {
    color: theme.colors.textMuted
  },
  calendarMonthPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8
  },
  calendarMonthPressablePressed: {
    backgroundColor: "#d8f3dc"
  },
  drillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  drillBackButton: {
    minWidth: 42,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f0f3e8",
    borderWidth: 1,
    borderColor: "#e3dfd2"
  },
  drillTitle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8
  },
  drillSpacer: {
    minWidth: 42
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  monthCell: {
    width: "30%",
    flexGrow: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f8faf5",
    borderWidth: 1,
    borderColor: "#e3dfd2"
  },
  monthCellSelected: {
    backgroundColor: "#12622f",
    borderColor: "#12622f"
  },
  monthCellText: {
    color: "#1f2b26"
  },
  monthCellTextSelected: {
    color: "#ffffff",
    fontWeight: "700"
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  yearCell: {
    width: "31%",
    flexGrow: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f8faf5",
    borderWidth: 1,
    borderColor: "#e3dfd2"
  },
  yearCellSelected: {
    backgroundColor: "#12622f",
    borderColor: "#12622f"
  },
  yearCellText: {
    color: "#1f2b26"
  },
  yearCellTextSelected: {
    color: "#ffffff",
    fontWeight: "700"
  },
  calendarDayTextSelected: {
    color: "#ffffff",
    fontWeight: "700"
  },
  timePickerSection: {
    gap: 8
  },
  timeChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  timeChip: {
    minWidth: 52,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e3dfd2",
    backgroundColor: "#f8faf5",
    paddingHorizontal: 10
  },
  timeChipSelected: {
    borderColor: "#12622f",
    backgroundColor: "#12622f"
  },
  timeChipPressed: {
    backgroundColor: "#d8f3dc"
  },
  timeChipTextSelected: {
    color: "#ffffff"
  },
  pickerActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10
  },
  pickerActionButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d8d3c5",
    backgroundColor: "#ffffff",
    paddingHorizontal: 13
  },
  pickerActionButtonPrimary: {
    borderColor: "#12622f",
    backgroundColor: "#12622f"
  },
  pickerActionButtonPressed: {
    opacity: 0.85
  },
  pickerActionButtonPrimaryText: {
    color: "#ffffff"
  },
  observationInput: {
    minHeight: 110,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingTop: 12,
    color: theme.colors.text,
    fontSize: 16,
    backgroundColor: "#ffffff"
  },
  subEtapasPanel: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#e3dfd2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#fbfbf8"
  },
  subEtapasHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12
  },
  subEtapasHeaderCopy: {
    minWidth: 180,
    flex: 1,
    flexShrink: 1
  },
  subEtapasTitle: {
    color: "#073b2a",
    fontSize: 16
  },
  subEtapasSubtitle: {
    color: "#5f6b66"
  },
  percentageInputShell: {
    width: 92,
    maxWidth: "100%",
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#cfd8c2",
    borderRadius: 12,
    paddingHorizontal: 9,
    backgroundColor: "#ffffff",
    flexShrink: 0
  },
  percentageInput: {
    minWidth: 44,
    paddingVertical: 0,
    textAlign: "right",
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  percentageSymbol: {
    color: "#176b2d",
    fontSize: 16
  },
  sliderArea: {
    minHeight: 122,
    paddingTop: 72
  },
  sliderTrack: {
    height: 8,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#d8d3c5"
  },
  sliderTrackFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#3f8f21"
  },
  sliderThumb: {
    position: "absolute",
    top: -9,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#12622f",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  subEtapaMarker: {
    position: "absolute",
    top: -70,
    alignItems: "center",
    gap: 3
  },
  subEtapaMarkerImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#f0f3e8"
  },
  subEtapaMarkerPercent: {
    color: "#176b2d",
    fontSize: 11,
    fontWeight: "700"
  },
  sliderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10
  },
  sliderBoundText: {
    color: "#65706b"
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(6, 18, 13, 0.48)"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  subEtapaModalCard: {
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    backgroundColor: "#ffffff"
  },
  subEtapaModalImage: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    backgroundColor: "#f0f3e8"
  },
  subEtapaModalTitle: {
    color: "#073b2a",
    fontSize: 22
  },
  subEtapaModalPercent: {
    color: "#176b2d"
  },
  subEtapaModalDescription: {
    color: "#3e4a45",
    fontSize: 15,
    lineHeight: 23
  },
  modalCloseButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#08643f"
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 16
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  submitErrorText: {
    color: theme.colors.error
  },
  actions: {
    gap: 12,
    paddingBottom: 8
  },
  continueButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#08643f",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 18
  },
  backOutlineButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#08643f",
    backgroundColor: "#ffffff"
  },
  backOutlineButtonText: {
    color: "#08643f",
    fontSize: 17
  },
  disabledButton: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.82
  }
});
