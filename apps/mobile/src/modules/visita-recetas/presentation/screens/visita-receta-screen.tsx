import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode
} from "react";
import {
  ImageBackground,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
  AppCollapsibleHeader,
  AppInput,
  AppText,
  FormScrollView,
  ScreenContainer
} from "../../../../shared/components";
import { AppSelectField } from "../../../../shared/components/app-select-field";
import { theme } from "../../../../shared/constants/theme";
import { useCatalogDownloadStatus } from "../../../../shared/database/catalog-download-state";
import {
  buildVisitDraftScopeKey,
  readVisitFormDraft,
  writeVisitFormDraft,
  type VisitFormDraftIdentity
} from "../../../../shared/database/visit-form-drafts";
import { useVisitFormDraft } from "../../../../shared/hooks/use-visit-form-draft";
import { toApiError } from "../../../../shared/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { observacionesSanitariasService } from "../../../observaciones-sanitarias/services";
import { parcelasRepository } from "../../../parcelas/repositories/parcelas.repository";
import type { TimePeriod } from "../../../visitas-campo/domain/time-input";
import { visitasCampoRepository } from "../../../visitas-campo/repositories/visitas-campo.repository";
import type { PestDiseaseCatalogItem } from "../../../observaciones-sanitarias/types";
import type { NutrientCatalogItem } from "../../../nutricion/types";
import { formatFertilizationTarget } from "../../domain/recommendation-approach";
import {
  buildRecipeTutorialSteps,
  getNextTutorialStep,
  recipeTutorialTarget,
  takePreviousTutorialStep,
  type RecipeTutorialFieldId
} from "../../domain/recipe-tutorial";
import { visitaRecetasService } from "../../services";
import { GuidedFormTutorial } from "../../../visitas-campo/presentation/components/guided-form-tutorial";
import {
  LABOR_RECOMENDACION_DESCRIPTIONS,
  LABOR_RECOMENDACION_LABELS,
  RIEGO_RECOMENDACION_LABELS
} from "../../types";
import type {
  ConsolidacionHallazgo,
  CoadyuvanteCatalogItem,
  IngredienteActivoCatalogItem,
  ModoAccionCatalogItem,
  MarcaProductoCatalogItem,
  TipoControlCatalogItem,
  TipoProductoFitosanitarioCatalogItem,
  FertilizanteCatalogItem,
  RecetaLabor,
  VisitaRecetaCompleta
} from "../../types";
import { generateOrdenMezcla } from "./visita-receta-order";
import {
  buildCommercialSelectionPatch,
  buildIngredientSelectionPatch,
  getCommercialOptions,
  getIngredientOptions,
  resolveCommercialSelectionPatch
} from "./visita-receta-selection";
import {
  buildRecipeAccordionCards,
  findFirstRecipeDoseIssue,
  findFirstIncompleteRecipeCard,
  getFertilizacionCardKey,
  getFitosanidadCardKey,
  groupRecipeFertilizaciones,
  isFertilizacionGroupComplete,
  isFitosanidadCardComplete,
  resolveRecipeCardAfterRemoval,
  toggleActiveRecipeCard,
  type RecipeCardKey
} from "./visita-receta-accordion";
import {
  buildConsolidacionSummary,
  buildLaboresSummary,
  buildOptionalRecipeSectionStatus,
  buildRiegoSummary
} from "./visita-receta-collapsible";
import {
  PRUNING_RECOMMENDATIONS,
  toggleLaborRecommendation
} from "./visita-receta-labores";
import {
  buildFertilizacionUnidadDosis,
  buildFitosanidadUnidadDosis,
  applyDefaultFitosanidadControl,
  appendMezclasForNewFindings,
  calculateTotal,
  createEmptyFertilizacion,
  createPreventiveFertilizacion,
  createEmptyIngrediente,
  createPreventiveFitosanidad,
  discardEmptyReactiveApplicationsForDeletedTargets,
  discardEmptyReactiveApplicationsWithoutActiveFindings,
  excludeLocallyDeletedFitosanidadFindings,
  getDosisUnit,
  getAvailablePreventiveTargets,
  getAvailablePreventiveNutrients,
  getFertilizacionDosisUnits,
  getUnidadDosis,
  hasFertilizacionData,
  hasFitosanidadData,
  isValidFertilizacionUnidadDosis,
  mergeMissingFitosanidadFindings,
  mergeNutritionFertilizations,
  deriveMezclaFactors,
  recalculateFertilizacion,
  recalculateIngrediente,
  resolveDefaultControlId,
  restoreFertilizaciones,
  restoreFitosanidadApps,
  restoreMezclas,
  sanitizeDraftFertilizaciones,
  sanitizeDraftFitosanidad,
  sanitizeDraftMezclas,
  type AppFertilizacion,
  type AppFitosanidad,
  type AppIngrediente,
  type AppMezcla
} from "./visita-receta-multiple-products";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

const VALID_RIEGO_RECOMMENDATIONS = new Set(Object.keys(RIEGO_RECOMENDACION_LABELS));
const VALID_LABOR_RECOMMENDATIONS = new Set(Object.keys(LABOR_RECOMENDACION_LABELS));

type IoniconName = ComponentProps<typeof Ionicons>["name"];
export type RecetaFormDraft = {
  endVisitTimeInput?: string;
  endVisitTimePeriod?: TimePeriod;
  preventiveObjectiveType: "plaga" | "enfermedad";
  preventiveTargetId: string;
  preventiveNutrientId: string;
  fitosanidadApps: AppFitosanidad[];
  mezclas: AppMezcla[];
  fertilizaciones: AppFertilizacion[];
  riegoSelection: string | null;
  laborSelections: string[];
};

function formatCatalogConcentration(concentration: string, measurementUnit: string) {
  return [concentration.trim(), measurementUnit.trim()].filter(Boolean).join(" ");
}

function toSingleParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function resolveRecipeUnitDropdownKey(
  fieldKey: string,
  applications: AppFitosanidad[],
  fertilizations: AppFertilizacion[]
) {
  for (const application of applications) {
    const ingredient = application.ingredientes.find(
      (item) => `fitosanidad:${application.localId}:${item.localId}:unidad` === fieldKey
    );
    if (ingredient) {
      return recipeTutorialTarget.fitoUnit(application.localId, ingredient.localId);
    }
  }

  const fertilization = fertilizations.find(
    (item) => `fertilizacion:${item.localId}:unidad` === fieldKey
  );
  return fertilization
    ? recipeTutorialTarget.fertilizerUnit(fertilization.localId)
    : null;
}

export function VisitaRecetaScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recipeFieldError, setRecipeFieldError] = useState<string | null>(null);
  const [pendingRecipeIssue, setPendingRecipeIssue] =
    useState<ReturnType<typeof findFirstRecipeDoseIssue>>(null);
  const [consolidacion, setConsolidacion] = useState<ConsolidacionHallazgo | null>(null);
  const [recetaData, setRecetaData] = useState<VisitaRecetaCompleta | null>(null);

  const [coadyuvantes, setCoadyuvantes] = useState<CoadyuvanteCatalogItem[]>([]);
  const [ingredientesActivos, setIngredientesActivos] = useState<
    IngredienteActivoCatalogItem[]
  >([]);
  const [marcasProducto, setMarcasProducto] = useState<MarcaProductoCatalogItem[]>([]);
  const [modosAccion, setModosAccion] = useState<ModoAccionCatalogItem[]>([]);
  const [tiposControl, setTiposControl] = useState<TipoControlCatalogItem[]>([]);
  const [tiposProducto, setTiposProducto] = useState<
    TipoProductoFitosanitarioCatalogItem[]
  >([]);
  const [fertilizantes, setFertilizantes] = useState<FertilizanteCatalogItem[]>([]);
  const [preventiveTargets, setPreventiveTargets] = useState<PestDiseaseCatalogItem[]>(
    []
  );
  const [preventiveObjectiveType, setPreventiveObjectiveType] = useState<
    "plaga" | "enfermedad"
  >("plaga");
  const [preventiveTargetId, setPreventiveTargetId] = useState("");
  const [nutrients, setNutrients] = useState<NutrientCatalogItem[]>([]);
  const [preventiveNutrientId, setPreventiveNutrientId] = useState("");

  const [fitosanidadApps, setFitosanidadApps] = useState<AppFitosanidad[]>([]);
  const [mezclas, setMezclas] = useState<AppMezcla[]>([]);
  const [fertilizaciones, setFertilizaciones] = useState<AppFertilizacion[]>([]);
  const [riegoSelection, setRiegoSelection] = useState<string | null>(null);
  const [laborSelections, setLaborSelections] = useState<Set<string>>(() => new Set());

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isPreventiveFitoExpanded, setIsPreventiveFitoExpanded] = useState(false);
  const [isPreventiveFertilizationExpanded, setIsPreventiveFertilizationExpanded] =
    useState(false);
  const [activeRecipeCardKey, setActiveRecipeCardKey] = useState<RecipeCardKey | null>(
    null
  );
  const [isDraftReady, setIsDraftReady] = useState(false);
  const loadRequestRef = useRef(0);
  const accordionInitializedRef = useRef(false);
  const formScrollRef = useRef<ScrollView>(null);
  const doseInputRefs = useRef<Record<string, TextInput | null>>({});
  const recipeCardOffsets = useRef<Record<RecipeCardKey, number>>({});
  const recipeFieldOffsets = useRef<Record<string, number>>({});
  const tutorialTargets = useRef<Record<string, View | null>>({});
  const [tutorialScrollY, setTutorialScrollY] = useState(0);
  const [tutorialStepId, setTutorialStepId] = useState<RecipeTutorialFieldId | null>(
    null
  );
  const [tutorialHistory, setTutorialHistory] = useState<RecipeTutorialFieldId[]>([]);
  const [tutorialNotice, setTutorialNotice] = useState<string | null>(null);
  const [tutorialCreatedPreventiveFitoId, setTutorialCreatedPreventiveFitoId] = useState<
    string | null
  >(null);
  const [
    tutorialCreatedPreventiveFertilizationId,
    setTutorialCreatedPreventiveFertilizationId
  ] = useState<string | null>(null);
  const catalogDownloadStatus = useCatalogDownloadStatus();
  const catalogDownloadWasActiveRef = useRef(catalogDownloadStatus.isDownloading);
  const draftIdentity = useMemo<VisitFormDraftIdentity | null>(
    () =>
      session.user?.publicId && visitaId
        ? {
            ownerUserId: session.user.publicId,
            scopeKey: buildVisitDraftScopeKey(visitaId),
            moduleKey: "receta"
          }
        : null,
    [session.user?.publicId, visitaId]
  );
  const draftValue = useMemo<RecetaFormDraft>(
    () => ({
      preventiveObjectiveType,
      preventiveTargetId,
      preventiveNutrientId,
      fitosanidadApps,
      mezclas,
      fertilizaciones,
      riegoSelection,
      laborSelections: Array.from(laborSelections).sort()
    }),
    [
      fertilizaciones,
      fitosanidadApps,
      laborSelections,
      mezclas,
      preventiveObjectiveType,
      preventiveTargetId,
      preventiveNutrientId,
      riegoSelection
    ]
  );
  const { flushDraft } = useVisitFormDraft({
    enabled: isDraftReady && !isLoading && !error,
    identity: draftIdentity,
    value: draftValue
  });

  const availablePreventiveTargets = useMemo(() => {
    return getAvailablePreventiveTargets(
      preventiveTargets,
      consolidacion,
      fitosanidadApps,
      preventiveObjectiveType
    );
  }, [consolidacion, fitosanidadApps, preventiveObjectiveType, preventiveTargets]);
  const hasAvailablePreventiveTargets = useMemo(
    () =>
      (["plaga", "enfermedad"] as const).some(
        (objectiveType) =>
          getAvailablePreventiveTargets(
            preventiveTargets,
            consolidacion,
            fitosanidadApps,
            objectiveType
          ).length > 0
      ),
    [consolidacion, fitosanidadApps, preventiveTargets]
  );

  const availablePreventiveNutrients = useMemo(
    () => getAvailablePreventiveNutrients(nutrients, consolidacion, fertilizaciones),
    [consolidacion, fertilizaciones, nutrients]
  );

  const fertilizacionGroups = useMemo(
    () => groupRecipeFertilizaciones(fertilizaciones),
    [fertilizaciones]
  );
  const recipeAccordionCards = useMemo(
    () => buildRecipeAccordionCards(fitosanidadApps, [], fertilizaciones),
    [fertilizaciones, fitosanidadApps]
  );
  const tutorialSteps = useMemo(
    () =>
      buildRecipeTutorialSteps({
        activeCardKey: activeRecipeCardKey,
        openDropdown,
        hasLaborSelection: laborSelections.size > 0,
        hasRiegoSelection: Boolean(riegoSelection),
        preventiveFitosanidad: {
          createdApplicationId: tutorialCreatedPreventiveFitoId,
          hasAvailableTargets: hasAvailablePreventiveTargets,
          isExpanded: isPreventiveFitoExpanded,
          objectiveType: preventiveObjectiveType,
          targetId: preventiveTargetId
        },
        preventiveFertilization: {
          createdProductId: tutorialCreatedPreventiveFertilizationId,
          isExpanded: isPreventiveFertilizationExpanded,
          nutrientId: preventiveNutrientId
        },
        fitosanidad: fitosanidadApps.map((application) => ({
          cardKey: getFitosanidadCardKey(application.localId),
          localId: application.localId,
          targetName: application.objetivoNombre,
          tipoControlId: application.tipoControlId,
          ingredientes: application.ingredientes
        })),
        fertilizacionGroups: fertilizacionGroups.map((group) => {
          const reference = group.productos[0]!;
          return {
            cardKey: getFertilizacionCardKey(group.key),
            groupKey: group.key,
            targetName: formatFertilizationTarget(
              reference.enfoque,
              reference.nutrienteId,
              reference.nutrienteNombre
            ),
            productos: group.productos
          };
        })
      }),
    [
      activeRecipeCardKey,
      fertilizacionGroups,
      fitosanidadApps,
      hasAvailablePreventiveTargets,
      isPreventiveFertilizationExpanded,
      isPreventiveFitoExpanded,
      laborSelections,
      openDropdown,
      preventiveNutrientId,
      preventiveObjectiveType,
      preventiveTargetId,
      riegoSelection,
      tutorialCreatedPreventiveFertilizationId,
      tutorialCreatedPreventiveFitoId
    ]
  );
  const currentTutorialStep = tutorialStepId
    ? (tutorialSteps.find((step) => step.id === tutorialStepId) ?? null)
    : null;

  useEffect(() => {
    if (
      !currentTutorialStep?.autoAdvanceWhenComplete ||
      !currentTutorialStep.isComplete
    ) {
      return;
    }

    const nextStep = getNextTutorialStep(tutorialSteps, currentTutorialStep.id);
    if (!nextStep) return;

    const timer = setTimeout(() => {
      if (
        currentTutorialStep.id === recipeTutorialTarget.preventiveFitoCard ||
        currentTutorialStep.id === recipeTutorialTarget.preventiveFertilizationCard
      ) {
        setTutorialHistory((history) =>
          history[history.length - 1] === currentTutorialStep.id
            ? history
            : [...history, currentTutorialStep.id]
        );
      }
      setTutorialStepId(nextStep.id);
    }, 220);

    return () => clearTimeout(timer);
  }, [currentTutorialStep, tutorialSteps]);

  useEffect(() => {
    if (!isDraftReady || accordionInitializedRef.current) return;

    accordionInitializedRef.current = true;
    setActiveRecipeCardKey(findFirstIncompleteRecipeCard(recipeAccordionCards));
  }, [isDraftReady, recipeAccordionCards]);

  useEffect(() => {
    if (!pendingRecipeIssue) return;

    const frame = requestAnimationFrame(() => {
      const offset =
        pendingRecipeIssue.field === "dosis"
          ? recipeFieldOffsets.current[pendingRecipeIssue.fieldKey]
          : recipeCardOffsets.current[pendingRecipeIssue.cardKey];
      if (offset !== undefined) {
        formScrollRef.current?.scrollTo({
          y: Math.max(0, offset - 96),
          animated: true
        });
      }
      if (pendingRecipeIssue.field === "dosis") {
        doseInputRefs.current[pendingRecipeIssue.fieldKey]?.focus();
      }
      setPendingRecipeIssue(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [pendingRecipeIssue]);

  useFocusEffect(
    useCallback(() => {
      const catalogos = visitaRecetasService.getCatalogos();
      setIngredientesActivos(catalogos.ingredientesActivos);
      setMarcasProducto(catalogos.marcasProducto);
      setFertilizantes(catalogos.fertilizantes);
    }, [])
  );

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    loadAll(visitaId, requestId);

    return () => {
      if (loadRequestRef.current === requestId) {
        loadRequestRef.current += 1;
      }
    };
  }, [draftIdentity, visitaId]);

  useEffect(() => {
    const downloadWasActive = catalogDownloadWasActiveRef.current;
    catalogDownloadWasActiveRef.current = catalogDownloadStatus.isDownloading;

    if (
      !downloadWasActive ||
      catalogDownloadStatus.isDownloading ||
      catalogDownloadStatus.error
    ) {
      return;
    }

    const catalogos = visitaRecetasService.getCatalogos();
    setCoadyuvantes(catalogos.coadyuvantes);
    setIngredientesActivos(catalogos.ingredientesActivos);
    setMarcasProducto(catalogos.marcasProducto);
    setModosAccion(catalogos.modosAccion);
    setTiposControl(catalogos.tiposControl);
    setTiposProducto(catalogos.tiposProducto);
    setFertilizantes(catalogos.fertilizantes);
    setPreventiveTargets(visitaRecetasService.getPreventivePestDiseases());

    setFitosanidadApps((currentApps) =>
      applyDefaultFitosanidadControl(
        currentApps.map((current) => {
          return {
            ...current,
            ingredientes: current.ingredientes.map((ingredient) => {
              const selectionPatch = resolveCommercialSelectionPatch(
                ingredient.tipoProductoId,
                ingredient.marcaProductoNombre,
                catalogos.ingredientesActivos,
                catalogos.marcasProducto,
                catalogos.tiposProducto
              );

              if (!selectionPatch) return ingredient;

              return {
                ...ingredient,
                ...selectionPatch
              };
            })
          };
        }),
        catalogos.tiposControl
      )
    );

    setFertilizaciones((currentItems) =>
      currentItems.map((current) => {
        const selected = catalogos.fertilizantes.find(
          (fertilizante) =>
            fertilizante.name.trim().toLowerCase() ===
            current.fertilizanteNombre.trim().toLowerCase()
        );

        return selected
          ? {
              ...current,
              fertilizanteNombre: selected.name,
              tipoProducto: selected.type,
              concentracion: selected.concentracion ?? "",
              unidadMedida: selected.unidadMedida ?? ""
            }
          : current;
      })
    );
  }, [catalogDownloadStatus.error, catalogDownloadStatus.isDownloading]);

  function isActiveLoad(requestId: number) {
    return loadRequestRef.current === requestId;
  }

  function loadAll(vId: string, requestId: number) {
    setIsLoading(true);
    setIsDraftReady(false);
    accordionInitializedRef.current = false;
    setActiveRecipeCardKey(null);
    setError(null);
    try {
      const catalogos = visitaRecetasService.getCatalogos();
      setCoadyuvantes(catalogos.coadyuvantes);
      setIngredientesActivos(catalogos.ingredientesActivos);
      setMarcasProducto(catalogos.marcasProducto);
      setModosAccion(catalogos.modosAccion);
      setTiposControl(catalogos.tiposControl);
      setTiposProducto(catalogos.tiposProducto);
      setFertilizantes(catalogos.fertilizantes);

      const visita = visitasCampoRepository.getById(vId);
      const currentNutrients = visita
        ? visitaRecetasService.getNutrientsByCrop(visita.cropId)
        : [];
      setNutrients(currentNutrients);
      const currentPreventiveTargets = visitaRecetasService.getPreventivePestDiseases();
      setPreventiveTargets(currentPreventiveTargets);
      const parcela = visita ? parcelasRepository.getById(visita.parcelaId) : null;
      const locallyDeletedTargetIds =
        observacionesSanitariasService.getLocallyDeletedPestDiseaseIds(vId);
      const localConsData = visitaRecetasService.getConsolidacionLocal(vId);
      const recetaData = visitaRecetasService.getByVisitaId(vId);

      if (!isActiveLoad(requestId)) {
        return;
      }

      setConsolidacion(localConsData);

      let volumenPorDefecto = { fitosanidad: "", fertilizacion: "" };

      if (recetaData) {
        setRecetaData(recetaData);
        restoreFromReceta(
          recetaData,
          catalogos.ingredientesActivos,
          catalogos.marcasProducto,
          catalogos.fertilizantes,
          catalogos.tiposControl,
          localConsData
        );
      } else if (localConsData) {
        if (parcela) {
          volumenPorDefecto = visitaRecetasService.obtenerUltimoVolumenAplicacion(
            parcela.id
          );
        }
        initFitosanidadFromConsolidacion(
          localConsData,
          catalogos.tiposControl,
          volumenPorDefecto.fitosanidad
        );
        setFertilizaciones(
          mergeNutritionFertilizations([], localConsData, volumenPorDefecto.fertilizacion)
        );
      }

      const draft = draftIdentity
        ? readVisitFormDraft<RecetaFormDraft>(draftIdentity)
        : null;
      if (draft) {
        const preventiveObjectiveType =
          draft.preventiveObjectiveType === "enfermedad" ? "enfermedad" : "plaga";
        const draftFitosanidad = discardEmptyReactiveApplicationsWithoutActiveFindings(
          discardEmptyReactiveApplicationsForDeletedTargets(
            sanitizeDraftFitosanidad(
              Array.isArray(draft.fitosanidadApps) ? draft.fitosanidadApps : [],
              catalogos
            ),
            locallyDeletedTargetIds
          ),
          localConsData
        );
        const draftMezclas = sanitizeDraftMezclas(
          Array.isArray(draft.mezclas) ? draft.mezclas : [],
          draftFitosanidad,
          catalogos.coadyuvantes
        );
        const draftFertilizaciones = sanitizeDraftFertilizaciones(
          Array.isArray(draft.fertilizaciones) ? draft.fertilizaciones : [],
          catalogos.fertilizantes
        );
        const preventiveTargetIsValid = currentPreventiveTargets.some(
          (target) =>
            target.id === draft.preventiveTargetId &&
            target.type === preventiveObjectiveType
        );

        setPreventiveObjectiveType(preventiveObjectiveType);
        setPreventiveTargetId(
          preventiveTargetIsValid ? (draft.preventiveTargetId ?? "") : ""
        );
        setFitosanidadApps(draftFitosanidad);
        setMezclas(draftMezclas);
        setPreventiveNutrientId(
          currentNutrients.some((item) => item.id === draft.preventiveNutrientId)
            ? (draft.preventiveNutrientId ?? "")
            : ""
        );
        setFertilizaciones(
          mergeNutritionFertilizations(draftFertilizaciones, localConsData)
        );
        setRiegoSelection(
          draft.riegoSelection && VALID_RIEGO_RECOMMENDATIONS.has(draft.riegoSelection)
            ? draft.riegoSelection
            : null
        );
        setLaborSelections(
          new Set(
            (Array.isArray(draft.laborSelections) ? draft.laborSelections : []).filter(
              (labor) => VALID_LABOR_RECOMMENDATIONS.has(labor)
            )
          )
        );
      }

      setIsDraftReady(true);
      setIsLoading(false);
      void refreshConsolidacionFromRemote(
        vId,
        localConsData,
        catalogos.tiposControl,
        requestId,
        locallyDeletedTargetIds
      );
    } catch (err) {
      if (!isActiveLoad(requestId)) {
        return;
      }
      setError(toApiError(err).message || "No se pudo cargar la receta.");
      setIsLoading(false);
    }
  }

  async function refreshConsolidacionFromRemote(
    vId: string,
    localConsData: ConsolidacionHallazgo,
    controlCatalog: TipoControlCatalogItem[],
    requestId: number,
    locallyDeletedTargetIds: ReadonlySet<string>
  ) {
    try {
      const remoteConsData = excludeLocallyDeletedFitosanidadFindings(
        await visitaRecetasService.fetchConsolidacionFromRemote(vId),
        locallyDeletedTargetIds
      );

      if (!isActiveLoad(requestId)) {
        return;
      }

      const resolvedFitosanidad = hasFitosanidadFindings(remoteConsData)
        ? remoteConsData
        : hasFitosanidadFindings(localConsData)
          ? mergeFitosanidadConsolidacion(remoteConsData, localConsData)
          : remoteConsData;
      const resolvedConsData = {
        ...resolvedFitosanidad,
        nutricion: mergeNutritionConsolidacion(
          resolvedFitosanidad.nutricion,
          localConsData.nutricion
        )
      };

      setConsolidacion(resolvedConsData);
      setFertilizaciones((current) =>
        mergeNutritionFertilizations(current, resolvedConsData)
      );

      setFitosanidadApps((prev) => {
        const reconciled = discardEmptyReactiveApplicationsWithoutActiveFindings(
          prev,
          resolvedConsData
        );
        const merged = mergeMissingFitosanidadFindings(
          reconciled,
          resolvedConsData,
          resolveDefaultControlId(controlCatalog)
        );
        if (merged.addedCount === 0 && reconciled.length === prev.length) return prev;

        if (merged.addedCount > 0) {
          setMezclas((current) =>
            appendMezclasForNewFindings(current, merged.addedCount)
          );
        }
        return merged.applications;
      });
    } catch {
      // La receta ya funciona con datos locales; la red no debe bloquear esta vista.
    }
  }

  function hasFitosanidadFindings(cons: ConsolidacionHallazgo | null) {
    return Boolean(cons && (cons.plagas.length > 0 || cons.enfermedades.length > 0));
  }

  function mergeFitosanidadConsolidacion(
    remoteCons: ConsolidacionHallazgo | null,
    localCons: ConsolidacionHallazgo
  ): ConsolidacionHallazgo {
    return {
      ...(remoteCons ?? localCons),
      plagas: localCons.plagas,
      enfermedades: localCons.enfermedades
    };
  }

  function mergeNutritionConsolidacion(
    remote: ConsolidacionHallazgo["nutricion"],
    local: ConsolidacionHallazgo["nutricion"]
  ) {
    const localByName = new Map(
      local.map((item) => [item.elemento.trim().toLocaleLowerCase("es"), item])
    );
    const merged = remote.map((item) => {
      if (item.nutrienteId) return item;
      const localItem = localByName.get(item.elemento.trim().toLocaleLowerCase("es"));
      return localItem?.nutrienteId
        ? { ...item, nutrienteId: localItem.nutrienteId }
        : item;
    });
    const remoteIds = new Set(
      merged.map((item) => item.nutrienteId).filter((id): id is string => Boolean(id))
    );
    return [
      ...merged,
      ...local.filter((item) => item.nutrienteId && !remoteIds.has(item.nutrienteId))
    ];
  }

  function restoreFromReceta(
    receta: VisitaRecetaCompleta,
    ingredientCatalog: IngredienteActivoCatalogItem[],
    commercialCatalog: MarcaProductoCatalogItem[],
    fertilizerCatalog: FertilizanteCatalogItem[],
    controlCatalog: TipoControlCatalogItem[],
    consolidationData: ConsolidacionHallazgo
  ) {
    const restoredApplications = discardEmptyReactiveApplicationsWithoutActiveFindings(
      restoreFitosanidadApps(receta.mezclas, ingredientCatalog, commercialCatalog),
      consolidationData
    );
    const merged = mergeMissingFitosanidadFindings(
      restoredApplications,
      consolidationData
    );

    setFitosanidadApps(
      applyDefaultFitosanidadControl(merged.applications, controlCatalog)
    );
    setMezclas(
      appendMezclasForNewFindings(restoreMezclas(receta.mezclas), merged.addedCount)
    );
    setFertilizaciones(
      mergeNutritionFertilizations(
        restoreFertilizaciones(receta.fertilizacion, fertilizerCatalog),
        consolidationData
      )
    );

    if (receta.riego) {
      setRiegoSelection(receta.riego.tipoRecomendacion);
    }

    setLaborSelections(new Set(receta.labores.map((l) => l.labor)));
  }

  function initFitosanidadFromConsolidacion(
    cons: ConsolidacionHallazgo,
    controlCatalog: TipoControlCatalogItem[],
    volumenPorDefecto = ""
  ) {
    const merged = mergeMissingFitosanidadFindings(
      [],
      cons,
      resolveDefaultControlId(controlCatalog)
    );
    setFitosanidadApps(merged.applications);
    setMezclas(
      deriveMezclaFactors(
        merged.applications,
        appendMezclasForNewFindings([], merged.addedCount, volumenPorDefecto)
      )
    );
  }

  function updateFitosanidadApp(index: number, patch: Partial<AppFitosanidad>) {
    setFitosanidadApps((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], ...patch };

      updated[index] = current;
      return updated;
    });
  }

  function addIngrediente(applicationIndex: number) {
    closeDropdown();
    const projected = fitosanidadApps.map((application, index) =>
      index === applicationIndex
        ? {
            ...application,
            ingredientes: [...application.ingredientes, createEmptyIngrediente(0)]
          }
        : application
    );
    setFitosanidadApps(projected);
    setMezclas((current) => regenerateMezclas(current, projected));
    const application = projected[applicationIndex];
    if (application) {
      openRecipeCard(getFitosanidadCardKey(application.localId));
    }
  }

  function removeIngrediente(applicationIndex: number, ingredientIndex: number) {
    closeDropdown();
    const projected = fitosanidadApps.map((application, index) =>
      index === applicationIndex && application.ingredientes.length > 1
        ? {
            ...application,
            ingredientes: application.ingredientes.filter(
              (_, currentIndex) => currentIndex !== ingredientIndex
            )
          }
        : application
    );
    setFitosanidadApps(projected);
    setMezclas((current) => regenerateMezclas(current, projected));
  }

  function updateIngrediente(
    applicationIndex: number,
    ingredientIndex: number,
    patch: Partial<AppIngrediente>
  ) {
    const projected = fitosanidadApps.map((application, currentApplicationIndex) => {
      if (currentApplicationIndex !== applicationIndex) return application;

      return {
        ...application,
        ingredientes: application.ingredientes.map(
          (ingredient, currentIngredientIndex) =>
            currentIngredientIndex === ingredientIndex
              ? recalculateIngrediente(
                  { ...ingredient, ...patch },
                  mezclas.find(
                    (mezcla) =>
                      mezcla.numero === (patch.mezclaNumero ?? ingredient.mezclaNumero)
                  )
                )
              : ingredient
        )
      };
    });
    setFitosanidadApps(projected);
    setMezclas((current) => regenerateMezclas(current, projected));
  }

  function regenerateMezclas(current: AppMezcla[], applications: AppFitosanidad[]) {
    return deriveMezclaFactors(applications, current).map((mezcla) => {
      const coadyuvanteNames = mezcla.coadyuvantesIds
        .map((id) => coadyuvantes.find((item) => item.id === id)?.name ?? "")
        .filter(Boolean);
      const commercialNames = applications.flatMap((application) =>
        application.ingredientes
          .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
          .map((ingredient) => ingredient.marcaProductoNombre)
          .filter(Boolean)
      );
      const totalProductos = applications.reduce((sum, application) => {
        return (
          sum +
          application.ingredientes
            .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
            .reduce(
              (acc, ing) =>
                acc +
                (calculateTotal(
                  ing.dosisProducto,
                  mezcla.volumenAplicacion,
                  mezcla.factor
                ) || 0),
              0
            )
        );
      }, 0);
      return {
        ...mezcla,
        ordenMezcla: generateOrdenMezcla(coadyuvanteNames, commercialNames),
        cantidadTotalProducto: totalProductos ? totalProductos.toFixed(2) : ""
      };
    });
  }

  function addPreventiveFitosanidad() {
    closeDropdown();
    const target = availablePreventiveTargets.find(
      (item) => item.id === preventiveTargetId
    );
    if (!target) {
      setSubmitError("Selecciona una plaga o enfermedad disponible para prevencion.");
      return;
    }

    const nextNumber =
      fitosanidadApps.reduce(
        (maximum, application) => Math.max(maximum, application.numero),
        0
      ) + 1;
    const application = createPreventiveFitosanidad(
      nextNumber,
      preventiveObjectiveType,
      target.id,
      target.name,
      resolveDefaultControlId(tiposControl)
    );
    const projected = [...fitosanidadApps, application];
    setFitosanidadApps(projected);
    setMezclas((current) =>
      deriveMezclaFactors(
        projected,
        appendMezclasForNewFindings(current, 1, current[0]?.volumenAplicacion ?? "")
      )
    );
    openRecipeCard(getFitosanidadCardKey(application.localId));
    setIsPreventiveFitoExpanded(false);
    setPreventiveTargetId("");
    setSubmitError(null);
    if (tutorialStepId === recipeTutorialTarget.preventiveFitoAdd) {
      setTutorialCreatedPreventiveFitoId(application.localId);
      setTutorialHistory((history) => [
        ...history.filter(
          (id) =>
            id !== recipeTutorialTarget.preventiveFitoCard &&
            id !== recipeTutorialTarget.preventiveFitoType &&
            id !== recipeTutorialTarget.preventiveFitoTarget &&
            id !== recipeTutorialTarget.preventiveFitoAdd
        ),
        recipeTutorialTarget.preventiveFitoCard
      ]);
      setTutorialStepId(recipeTutorialTarget.fitoCard(application.localId));
    }
  }

  function removePreventiveFitosanidad(applicationIndex: number) {
    closeDropdown();
    const removedApplication = fitosanidadApps[applicationIndex];
    const projected = fitosanidadApps.filter(
      (_, currentIndex) => currentIndex !== applicationIndex
    );
    const nextMezclas = regenerateMezclas(mezclas, projected);
    setFitosanidadApps(projected);
    setMezclas(nextMezclas);
    reconcileActiveRecipeCard(projected, fertilizaciones);
    if (
      tutorialStepId !== null &&
      removedApplication?.localId === tutorialCreatedPreventiveFitoId
    ) {
      setTutorialCreatedPreventiveFitoId(null);
      setTutorialHistory([]);
      setIsPreventiveFitoExpanded(false);
      setTutorialStepId(recipeTutorialTarget.preventiveFitoCard);
    }
  }

  function addPreventiveFertilizacion() {
    closeDropdown();
    const nutrient = preventiveNutrientId
      ? availablePreventiveNutrients.find((item) => item.id === preventiveNutrientId)
      : null;
    if (preventiveNutrientId && !nutrient) {
      setSubmitError("El nutriente seleccionado ya no esta disponible.");
      return;
    }
    const fertilizacion = createPreventiveFertilizacion(
      nutrient ?? null,
      fertilizaciones[0]?.volumenAplicacion ?? ""
    );
    setFertilizaciones((prev) => [...prev, fertilizacion]);
    const group = groupRecipeFertilizaciones([fertilizacion])[0];
    if (group) openRecipeCard(getFertilizacionCardKey(group.key));
    setIsPreventiveFertilizationExpanded(false);
    setPreventiveNutrientId("");
    setSubmitError(null);
    if (tutorialStepId === recipeTutorialTarget.preventiveFertilizationAdd && group) {
      setTutorialCreatedPreventiveFertilizationId(fertilizacion.localId);
      setTutorialHistory((history) => [
        ...history.filter(
          (id) =>
            id !== recipeTutorialTarget.preventiveFertilizationCard &&
            id !== recipeTutorialTarget.preventiveFertilizationNutrient &&
            id !== recipeTutorialTarget.preventiveFertilizationAdd
        ),
        recipeTutorialTarget.preventiveFertilizationCard
      ]);
      setTutorialStepId(
        recipeTutorialTarget.preventiveFertilizationCreatedCard(fertilizacion.localId)
      );
    }
  }

  function addFertilizacionProduct(reference: AppFertilizacion) {
    closeDropdown();
    setFertilizaciones((prev) => [
      ...prev,
      {
        ...createEmptyFertilizacion(reference.volumenAplicacion, {
          nutrienteId: reference.nutrienteId,
          nutrienteNombre: reference.nutrienteNombre,
          enfoque: reference.enfoque ?? "reactivo",
          incidenceGrade: reference.incidenceGrade
        }),
        factor: reference.factor,
        factorEditable: reference.factorEditable
      }
    ]);
    const group = groupRecipeFertilizaciones([reference])[0];
    if (group) openRecipeCard(getFertilizacionCardKey(group.key));
  }

  function removeFertilizacion(localId: string) {
    closeDropdown();
    setFertilizaciones((prev) => prev.filter((item) => item.localId !== localId));
    if (tutorialStepId !== null && localId === tutorialCreatedPreventiveFertilizationId) {
      setTutorialCreatedPreventiveFertilizationId(null);
      setTutorialHistory([]);
      setIsPreventiveFertilizationExpanded(false);
      setTutorialStepId(recipeTutorialTarget.preventiveFertilizationCard);
    }
  }

  function removeFertilizacionGroup(reference: AppFertilizacion) {
    closeDropdown();
    const projected = fertilizaciones.filter(
      (item) =>
        !(
          item.nutrienteId === reference.nutrienteId && item.enfoque === reference.enfoque
        )
    );
    setFertilizaciones(projected);
    reconcileActiveRecipeCard(fitosanidadApps, projected);
    if (
      tutorialStepId !== null &&
      tutorialCreatedPreventiveFertilizationId !== null &&
      !projected.some((item) => item.localId === tutorialCreatedPreventiveFertilizationId)
    ) {
      setTutorialCreatedPreventiveFertilizationId(null);
      setTutorialHistory([]);
      setIsPreventiveFertilizationExpanded(false);
      setTutorialStepId(recipeTutorialTarget.preventiveFertilizationCard);
    }
  }

  function updateFertilizacion(index: number, patch: Partial<AppFertilizacion>) {
    setFertilizaciones((prev) => {
      const reference = prev[index];
      const updated = prev.map((fertilizacion, currentIndex) => {
        const sharesFactor =
          patch.factor !== undefined &&
          reference?.nutrienteId &&
          fertilizacion.nutrienteId === reference.nutrienteId &&
          fertilizacion.enfoque === reference.enfoque;
        if (currentIndex !== index && !sharesFactor) return fertilizacion;

        if (currentIndex !== index) {
          return recalculateFertilizacion({
            ...fertilizacion,
            factor: patch.factor ?? fertilizacion.factor
          });
        }

        const current = { ...fertilizacion, ...patch };
        if (patch.tipoProducto !== undefined) {
          const unit = getDosisUnit(current.unidadDosis);
          current.unidadDosis =
            unit && getFertilizacionDosisUnits(current.tipoProducto).includes(unit)
              ? getUnidadDosis(current)
              : "";
        } else if (patch.viaAplicacion !== undefined) {
          current.unidadDosis = getUnidadDosis(current);
        }

        return recalculateFertilizacion(current);
      });

      return updated;
    });
  }

  function handleSave() {
    if (!visitaId) return;
    const doseIssue = findFirstRecipeDoseIssue(fitosanidadApps, fertilizaciones);
    if (doseIssue) {
      closeDropdown();
      setActiveRecipeCardKey(doseIssue.cardKey);
      setRecipeFieldError(doseIssue.fieldKey);
      setSubmitError(doseIssue.message);
      if (doseIssue.field === "unidad") {
        const dropdownKey = resolveRecipeUnitDropdownKey(
          doseIssue.fieldKey,
          fitosanidadApps,
          fertilizaciones
        );
        if (dropdownKey) setOpenDropdown(dropdownKey);
      }
      setPendingRecipeIssue(doseIssue);
      return;
    }
    const recetaValidation = validateRecipeRecommendations(
      fitosanidadApps,
      fertilizaciones,
      riegoSelection,
      laborSelections
    );

    if (recetaValidation) {
      setSubmitError(recetaValidation);
      return;
    }

    flushDraft();
    if (draftIdentity) {
      writeVisitFormDraft(draftIdentity, draftValue);
    }
    router.push({
      pathname: "/visitas-campo/[id]/mezclas",
      params: { id: visitaId }
    });
  }

  function goBackToSteps() {
    if (!visitaId) {
      router.back();
      return;
    }
    router.replace({
      pathname: "/visitas-campo/[id]/labores-culturales",
      params: { id: visitaId }
    });
  }

  function toggleDropdown(key: string) {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  function closeDropdown() {
    setOpenDropdown(null);
  }

  function openRecipeCard(key: RecipeCardKey) {
    closeDropdown();
    setActiveRecipeCardKey(key);
  }

  function toggleRecipeCard(key: RecipeCardKey) {
    closeDropdown();
    setActiveRecipeCardKey((current) => toggleActiveRecipeCard(current, key));
  }

  function reconcileActiveRecipeCard(
    applications: AppFitosanidad[],
    currentFertilizaciones: AppFertilizacion[]
  ) {
    const cards = buildRecipeAccordionCards(applications, [], currentFertilizaciones);
    setActiveRecipeCardKey((current) => resolveRecipeCardAfterRemoval(current, cards));
  }

  function handleTutorialScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setTutorialScrollY(event.nativeEvent.contentOffset.y);
  }

  function openTutorial() {
    closeDropdown();
    setActiveRecipeCardKey(null);
    setIsPreventiveFitoExpanded(false);
    setIsPreventiveFertilizationExpanded(false);
    setTutorialNotice(null);
    setTutorialHistory([]);
    setTutorialCreatedPreventiveFitoId(null);
    setTutorialCreatedPreventiveFertilizationId(null);
    setTutorialStepId(tutorialSteps[0]?.id ?? null);
  }

  function closeTutorial() {
    setTutorialStepId(null);
    setTutorialHistory([]);
    setTutorialCreatedPreventiveFitoId(null);
    setTutorialCreatedPreventiveFertilizationId(null);
  }

  function goToPreviousTutorialStep() {
    const { previousId, remainingHistory } = takePreviousTutorialStep(tutorialHistory);
    if (!previousId) return;

    setTutorialHistory(remainingHistory);
    const previousStep = tutorialSteps.find((step) => step.id === previousId);
    if (previousId === recipeTutorialTarget.preventiveFitoCard) {
      setIsPreventiveFitoExpanded(false);
    }
    if (previousId === recipeTutorialTarget.preventiveFertilizationCard) {
      setIsPreventiveFertilizationExpanded(false);
    }
    if (previousStep?.cardKey && !previousStep.autoAdvanceWhenComplete) {
      setOpenDropdown(null);
      setActiveRecipeCardKey(previousStep.cardKey as RecipeCardKey);
    }
    setTutorialStepId(previousId);
  }

  function goToNextTutorialStep() {
    if (!currentTutorialStep) return;

    const nextStep = getNextTutorialStep(tutorialSteps, currentTutorialStep.id);
    if (!nextStep) {
      setTutorialStepId(null);
      setTutorialHistory([]);
      setTutorialCreatedPreventiveFitoId(null);
      setTutorialCreatedPreventiveFertilizationId(null);
      setTutorialNotice(
        "Tutorial terminado. Revisa las recomendaciones y continua a mezclas cuando estes listo."
      );
      return;
    }

    if (
      currentTutorialStep.id === recipeTutorialTarget.preventiveFitoCard &&
      !currentTutorialStep.isComplete
    ) {
      setIsPreventiveFitoExpanded(false);
    }
    if (
      currentTutorialStep.id === recipeTutorialTarget.preventiveFertilizationCard &&
      !currentTutorialStep.isComplete
    ) {
      setIsPreventiveFertilizationExpanded(false);
    }

    setTutorialHistory((history) => [...history, currentTutorialStep.id]);
    if (nextStep.cardKey && !nextStep.autoAdvanceWhenComplete) {
      setOpenDropdown(null);
      setActiveRecipeCardKey(nextStep.cardKey as RecipeCardKey);
    }
    setTutorialStepId(nextStep.id);
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centeredContainer}>
          <AppText variant="muted">Cargando receta...</AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.centeredContainer}>
          <AppText variant="heading">Error</AppText>
          <AppText variant="muted">{error}</AppText>
          <AppButton label="Volver" onPress={() => goBackToSteps()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <FormScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={handleTutorialScroll}
        ref={formScrollRef}
        scrollEnabled={tutorialStepId === null}
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
                onPress={goBackToSteps}
                style={styles.backIconButton}
              >
                <Ionicons color="#ffffff" name="arrow-back" size={24} />
              </Pressable>
              <AppText style={styles.topBarTitle} variant="heading">
                Receta
              </AppText>
              <Pressable
                accessibilityLabel="Iniciar tutorial de receta"
                accessibilityRole="button"
                onPress={openTutorial}
                style={styles.tutorialButton}
              >
                <Ionicons color={theme.colors.primaryDark} name="navigate" size={17} />
                <AppText style={styles.tutorialButtonText} variant="label">
                  Tutorial
                </AppText>
              </Pressable>
            </View>
          </SafeAreaView>

          <View style={styles.heroContent}>
            <AppText style={styles.heroTitle} variant="title">
              Recomendaciones tecnicas
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              {consolidacion?.etapaFenologica ?? "Etapa fenologica"}
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {consolidacion ? <ConsolidacionPanel data={consolidacion} /> : null}

          <SectionHeader
            icon="flask"
            label="Fitosanidad"
            subtitle={`${fitosanidadApps.reduce(
              (total, application) => total + application.ingredientes.length,
              0
            )} producto(s) en ${fitosanidadApps.length} aplicación(es)`}
          />

          {fitosanidadApps.length === 0 ? (
            <AppCard>
              <AppText variant="muted">
                No se detectaron plagas ni enfermedades con incidencia positiva.
              </AppText>
            </AppCard>
          ) : (
            fitosanidadApps.map((app, index) => (
              <View
                key={app.localId}
                ref={(node) => {
                  tutorialTargets.current[recipeTutorialTarget.fitoCard(app.localId)] =
                    node;
                }}
              >
                <FitosanidadCard
                  index={index}
                  ingredientesActivos={ingredientesActivos}
                  isComplete={isFitosanidadCardComplete(app)}
                  isExpanded={activeRecipeCardKey === getFitosanidadCardKey(app.localId)}
                  marcasProducto={marcasProducto}
                  modosAccion={modosAccion}
                  onAddIngrediente={() => addIngrediente(index)}
                  onChange={(patch) => updateFitosanidadApp(index, patch)}
                  onChangeIngrediente={(ingredientIndex, patch) =>
                    updateIngrediente(index, ingredientIndex, patch)
                  }
                  onCloseDropdown={closeDropdown}
                  onClearFieldError={(fieldKey) => {
                    setRecipeFieldError((current) =>
                      current === fieldKey ? null : current
                    );
                  }}
                  onCardLayout={(cardKey, y) => {
                    recipeCardOffsets.current[cardKey] = y;
                  }}
                  onDoseInputLayout={(fieldKey, y) => {
                    recipeFieldOffsets.current[fieldKey] = y;
                  }}
                  onDoseInputRef={(fieldKey, ref) => {
                    doseInputRefs.current[fieldKey] = ref;
                  }}
                  onToggle={() => toggleRecipeCard(getFitosanidadCardKey(app.localId))}
                  onRemoveIngrediente={(ingredientIndex) =>
                    removeIngrediente(index, ingredientIndex)
                  }
                  onRemoveApplication={
                    app.enfoque === "preventivo"
                      ? () => removePreventiveFitosanidad(index)
                      : undefined
                  }
                  onTutorialTarget={(targetKey, node) => {
                    tutorialTargets.current[targetKey] = node;
                  }}
                  openDropdown={openDropdown}
                  recipeFieldError={recipeFieldError}
                  tiposControl={tiposControl}
                  tiposProducto={tiposProducto}
                  toggleDropdown={toggleDropdown}
                  onNavegarCatalogo={(tipo, ingredienteActivoId) =>
                    router.push(
                      `/productos/nuevo?tipoPredefinido=${tipo}${
                        ingredienteActivoId
                          ? `&ingredienteActivoId=${encodeURIComponent(ingredienteActivoId)}`
                          : ""
                      }`
                    )
                  }
                  value={app}
                />
              </View>
            ))
          )}

          <View
            ref={(node) => {
              tutorialTargets.current[recipeTutorialTarget.preventiveFitoCard] = node;
            }}
          >
            <AppCard style={styles.optionalActionCard}>
              <AppCollapsibleHeader
                closeLabel="Ocultar"
                icon="shield-checkmark-outline"
                isExpanded={isPreventiveFitoExpanded}
                onToggle={() => {
                  if (
                    tutorialStepId === recipeTutorialTarget.preventiveFitoCard &&
                    !hasAvailablePreventiveTargets
                  ) {
                    return;
                  }
                  closeDropdown();
                  setIsPreventiveFitoExpanded((current) => !current);
                }}
                openLabel="Agregar"
                statusLabel="Opcional"
                subtitle="Úsala solo cuando necesites prevenir una plaga o enfermedad."
                title="Agregar prevención fitosanitaria"
              />
              {isPreventiveFitoExpanded ? (
                <View style={styles.optionalActionContent}>
                  <AppSelectField
                    containerRef={(node) => {
                      tutorialTargets.current[recipeTutorialTarget.preventiveFitoType] =
                        node;
                    }}
                    icon="shield-outline"
                    label="Tipo de objetivo"
                    options={[
                      { value: "plaga", label: "Plaga" },
                      { value: "enfermedad", label: "Enfermedad" }
                    ]}
                    placeholder="Seleccionar tipo"
                    selectedLabel={
                      preventiveObjectiveType === "plaga" ? "Plaga" : "Enfermedad"
                    }
                    isOpen={openDropdown === recipeTutorialTarget.preventiveFitoType}
                    onClose={closeDropdown}
                    onToggle={() =>
                      toggleDropdown(recipeTutorialTarget.preventiveFitoType)
                    }
                    onSelect={(value) => {
                      setPreventiveObjectiveType(value as "plaga" | "enfermedad");
                      setPreventiveTargetId("");
                    }}
                  />
                  <AppSelectField
                    containerRef={(node) => {
                      tutorialTargets.current[recipeTutorialTarget.preventiveFitoTarget] =
                        node;
                    }}
                    icon="leaf-outline"
                    label="Objetivo preventivo"
                    options={availablePreventiveTargets.map((target) => ({
                      value: target.id,
                      label: target.name
                    }))}
                    placeholder={
                      availablePreventiveTargets.length > 0
                        ? "Seleccionar objetivo"
                        : "No hay objetivos disponibles"
                    }
                    selectedLabel={
                      availablePreventiveTargets.find(
                        (target) => target.id === preventiveTargetId
                      )?.name
                    }
                    isOpen={openDropdown === recipeTutorialTarget.preventiveFitoTarget}
                    onClose={closeDropdown}
                    onToggle={() =>
                      toggleDropdown(recipeTutorialTarget.preventiveFitoTarget)
                    }
                    onSelect={setPreventiveTargetId}
                  />
                  <View
                    ref={(node) => {
                      tutorialTargets.current[recipeTutorialTarget.preventiveFitoAdd] =
                        node;
                    }}
                  >
                    <AddItemButton
                      accessibilityLabel="Agregar recomendacion fitosanitaria preventiva"
                      label="Agregar prevencion"
                      onPress={addPreventiveFitosanidad}
                    />
                  </View>
                </View>
              ) : null}
            </AppCard>
          </View>

          <SectionHeader
            icon="nutrition"
            label="Fertilización"
            subtitle={`${fertilizacionGroups.length} deficiencia(s) atendida(s)`}
          />

          {fertilizacionGroups.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <Ionicons
                color={theme.colors.textMuted}
                name="nutrition-outline"
                size={28}
              />
              <AppText style={styles.emptyProductsTitle} variant="label">
                No hay deficiencias nutricionales registradas
              </AppText>
              <AppText style={styles.emptyProductsText} variant="muted">
                Evalúa un nutriente o agrega una recomendación preventiva.
              </AppText>
            </View>
          ) : null}

          {fertilizacionGroups.map((group, groupIndex) => {
            const reference = group.productos[0]!;
            const isPreventive = reference.enfoque === "preventivo";
            const targetLabel = formatFertilizationTarget(
              reference.enfoque,
              reference.nutrienteId,
              reference.nutrienteNombre
            );
            const cardKey = getFertilizacionCardKey(group.key);
            const isExpanded = activeRecipeCardKey === cardKey;
            return (
              <View
                key={group.key}
                ref={(node) => {
                  tutorialTargets.current[
                    recipeTutorialTarget.fertilizerCard(group.key)
                  ] = node;
                }}
                onLayout={(event) => {
                  recipeCardOffsets.current[cardKey] = event.nativeEvent.layout.y;
                }}
                style={styles.fertilizacionGroupCard}
              >
                <RecipeAccordionHeader
                  action={
                    isPreventive ? (
                      <RemoveItemButton
                        accessibilityLabel={`Quitar recomendación preventiva de ${targetLabel}`}
                        label="Quitar"
                        onPress={() => removeFertilizacionGroup(reference)}
                      />
                    ) : null
                  }
                  badge={String(groupIndex + 1)}
                  isComplete={isFertilizacionGroupComplete(group.productos)}
                  isExpanded={isExpanded}
                  onToggle={() => toggleRecipeCard(cardKey)}
                  subtitle={`${isPreventive ? "Preventivo" : "Curativo"}${
                    !isPreventive && reference.incidenceGrade !== null
                      ? ` · Grado ${reference.incidenceGrade}`
                      : ""
                  } · ${group.productos.length} producto(s)`}
                  title={targetLabel}
                />

                {isExpanded
                  ? group.productos.map((fertilizacion, productIndex) => {
                      const index = fertilizaciones.findIndex(
                        (item) => item.localId === fertilizacion.localId
                      );
                      return (
                        <FertilizacionCard
                          canRemove={group.productos.length > 1}
                          fertilizantes={fertilizantes}
                          key={fertilizacion.localId}
                          productIndex={productIndex}
                          onChange={(patch) => updateFertilizacion(index, patch)}
                          onCloseDropdown={closeDropdown}
                          onClearFieldError={(fieldKey) => {
                            setRecipeFieldError((current) =>
                              current === fieldKey ? null : current
                            );
                          }}
                          onDoseInputLayout={(fieldKey, y) => {
                            recipeFieldOffsets.current[fieldKey] = y;
                          }}
                          onDoseInputRef={(fieldKey, ref) => {
                            doseInputRefs.current[fieldKey] = ref;
                          }}
                          onRemove={() => removeFertilizacion(fertilizacion.localId)}
                          onTutorialTarget={(targetKey, node) => {
                            tutorialTargets.current[targetKey] = node;
                          }}
                          openDropdown={openDropdown}
                          recipeFieldError={recipeFieldError}
                          toggleDropdown={toggleDropdown}
                          onNavegarCatalogo={(tipo, ingredienteActivoId) =>
                            router.push(
                              `/productos/nuevo?tipoPredefinido=${tipo}${
                                ingredienteActivoId
                                  ? `&ingredienteActivoId=${encodeURIComponent(ingredienteActivoId)}`
                                  : ""
                              }`
                            )
                          }
                          value={fertilizacion}
                        />
                      );
                    })
                  : null}
                {isExpanded && (reference.nutrienteId || isPreventive) ? (
                  <AddItemButton
                    accessibilityLabel={`Agregar fertilizante para ${targetLabel}`}
                    label="Agregar otro producto"
                    onPress={() => addFertilizacionProduct(reference)}
                  />
                ) : null}
              </View>
            );
          })}

          <View
            ref={(node) => {
              tutorialTargets.current[recipeTutorialTarget.preventiveFertilizationCard] =
                node;
            }}
            style={styles.preventiveFertilizationCard}
          >
            <AppCollapsibleHeader
              closeLabel="Ocultar"
              icon="add-circle-outline"
              isExpanded={isPreventiveFertilizationExpanded}
              onToggle={() => {
                closeDropdown();
                setIsPreventiveFertilizationExpanded((current) => !current);
              }}
              openLabel="Agregar"
              statusLabel="Opcional"
              subtitle="Puedes asociarla a un nutriente no evaluado o dejarla como general."
              title="Agregar fertilización"
            />
            {isPreventiveFertilizationExpanded ? (
              <View style={styles.optionalActionContent}>
                <AppSelectField
                  containerRef={(node) => {
                    tutorialTargets.current[
                      recipeTutorialTarget.preventiveFertilizationNutrient
                    ] = node;
                  }}
                  icon="nutrition-outline"
                  label="Nutriente (opcional)"
                  options={availablePreventiveNutrients.map((item) => ({
                    value: item.id,
                    label: item.name
                  }))}
                  placeholder="Sin nutriente: fertilización general"
                  selectedLabel={
                    nutrients.find((item) => item.id === preventiveNutrientId)?.name
                  }
                  isOpen={
                    openDropdown === recipeTutorialTarget.preventiveFertilizationNutrient
                  }
                  onClose={closeDropdown}
                  onToggle={() =>
                    toggleDropdown(recipeTutorialTarget.preventiveFertilizationNutrient)
                  }
                  onSelect={setPreventiveNutrientId}
                  searchable
                  searchPlaceholder="Buscar nutriente"
                />
                <View
                  ref={(node) => {
                    tutorialTargets.current[
                      recipeTutorialTarget.preventiveFertilizationAdd
                    ] = node;
                  }}
                >
                  <AppButton
                    icon="add-circle-outline"
                    label="Agregar fertilización"
                    onPress={addPreventiveFertilizacion}
                    size="small"
                    variant="outline"
                  />
                </View>
              </View>
            ) : null}
          </View>

          <View
            ref={(node) => {
              tutorialTargets.current[recipeTutorialTarget.riego] = node;
            }}
          >
            <RiegoSection onSelect={setRiegoSelection} selected={riegoSelection} />
          </View>

          <View
            ref={(node) => {
              tutorialTargets.current[recipeTutorialTarget.labores] = node;
            }}
          >
            <LaboresSection
              onToggle={(labor) => {
                setLaborSelections((prev) => toggleLaborRecommendation(prev, labor));
              }}
              selected={laborSelections}
            />
          </View>

          {submitError ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.submitErrorText} variant="label">
                {submitError}
              </AppText>
            </View>
          ) : null}

          {recetaData?.syncStatus === "error" && recetaData.syncErrorMessage ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.submitErrorText} variant="label">
                Error de sincronizacion: {recetaData.syncErrorMessage}
              </AppText>
            </View>
          ) : null}

          <View
            ref={(node) => {
              tutorialTargets.current[recipeTutorialTarget.continue] = node;
            }}
            style={styles.actions}
          >
            <AppButton
              icon="arrow-back-outline"
              label="Volver a Labores"
              onPress={goBackToSteps}
              variant="outline"
            />
            <Pressable
              accessibilityLabel="Continuar a mezclas"
              accessibilityRole="button"
              onPress={handleSave}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.pressedButton
              ]}
            >
              <AppText style={styles.continueButtonText} variant="heading">
                Continuar a mezclas
              </AppText>
              <Ionicons color="#ffffff" name="arrow-forward" size={22} />
            </Pressable>
          </View>
        </View>
      </FormScrollView>
      {tutorialNotice ? (
        <View style={styles.tutorialNotice}>
          <AppText style={styles.tutorialNoticeText} variant="label">
            {tutorialNotice}
          </AppText>
        </View>
      ) : null}
      {currentTutorialStep ? (
        <GuidedFormTutorial
          accentColor={theme.colors.primaryDark}
          canGoBack={tutorialHistory.length > 0}
          currentPosition={
            tutorialSteps.findIndex((step) => step.id === currentTutorialStep.id) + 1
          }
          onBack={goToPreviousTutorialStep}
          onClose={closeTutorial}
          onNext={goToNextTutorialStep}
          refreshKey={`${currentTutorialStep.id}:${openDropdown ?? "closed"}`}
          scrollRef={formScrollRef}
          scrollY={tutorialScrollY}
          step={currentTutorialStep}
          target={tutorialTargets.current[currentTutorialStep.targetKey] ?? null}
          totalSteps={tutorialSteps.length}
        />
      ) : null}
    </ScreenContainer>
  );
}

function SectionHeader({
  icon,
  label,
  subtitle
}: {
  icon: IoniconName;
  label: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons color={theme.colors.primaryDark} name={icon} size={22} />
      </View>
      <View style={styles.sectionHeaderText}>
        <AppText style={styles.sectionTitle} variant="heading">
          {label}
        </AppText>
        <AppText variant="muted">{subtitle}</AppText>
      </View>
    </View>
  );
}

function ConsolidacionPanel({ data }: { data: ConsolidacionHallazgo }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View
      style={[
        styles.consolidacionCard,
        isExpanded && styles.collapsibleSectionCardExpanded
      ]}
    >
      <AppCollapsibleHeader
        closeLabel="Ocultar detalles"
        icon="clipboard-outline"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((current) => !current)}
        openLabel="Ver detalles"
        subtitle={buildConsolidacionSummary(data)}
        title="Hallazgos consolidados"
      />

      {isExpanded ? (
        <View style={styles.collapsibleSectionContent}>
          {data.etapaFenologica ? (
            <AppText variant="muted" style={styles.consolidacionLine}>
              Etapa fenologica: {data.etapaFenologica}
            </AppText>
          ) : null}

          {data.plagas.length > 0 ? (
            <View style={styles.consolidacionGroup}>
              <AppText variant="label">Plagas detectadas</AppText>
              {data.plagas.map((p, i) => (
                <AppText key={i} variant="muted">
                  - {p.nombre}: Incidencia {p.incidencia}, Severidad {p.severidad}
                  {p.organos.length > 0 ? ` (${p.organos.join(", ")})` : ""}
                </AppText>
              ))}
            </View>
          ) : null}

          {data.enfermedades.length > 0 ? (
            <View style={styles.consolidacionGroup}>
              <AppText variant="label">Enfermedades detectadas</AppText>
              {data.enfermedades.map((e, i) => (
                <AppText key={i} variant="muted">
                  - {e.nombre}: Incidencia {e.incidencia}, Severidad {e.severidad}
                  {e.organos.length > 0 ? ` (${e.organos.join(", ")})` : ""}
                </AppText>
              ))}
            </View>
          ) : null}

          {data.nutricion.length > 0 ? (
            <View style={styles.consolidacionGroup}>
              <AppText variant="label">Nutricion</AppText>
              {data.nutricion.map((n, i) => (
                <AppText key={i} variant="muted">
                  - {n.elemento}: Incidencia {n.incidencia}, Severidad {n.severidad}
                </AppText>
              ))}
            </View>
          ) : null}

          {data.riego.humedadSuelo ? (
            <View style={styles.consolidacionGroup}>
              <AppText variant="label">Riego</AppText>
              <AppText variant="muted">
                Humedad del suelo: {data.riego.humedadSuelo}
                {data.riego.estresHidrico ? " (estres hidrico)" : ""}
              </AppText>
            </View>
          ) : null}

          {data.labores.length > 0 ? (
            <View style={styles.consolidacionGroup}>
              <AppText variant="label">Labores detectadas</AppText>
              {data.labores.map((l, i) => (
                <AppText key={i} variant="muted">
                  - {l.nombre} ({l.categoria})
                </AppText>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function RecipeAccordionHeader({
  action,
  badge,
  isComplete,
  isExpanded,
  onToggle,
  subtitle,
  title
}: {
  action?: ReactNode;
  badge: string;
  isComplete: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <AppCollapsibleHeader
      action={action}
      badge={badge}
      isExpanded={isExpanded}
      onToggle={onToggle}
      statusLabel={isComplete ? "Completo" : "Incompleto"}
      statusTone={isComplete ? "success" : "warning"}
      subtitle={subtitle}
      title={title}
    />
  );
}

function FitosanidadCard({
  value,
  index,
  isComplete,
  isExpanded,
  ingredientesActivos,
  marcasProducto,
  tiposControl,
  tiposProducto,
  modosAccion,
  openDropdown,
  onAddIngrediente,
  onChange,
  onChangeIngrediente,
  onCloseDropdown,
  onCardLayout,
  onClearFieldError,
  onDoseInputLayout,
  onDoseInputRef,
  onRemoveApplication,
  onRemoveIngrediente,
  onToggle,
  onTutorialTarget,
  recipeFieldError,
  toggleDropdown,
  onNavegarCatalogo
}: {
  value: AppFitosanidad;
  index: number;
  isComplete: boolean;
  isExpanded: boolean;
  ingredientesActivos: IngredienteActivoCatalogItem[];
  marcasProducto: MarcaProductoCatalogItem[];
  tiposControl: TipoControlCatalogItem[];
  tiposProducto: TipoProductoFitosanitarioCatalogItem[];
  modosAccion: ModoAccionCatalogItem[];
  openDropdown: string | null;
  onAddIngrediente: () => void;
  onChange: (patch: Partial<AppFitosanidad>) => void;
  onChangeIngrediente: (index: number, patch: Partial<AppIngrediente>) => void;
  onCloseDropdown: () => void;
  onCardLayout: (cardKey: RecipeCardKey, y: number) => void;
  onClearFieldError: (fieldKey: string) => void;
  onDoseInputLayout: (fieldKey: string, y: number) => void;
  onDoseInputRef: (fieldKey: string, ref: TextInput | null) => void;
  onRemoveApplication?: () => void;
  onRemoveIngrediente: (index: number) => void;
  onToggle: () => void;
  onTutorialTarget: (targetKey: string, node: View | null) => void;
  recipeFieldError: string | null;
  toggleDropdown: (key: string) => void;
  onNavegarCatalogo: (tipo: string, ingredienteActivoId?: string) => void;
}) {
  const prefix = `fito_${index}`;

  return (
    <View
      onLayout={(event) =>
        onCardLayout(getFitosanidadCardKey(value.localId), event.nativeEvent.layout.y)
      }
      style={styles.fitosanidadCard}
    >
      <RecipeAccordionHeader
        action={
          onRemoveApplication ? (
            <RemoveItemButton
              accessibilityLabel={`Quitar prevencion para ${value.objetivoNombre}`}
              label="Quitar"
              onPress={onRemoveApplication}
            />
          ) : null
        }
        badge={String(value.numero).padStart(2, "0")}
        isComplete={isComplete}
        isExpanded={isExpanded}
        onToggle={onToggle}
        subtitle={`${value.ingredientes.length} producto(s) · ${
          value.enfoque === "preventivo" ? "Preventivo" : "Curativo"
        }`}
        title={`${value.objetivoNombre} (${value.objetivo === "plaga" ? "Plaga" : "Enfermedad"})`}
      />

      {isExpanded ? (
        <>
          <AppSelectField
            containerRef={(node) =>
              onTutorialTarget(recipeTutorialTarget.fitoControl(value.localId), node)
            }
            icon="shield-checkmark"
            label="Tipo de control"
            options={tiposControl.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Seleccionar tipo"
            selectedLabel={tiposControl.find((c) => c.id === value.tipoControlId)?.name}
            isOpen={openDropdown === recipeTutorialTarget.fitoControl(value.localId)}
            onClose={onCloseDropdown}
            onToggle={() =>
              toggleDropdown(recipeTutorialTarget.fitoControl(value.localId))
            }
            onSelect={(v) => onChange({ tipoControlId: v })}
          />

          <View style={styles.ingredientList}>
            {value.ingredientes.map((ingredient, ingredientIndex) => (
              <IngredienteCard
                canRemove={value.ingredientes.length > 1}
                index={ingredientIndex}
                ingredientesActivos={ingredientesActivos}
                key={ingredient.localId}
                marcasProducto={marcasProducto}
                modosAccion={modosAccion}
                onChange={(patch) => onChangeIngrediente(ingredientIndex, patch)}
                onCloseDropdown={onCloseDropdown}
                onClearFieldError={onClearFieldError}
                onDoseInputLayout={onDoseInputLayout}
                onDoseInputRef={onDoseInputRef}
                onRemove={() => onRemoveIngrediente(ingredientIndex)}
                onTutorialTarget={onTutorialTarget}
                openDropdown={openDropdown}
                prefix={`${prefix}_ingrediente_${ingredientIndex}`}
                recipeFieldError={recipeFieldError}
                tiposProducto={tiposProducto}
                toggleDropdown={toggleDropdown}
                onNavegarCatalogo={onNavegarCatalogo}
                total={value.ingredientes.length}
                value={ingredient}
                applicationId={value.localId}
                fieldPrefix={`fitosanidad:${value.localId}:${ingredient.localId}`}
              />
            ))}
          </View>

          <AddItemButton
            accessibilityLabel={`Agregar otro producto para ${value.objetivoNombre}`}
            label="Agregar otro producto"
            onPress={onAddIngrediente}
          />
        </>
      ) : null}
    </View>
  );
}

function IngredienteCard({
  applicationId,
  value,
  index,
  total,
  prefix,
  fieldPrefix,
  canRemove,
  ingredientesActivos,
  marcasProducto,
  modosAccion,
  tiposProducto,
  openDropdown,
  onChange,
  onCloseDropdown,
  onClearFieldError,
  onDoseInputLayout,
  onDoseInputRef,
  onRemove,
  onTutorialTarget,
  toggleDropdown,
  onNavegarCatalogo,
  recipeFieldError
}: {
  applicationId: string;
  value: AppIngrediente;
  index: number;
  total: number;
  prefix: string;
  fieldPrefix: string;
  canRemove: boolean;
  ingredientesActivos: IngredienteActivoCatalogItem[];
  marcasProducto: MarcaProductoCatalogItem[];
  modosAccion: ModoAccionCatalogItem[];
  tiposProducto: TipoProductoFitosanitarioCatalogItem[];
  openDropdown: string | null;
  onChange: (patch: Partial<AppIngrediente>) => void;
  onCloseDropdown: () => void;
  onClearFieldError: (fieldKey: string) => void;
  onDoseInputLayout: (fieldKey: string, y: number) => void;
  onDoseInputRef: (fieldKey: string, ref: TextInput | null) => void;
  onRemove: () => void;
  onTutorialTarget: (targetKey: string, node: View | null) => void;
  toggleDropdown: (key: string) => void;
  onNavegarCatalogo: (tipo: string, ingredienteActivoId?: string) => void;
  recipeFieldError: string | null;
}) {
  const ingredienteActivoOptions = getIngredientOptions(
    ingredientesActivos,
    marcasProducto,
    tiposProducto
  );
  const nombreComercialOptions = getCommercialOptions(
    value.ingredienteActivoId,
    ingredientesActivos,
    marcasProducto,
    tiposProducto
  );
  const tipoProductoNombre = tiposProducto.find(
    (item) => item.id === value.tipoProductoId
  )?.name;

  function handleNombreComercialSelect(marcaProductoId: string) {
    const selected = nombreComercialOptions.find(
      (option) => option.id === marcaProductoId
    );
    if (!selected) return;

    const patch = buildCommercialSelectionPatch(
      selected,
      ingredientesActivos,
      tiposProducto
    );
    if (patch) onChange(patch);
  }

  return (
    <View style={styles.ingredientCard}>
      <View style={styles.itemCardHeader}>
        <View style={styles.itemCardTitle}>
          <Ionicons color={theme.colors.primary} name="leaf-outline" size={20} />
          <AppText variant="label">
            Ingrediente activo {index + 1} de {total}
          </AppText>
        </View>
        {canRemove ? (
          <RemoveItemButton
            accessibilityLabel={`Quitar ingrediente activo ${index + 1}`}
            label="Quitar"
            onPress={onRemove}
          />
        ) : null}
      </View>

      <AppSelectField
        emptyMessage="No hay ingredientes activos relacionados con una marca vigente."
        icon="leaf-outline"
        label="Ingrediente activo (i.a.)"
        options={ingredienteActivoOptions.map((item) => ({
          value: item.id,
          label: item.name
        }))}
        placeholder="Seleccionar ingrediente activo"
        selectedLabel={value.ingredienteActivoNombre || undefined}
        isOpen={openDropdown === `${prefix}_ingrediente_activo`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_ingrediente_activo`)}
        onSelect={(ingredienteActivoId) =>
          onChange(
            buildIngredientSelectionPatch(
              ingredienteActivoId,
              ingredientesActivos,
              marcasProducto,
              tiposProducto
            )
          )
        }
        searchable
        searchPlaceholder="Buscar ingrediente activo"
      />

      <AppButton
        icon="add-circle-outline"
        label="Nuevo ingrediente"
        onPress={() => onNavegarCatalogo("ingrediente")}
        size="small"
        variant="outline"
      />

      <AppSelectField
        containerRef={(node) =>
          onTutorialTarget(
            recipeTutorialTarget.fitoBrand(applicationId, value.localId),
            node
          )
        }
        emptyMessage={
          value.ingredienteActivoId
            ? "No hay nombres comerciales relacionados con el ingrediente."
            : "No hay nombres comerciales vigentes."
        }
        icon="pricetag-outline"
        label="Nombre comercial"
        options={nombreComercialOptions.map((item) => ({
          value: item.id,
          label: item.name,
          helper: [
            ingredientesActivos.find(
              (ingrediente) => ingrediente.id === item.ingredienteActivoId
            )?.name,
            tiposProducto.find((tipo) => tipo.id === item.tipoProductoId)?.name
          ]
            .filter(Boolean)
            .join(" · ")
        }))}
        placeholder="Seleccionar nombre comercial"
        selectedLabel={value.marcaProductoNombre || undefined}
        isOpen={
          openDropdown === recipeTutorialTarget.fitoBrand(applicationId, value.localId)
        }
        onClose={onCloseDropdown}
        onToggle={() =>
          toggleDropdown(recipeTutorialTarget.fitoBrand(applicationId, value.localId))
        }
        onSelect={handleNombreComercialSelect}
        searchable
        searchPlaceholder="Buscar nombre comercial o ingrediente activo"
      />

      <AppButton
        icon="add-circle-outline"
        label="Nueva marca"
        onPress={() => onNavegarCatalogo("marca", value.ingredienteActivoId)}
        size="small"
        variant="outline"
      />

      <AppInput
        accessibilityLabel="Tipo de producto calculado"
        editable={false}
        label="Tipo de producto"
        placeholder="Se completa al elegir nombre comercial"
        value={tipoProductoNombre ?? ""}
      />

      <AppSelectField
        containerRef={(node) =>
          onTutorialTarget(
            recipeTutorialTarget.fitoAction(applicationId, value.localId),
            node
          )
        }
        icon="move"
        label="Modo de accion"
        options={modosAccion.map((item) => ({ value: item.id, label: item.name }))}
        placeholder="Seleccionar modo"
        selectedLabel={modosAccion.find((item) => item.id === value.modoAccionId)?.name}
        isOpen={
          openDropdown === recipeTutorialTarget.fitoAction(applicationId, value.localId)
        }
        onClose={onCloseDropdown}
        onToggle={() =>
          toggleDropdown(recipeTutorialTarget.fitoAction(applicationId, value.localId))
        }
        onSelect={(modoAccionId) => onChange({ modoAccionId })}
      />

      <LabeledNumericInput
        containerRef={(node) =>
          onTutorialTarget(
            recipeTutorialTarget.fitoDose(applicationId, value.localId),
            node
          )
        }
        error={recipeFieldError === `${fieldPrefix}:dosis` ? "Dosis obligatoria" : null}
        label="Dosis de producto comercial"
        onChangeText={(dosisProducto) => {
          onClearFieldError(`${fieldPrefix}:dosis`);
          onChange({ dosisProducto });
        }}
        onLayout={(event) =>
          onDoseInputLayout(`${fieldPrefix}:dosis`, event.nativeEvent.layout.y)
        }
        inputRef={(ref) => onDoseInputRef(`${fieldPrefix}:dosis`, ref)}
        value={value.dosisProducto}
      />

      <View
        onLayout={(event) =>
          onDoseInputLayout(`${fieldPrefix}:unidad`, event.nativeEvent.layout.y)
        }
      >
        <AppSelectField
          containerRef={(node) =>
            onTutorialTarget(
              recipeTutorialTarget.fitoUnit(applicationId, value.localId),
              node
            )
          }
          error={
            recipeFieldError === `${fieldPrefix}:unidad`
              ? "Unidad de dosis obligatoria"
              : null
          }
          icon="speedometer-outline"
          label="Unidad de dosis"
          options={(["mg", "g", "kg", "ml", "l"] as const).map((unit) => ({
            value: unit,
            label: `${unit}/cilindro`
          }))}
          placeholder="Seleccionar unidad"
          selectedLabel={value.unidadDosis || undefined}
          isOpen={
            openDropdown === recipeTutorialTarget.fitoUnit(applicationId, value.localId)
          }
          onClose={onCloseDropdown}
          onToggle={() =>
            toggleDropdown(recipeTutorialTarget.fitoUnit(applicationId, value.localId))
          }
          onSelect={(unit) => {
            onClearFieldError(`${fieldPrefix}:unidad`);
            onChange({
              unidadDosis: buildFitosanidadUnidadDosis(
                unit as "mg" | "g" | "kg" | "ml" | "l"
              )
            });
          }}
        />
      </View>
    </View>
  );
}

function validateRecipeRecommendations(
  fitosanidadApps: AppFitosanidad[],
  fertilizaciones: AppFertilizacion[],
  riegoSelection: string | null,
  laborSelections: Set<string>
) {
  if (
    !hasFitosanidadData(fitosanidadApps) &&
    !hasFertilizacionData(fertilizaciones) &&
    !riegoSelection &&
    laborSelections.size === 0
  ) {
    return "La receta es obligatoria. Registra al menos una recomendacion tecnica antes de continuar.";
  }

  const incompleteFito = fitosanidadApps.some((application) =>
    application.ingredientes.some(
      (ingredient) =>
        Boolean(ingredient.dosisProducto.trim()) && !getDosisUnit(ingredient.unidadDosis)
    )
  );
  if (incompleteFito) return "Selecciona la unidad de cada dosis fitosanitaria.";

  const incompleteFertilizer = fertilizaciones.some(
    (item) => Boolean(item.dosis.trim()) && !isValidFertilizacionUnidadDosis(item)
  );
  if (incompleteFertilizer) {
    return "Selecciona una unidad valida para cada dosis de fertilizacion.";
  }
  return null;
}

function FertilizacionCard({
  value,
  productIndex,
  canRemove,
  fertilizantes,
  openDropdown,
  onChange,
  onCloseDropdown,
  onClearFieldError,
  onDoseInputLayout,
  onDoseInputRef,
  onRemove,
  onTutorialTarget,
  recipeFieldError,
  toggleDropdown,
  onNavegarCatalogo
}: {
  value: AppFertilizacion;
  productIndex: number;
  canRemove: boolean;
  fertilizantes: FertilizanteCatalogItem[];
  openDropdown: string | null;
  onChange: (patch: Partial<AppFertilizacion>) => void;
  onCloseDropdown: () => void;
  onClearFieldError: (fieldKey: string) => void;
  onDoseInputLayout: (fieldKey: string, y: number) => void;
  onDoseInputRef: (fieldKey: string, ref: TextInput | null) => void;
  onRemove: () => void;
  onTutorialTarget: (targetKey: string, node: View | null) => void;
  recipeFieldError: string | null;
  toggleDropdown: (key: string) => void;
  onNavegarCatalogo: (tipo: string, ingredienteActivoId?: string) => void;
}) {
  const fieldPrefix = `fertilizacion:${value.localId}`;
  const unidadDosis = getUnidadDosis(value);
  const unidadBase = getDosisUnit(unidadDosis);

  return (
    <View style={styles.fertilizacionCard}>
      <View style={styles.itemCardHeader}>
        <View style={styles.itemCardTitle}>
          <View style={styles.itemNumberBadge}>
            <AppText style={styles.itemNumberText} variant="eyebrow">
              {productIndex + 1}
            </AppText>
          </View>
          <AppText variant="heading">Producto {productIndex + 1}</AppText>
        </View>
        {canRemove ? (
          <RemoveItemButton
            accessibilityLabel={`Quitar producto ${productIndex + 1}`}
            label="Quitar"
            onPress={onRemove}
          />
        ) : null}
      </View>

      {value.enfoque === "preventivo" ? (
        <AppText style={styles.preventiveText} variant="caption">
          Preventivo · Factor fijo 1.0
        </AppText>
      ) : (
        <AppText style={styles.preventiveText} variant="caption">
          Curativo · Factor calculado desde la evaluación
        </AppText>
      )}

      <AppSelectField
        containerRef={(node) =>
          onTutorialTarget(recipeTutorialTarget.fertilizerRoute(value.localId), node)
        }
        icon="leaf"
        label="Via de aplicacion"
        options={[
          { value: "edafica", label: "Edafica" },
          { value: "foliar", label: "Foliar" }
        ]}
        placeholder="Seleccionar via"
        selectedLabel={value.viaAplicacion === "edafica" ? "Edafica" : "Foliar"}
        isOpen={openDropdown === recipeTutorialTarget.fertilizerRoute(value.localId)}
        onClose={onCloseDropdown}
        onToggle={() =>
          toggleDropdown(recipeTutorialTarget.fertilizerRoute(value.localId))
        }
        onSelect={(v) => onChange({ viaAplicacion: v as "edafica" | "foliar" })}
      />

      <AppSelectField
        containerRef={(node) =>
          onTutorialTarget(recipeTutorialTarget.fertilizerProduct(value.localId), node)
        }
        icon="nutrition"
        label="Fertilizante"
        options={fertilizantes.map((f) => ({
          value: f.name,
          label: f.name,
          helper: f.type === "solido" ? "Solido" : "Liquido"
        }))}
        placeholder="Seleccionar fertilizante"
        selectedLabel={value.fertilizanteNombre || undefined}
        isOpen={openDropdown === recipeTutorialTarget.fertilizerProduct(value.localId)}
        onClose={onCloseDropdown}
        onToggle={() =>
          toggleDropdown(recipeTutorialTarget.fertilizerProduct(value.localId))
        }
        onSelect={(v) => {
          const fert = fertilizantes.find((f) => f.name === v);
          onChange({
            fertilizanteNombre: v,
            tipoProducto: fert?.type ?? value.tipoProducto,
            concentracion: fert?.concentracion ?? "",
            unidadMedida: fert?.unidadMedida ?? ""
          });
        }}
        searchable
        searchPlaceholder="Buscar fertilizante"
      />

      <AppButton
        icon="add-circle-outline"
        label="Nuevo fertilizante"
        onPress={() => onNavegarCatalogo("fertilizante")}
        size="small"
        variant="outline"
      />

      <LabeledNumericInput
        editable={false}
        label="Concentracion comercial"
        placeholder={
          value.fertilizanteNombre
            ? "Concentracion no disponible. Actualiza los catalogos."
            : "Selecciona un fertilizante"
        }
        value={formatCatalogConcentration(value.concentracion, value.unidadMedida)}
      />

      <AppSelectField
        containerRef={(node) =>
          onTutorialTarget(recipeTutorialTarget.fertilizerType(value.localId), node)
        }
        icon="cube"
        label="Tipo de producto"
        options={[
          { value: "solido", label: "Solido" },
          { value: "liquido", label: "Liquido" }
        ]}
        placeholder="Seleccionar tipo"
        selectedLabel={value.tipoProducto === "solido" ? "Solido" : "Liquido"}
        isOpen={openDropdown === recipeTutorialTarget.fertilizerType(value.localId)}
        onClose={onCloseDropdown}
        onToggle={() =>
          toggleDropdown(recipeTutorialTarget.fertilizerType(value.localId))
        }
        onSelect={(v) => onChange({ tipoProducto: v as "solido" | "liquido" })}
      />

      <LabeledNumericInput
        containerRef={(node) =>
          onTutorialTarget(recipeTutorialTarget.fertilizerDose(value.localId), node)
        }
        error={recipeFieldError === `${fieldPrefix}:dosis` ? "Dosis obligatoria" : null}
        label="Dosis"
        onChangeText={(dosis) => {
          onClearFieldError(`${fieldPrefix}:dosis`);
          onChange({ dosis });
        }}
        onLayout={(event) =>
          onDoseInputLayout(`${fieldPrefix}:dosis`, event.nativeEvent.layout.y)
        }
        inputRef={(ref) => onDoseInputRef(`${fieldPrefix}:dosis`, ref)}
        value={value.dosis}
      />

      <View
        onLayout={(event) =>
          onDoseInputLayout(`${fieldPrefix}:unidad`, event.nativeEvent.layout.y)
        }
      >
        <AppSelectField
          containerRef={(node) =>
            onTutorialTarget(recipeTutorialTarget.fertilizerUnit(value.localId), node)
          }
          error={
            recipeFieldError === `${fieldPrefix}:unidad`
              ? "Unidad de dosis obligatoria"
              : null
          }
          icon="speedometer-outline"
          label="Unidad de dosis"
          options={getFertilizacionDosisUnits(value.tipoProducto).map((unit) => ({
            value: unit,
            label: buildFertilizacionUnidadDosis(unit, value.viaAplicacion)
          }))}
          placeholder="Seleccionar unidad"
          selectedLabel={unidadDosis || undefined}
          isOpen={openDropdown === recipeTutorialTarget.fertilizerUnit(value.localId)}
          onClose={onCloseDropdown}
          onToggle={() =>
            toggleDropdown(recipeTutorialTarget.fertilizerUnit(value.localId))
          }
          onSelect={(unit) => {
            onClearFieldError(`${fieldPrefix}:unidad`);
            onChange({
              unidadDosis: buildFertilizacionUnidadDosis(
                unit as "mg" | "g" | "kg" | "ml" | "l",
                value.viaAplicacion
              )
            });
          }}
        />
      </View>

      <LabeledNumericInput
        containerRef={(node) =>
          onTutorialTarget(recipeTutorialTarget.fertilizerFactor(value.localId), node)
        }
        editable={value.factorEditable}
        label="Factor de incidencia"
        value={value.factor}
        onChangeText={(factor) => onChange({ factor })}
      />

      {value.viaAplicacion === "edafica" ? (
        <LabeledNumericInput
          containerRef={(node) =>
            onTutorialTarget(recipeTutorialTarget.fertilizerPlants(value.localId), node)
          }
          label="Cantidad total de plantas (unidades)"
          value={value.cantidadTotalPlantas}
          onChangeText={(v) => onChange({ cantidadTotalPlantas: v })}
        />
      ) : (
        <LabeledNumericInput
          containerRef={(node) =>
            onTutorialTarget(recipeTutorialTarget.fertilizerVolume(value.localId), node)
          }
          label="Volumen de aplicacion (cilindros/ha x ha totales)"
          value={value.volumenAplicacion}
          onChangeText={(v) => onChange({ volumenAplicacion: v })}
        />
      )}

      <ReadonlyField
        label={`Cantidad total de fertilizante${unidadBase ? ` (${unidadBase})` : ""}`}
        value={value.cantidadTotalFertilizante}
      />
    </View>
  );
}

function AddItemButton({
  label,
  accessibilityLabel,
  onPress
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.addItemButton, pressed && styles.pressedButton]}
    >
      <Ionicons color={theme.colors.primary} name="add-circle-outline" size={22} />
      <AppText style={styles.addItemButtonText} variant="label">
        {label}
      </AppText>
    </Pressable>
  );
}

function RemoveItemButton({
  label,
  accessibilityLabel,
  onPress
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.removeItemButton, pressed && styles.pressedButton]}
    >
      <Ionicons color={theme.colors.error} name="trash-outline" size={18} />
      <AppText style={styles.removeItemButtonText} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

function RiegoSection({
  selected,
  onSelect
}: {
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const options: Array<{
    key: string;
    label: string;
    description: string;
    icon: IoniconName;
  }> = [
    {
      key: "riego_pesado",
      label: "Riego pesado",
      description: "Aplicar grandes volumenes de agua sobre la superficie del terreno.",
      icon: "water-outline"
    },
    {
      key: "riego_ligero",
      label: "Riego ligero",
      description:
        "Aplicar una lamina de agua de bajo volumen para humedecer superficialmente.",
      icon: "water"
    },
    {
      key: "inicio_agoste",
      label: "Agoste",
      description:
        "Suspension o restriccion controlada del riego para inducir el manejo fenologico del cultivo.",
      icon: "pause-circle-outline"
    }
  ];
  const selectedLabel = options.find((option) => option.key === selected)?.label ?? null;
  const status = buildOptionalRecipeSectionStatus(Boolean(selected));

  return (
    <View
      style={[
        styles.collapsibleSectionCard,
        isExpanded && styles.collapsibleSectionCardExpanded
      ]}
    >
      <AppCollapsibleHeader
        icon="water-outline"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((current) => !current)}
        statusLabel={status.label}
        statusTone={status.tone}
        subtitle={buildRiegoSummary(selectedLabel)}
        title="Riego"
      />
      {isExpanded ? (
        <View style={styles.collapsibleSectionContent}>
          {options.map((opt) => {
            const isSel = selected === opt.key;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isSel }}
                key={opt.key}
                onPress={() => onSelect(opt.key)}
                style={[styles.riegoOption, isSel && styles.riegoOptionSelected]}
              >
                <Ionicons
                  color={isSel ? theme.colors.primary : theme.colors.textMuted}
                  name={opt.icon}
                  size={28}
                />
                <View style={styles.riegoOptionText}>
                  <AppText
                    variant="label"
                    style={isSel && { color: theme.colors.primary }}
                  >
                    {opt.label}
                  </AppText>
                  <AppText variant="muted">{opt.description}</AppText>
                </View>
                {isSel ? (
                  <Ionicons
                    color={theme.colors.primary}
                    name="checkmark-circle"
                    size={24}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function LaboresSection({
  selected,
  onToggle
}: {
  selected: Set<string>;
  onToggle: (labor: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPruningExpanded, setIsPruningExpanded] = useState(false);
  const options: Array<{
    key: RecetaLabor["labor"];
    icon: IoniconName;
  }> = [
    {
      key: "limpieza_maleza_pala",
      icon: "cut-outline"
    },
    {
      key: "limpieza_maleza_motoguadana",
      icon: "hardware-chip-outline"
    },
    {
      key: "horqueteo",
      icon: "git-branch-outline"
    },
    {
      key: "enzunchado",
      icon: "link-outline"
    },
    {
      key: "recoleccion_frutos",
      icon: "trash-outline"
    },
    {
      key: "trampas_mosca",
      icon: "bug-outline"
    }
  ];
  const status = buildOptionalRecipeSectionStatus(selected.size > 0);
  const selectedPruning = PRUNING_RECOMMENDATIONS.find((labor) => selected.has(labor));

  return (
    <View
      style={[
        styles.collapsibleSectionCard,
        isExpanded && styles.collapsibleSectionCardExpanded
      ]}
    >
      <AppCollapsibleHeader
        icon="construct-outline"
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded((current) => !current)}
        statusLabel={status.label}
        statusTone={status.tone}
        subtitle={buildLaboresSummary(selected.size)}
        title="Labores culturales"
      />
      {isExpanded ? (
        <View style={styles.collapsibleSectionContent}>
          {options.map((opt) => {
            const isSel = selected.has(opt.key);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSel }}
                key={opt.key}
                onPress={() => onToggle(opt.key)}
                style={[styles.laborOption, isSel && styles.laborOptionSelected]}
              >
                <Ionicons
                  color={isSel ? theme.colors.primary : theme.colors.textMuted}
                  name={opt.icon}
                  size={26}
                />
                <View style={styles.laborOptionText}>
                  <AppText
                    variant="label"
                    style={isSel && { color: theme.colors.primary }}
                  >
                    {LABOR_RECOMENDACION_LABELS[opt.key]}
                  </AppText>
                  <AppText variant="muted">
                    {LABOR_RECOMENDACION_DESCRIPTIONS[opt.key]}
                  </AppText>
                </View>
                <Ionicons
                  color={isSel ? theme.colors.primary : theme.colors.border}
                  name={isSel ? "checkbox" : "square-outline"}
                  size={24}
                />
              </Pressable>
            );
          })}
          <View style={styles.pruningGroup}>
            <Pressable
              accessibilityLabel={`Poda. ${
                selectedPruning
                  ? LABOR_RECOMENDACION_LABELS[selectedPruning]
                  : "Sin selección"
              }`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isPruningExpanded }}
              onPress={() => setIsPruningExpanded((current) => !current)}
              style={styles.pruningHeader}
            >
              <Ionicons color={theme.colors.primary} name="leaf-outline" size={26} />
              <View style={styles.laborOptionText}>
                <AppText variant="label">Poda</AppText>
                <AppText variant="muted">
                  {selectedPruning
                    ? `Seleccionada: ${LABOR_RECOMENDACION_LABELS[selectedPruning]}`
                    : "Selecciona un tipo de poda"}
                </AppText>
              </View>
              <Ionicons
                color={theme.colors.textMuted}
                name={isPruningExpanded ? "chevron-up" : "chevron-down"}
                size={22}
              />
            </Pressable>
            {isPruningExpanded ? (
              <View style={styles.pruningOptions}>
                {PRUNING_RECOMMENDATIONS.map((labor) => {
                  const isSelected = selected.has(labor);
                  return (
                    <Pressable
                      accessibilityHint="Solo se puede seleccionar un tipo de poda."
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      key={labor}
                      onPress={() => onToggle(labor)}
                      style={[
                        styles.laborOption,
                        styles.pruningOption,
                        isSelected && styles.laborOptionSelected
                      ]}
                    >
                      <Ionicons
                        color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                        name="cut-outline"
                        size={24}
                      />
                      <View style={styles.laborOptionText}>
                        <AppText
                          style={isSelected && { color: theme.colors.primary }}
                          variant="label"
                        >
                          {LABOR_RECOMENDACION_LABELS[labor]}
                        </AppText>
                        <AppText variant="muted">
                          {LABOR_RECOMENDACION_DESCRIPTIONS[labor]}
                        </AppText>
                      </View>
                      <Ionicons
                        color={isSelected ? theme.colors.primary : theme.colors.border}
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={24}
                      />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function LabeledNumericInput({
  containerRef,
  label,
  value,
  onChangeText,
  editable = true,
  placeholder = "0",
  error = null,
  inputRef,
  onLayout
}: {
  containerRef?: (node: View | null) => void;
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  placeholder?: string;
  error?: string | null;
  inputRef?: (ref: TextInput | null) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View ref={containerRef} onLayout={onLayout} style={styles.fieldWrapper}>
      <AppText variant="label" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        inputMode="decimal"
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        ref={inputRef}
        style={[styles.textInput, error && styles.textInputError]}
        value={value}
      />
      {error ? (
        <AppText style={styles.fieldErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function ReadonlyField({
  label,
  placeholder = "Calculado automaticamente",
  value
}: {
  label: string;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <AppText variant="label" style={styles.fieldLabel}>
        {label}
      </AppText>
      <View style={styles.readonlyField}>
        <AppText
          style={value ? styles.readonlyValue : styles.readonlyPlaceholder}
          variant="body"
        >
          {value || placeholder}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    paddingBottom: 24
  },
  centeredContainer: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  hero: {
    minHeight: 320,
    overflow: "hidden",
    paddingHorizontal: 0,
    paddingTop: 0
  },
  heroImage: {
    opacity: 0.82
  },
  heroContent: {
    gap: 10,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 34
  },
  heroTitle: {
    color: theme.colors.primaryDark,
    fontSize: 40,
    lineHeight: 45,
    maxWidth: 300
  },
  heroSubtitle: {
    color: "#173f2d",
    maxWidth: 320
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  topBarTitle: {
    color: theme.colors.textInverse,
    flex: 1,
    fontSize: 22
  },
  backIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: theme.radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  tutorialButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: theme.colors.primaryDark,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12
  },
  tutorialButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  body: {
    gap: 20,
    padding: theme.spacing.md,
    paddingTop: 24
  },
  tutorialNotice: {
    backgroundColor: theme.colors.infoMuted,
    borderColor: theme.colors.info,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    bottom: 16,
    left: 16,
    padding: 12,
    position: "absolute",
    right: 16
  },
  tutorialNoticeText: {
    color: theme.colors.primaryDark
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: theme.radius.full,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  sectionHeaderText: {
    flex: 1,
    gap: 3
  },
  sectionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18
  },
  consolidacionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...theme.shadow.sm
  },
  collapsibleSectionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...theme.shadow.sm
  },
  collapsibleSectionCardExpanded: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5
  },
  collapsibleSectionContent: {
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12
  },
  consolidacionLine: {
    paddingLeft: 4
  },
  consolidacionGroup: {
    gap: 4
  },
  fitosanidadCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...theme.shadow.sm
  },
  preventiveText: {
    color: theme.colors.primaryDark,
    fontWeight: "600"
  },
  ingredientList: {
    gap: 12
  },
  ingredientCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  itemCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  itemCardTitle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8
  },
  itemNumberBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  itemNumberText: {
    color: theme.colors.primaryDark
  },
  fieldWrapper: {
    gap: 6
  },
  fieldLabel: {
    fontSize: 13
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textInputError: {
    backgroundColor: theme.colors.errorMuted,
    borderColor: theme.colors.error,
    borderWidth: 1.5
  },
  fieldErrorText: {
    color: theme.colors.error
  },
  readonlyField: {
    backgroundColor: theme.colors.infoMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  readonlyValue: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  readonlyPlaceholder: {
    color: theme.colors.textMuted,
    fontStyle: "italic"
  },
  calculationAreaHint: {
    color: theme.colors.textMuted,
    marginTop: -8,
    paddingHorizontal: 2
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary
  },
  chipText: {
    color: theme.colors.textMuted
  },
  chipTextSelected: {
    color: theme.colors.primary
  },
  ordenContainer: {
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.sm,
    gap: 8,
    padding: 12
  },
  ordenHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  ordenExchangeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  ordenExchangeButtonActive: {
    backgroundColor: theme.colors.primary
  },
  ordenExchangeButtonText: {
    color: theme.colors.primary,
    fontWeight: "600"
  },
  ordenExchangeButtonTextActive: {
    color: theme.colors.textInverse
  },
  ordenItem: {
    alignItems: "center",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface
  },
  ordenItemSelectable: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    borderWidth: 1.5
  },
  ordenItemSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderStyle: "solid",
    borderColor: theme.colors.primary,
    borderWidth: 2
  },
  ordenItemFixed: {
    opacity: 0.65
  },
  ordenSwapIndicator: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  ordenItemNumberBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.full,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  totalRow: {
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.md,
    marginTop: 10,
    padding: 14
  },
  productoTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  productoCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  productoCheckRowSelected: {
    backgroundColor: theme.colors.primaryMuted
  },
  productoCheckRowUnassigned: {
    backgroundColor: theme.colors.warningMuted
  },
  ordenItemText: {
    flex: 1
  },
  ordenItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600"
  },
  fertilizacionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...theme.shadow.sm
  },
  fertilizacionGroupCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 14
  },
  preventiveFertilizationCard: {
    backgroundColor: theme.colors.infoMuted,
    borderColor: theme.colors.info,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  optionalActionCard: {
    backgroundColor: theme.colors.infoMuted,
    borderColor: theme.colors.info
  },
  optionalActionContent: {
    gap: 12,
    paddingTop: 8
  },
  addItemButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  addItemButtonText: {
    color: theme.colors.primaryDark
  },
  removeItemButton: {
    alignItems: "center",
    borderColor: theme.colors.error,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  removeItemButtonText: {
    color: theme.colors.error,
    fontWeight: "600"
  },
  emptyProductsCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    padding: 20
  },
  emptyProductsTitle: {
    color: theme.colors.text
  },
  emptyProductsText: {
    marginBottom: 4,
    textAlign: "center"
  },
  riegoOption: {
    alignItems: "center",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14
  },
  riegoOptionSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary
  },
  riegoOptionText: {
    flex: 1
  },
  laborOption: {
    alignItems: "center",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14
  },
  laborOptionSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary
  },
  laborOptionText: {
    flex: 1
  },
  pruningGroup: {
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  pruningHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 14
  },
  pruningOptions: {
    backgroundColor: theme.colors.surfaceElevated,
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    gap: 8,
    padding: 10
  },
  pruningOption: {
    backgroundColor: theme.colors.surface,
    marginLeft: 12
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.md,
    padding: 12
  },
  submitErrorText: {
    color: theme.colors.error,
    textAlign: "center"
  },
  endVisitTimeCard: {
    padding: 16,
    gap: 8
  },
  endVisitTimeHint: {
    color: theme.colors.textMuted
  },
  actions: {
    gap: 12,
    paddingVertical: 16
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 16
  },
  pressedButton: {
    opacity: 0.8
  },
  continueButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18
  }
});
