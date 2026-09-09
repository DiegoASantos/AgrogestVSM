import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";

import {
  AppButton,
  AppCard,
  AppCollapsibleHeader,
  AppHeader,
  AppInput,
  AppText,
  FormScrollView,
  ScreenContainer
} from "../../../../shared/components";
import { AppSelectField } from "../../../../shared/components/app-select-field";
import { theme } from "../../../../shared/constants/theme";
import {
  buildVisitDraftScopeKey,
  deleteVisitFormDraft,
  readVisitFormDraft,
  writeVisitFormDraft,
  type VisitFormDraftIdentity
} from "../../../../shared/database/visit-form-drafts";
import { useVisitFormDraft } from "../../../../shared/hooks/use-visit-form-draft";
import { toApiError } from "../../../../shared/services";
import { scheduleSync } from "../../../../shared/sync";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import {
  formatEditable12HourInput,
  formatTimeFor12HourInput,
  normalize12HourTimeForApi,
  normalizeTyped12HourInput,
  resolveInitialEndVisitTime,
  validateVisitEndTime,
  type TimePeriod
} from "../../../visitas-campo/domain/time-input";
import { Time12HourInput } from "../../../visitas-campo/presentation/components/time-12-hour-input";
import { visitasCampoRepository } from "../../../visitas-campo/repositories/visitas-campo.repository";
import { visitasCampoService } from "../../../visitas-campo/services/visitas-campo.service";
import { visitaRecetasService } from "../../services";
import {
  buildMixtureTutorialSteps,
  getNextTutorialStep,
  takePreviousTutorialStep,
  type MixtureTutorialFieldId
} from "../../domain/recipe-tutorial";
import { GuidedFormTutorial } from "../../../visitas-campo/presentation/components/guided-form-tutorial";
import {
  generateOrdenMezcla,
  isOrdenMezclaFixedItem,
  swapOrdenMezclaItems
} from "./visita-receta-order";
import {
  buildFertilizacionesForSave,
  buildMezclasForSave,
  createEmptyFertilizacion,
  createEmptyIngrediente,
  createEmptyMezcla,
  deriveMezclaFactors,
  type AppFertilizacion,
  type AppFitosanidad
} from "./visita-receta-multiple-products";
import type { RecetaFormDraft } from "./visita-receta-screen";
import {
  buildDirectProductCatalog,
  copyMixtureConfiguration,
  findFirstMixtureIssue,
  findNextIncompleteMixtureNumber,
  getDirectDoseUnits,
  getMixtureIssues,
  getSteppedMixtureCount,
  mixtureStatus,
  parseMixtureCount,
  requiresVolume,
  shouldShowMixtureNavigation,
  validateMixtures,
  type EditableMixture,
  type MixtureIssue,
  type MixtureIssueSection,
  type MixtureAssignment,
  type ProductOption
} from "./visita-mezclas-form";

type MezclasFormDraft = {
  mixtures: EditableMixture[];
  activeNumber: number;
  endVisitTimeInput: string;
  endVisitTimePeriod: TimePeriod;
};

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function getMixtureTutorialTargetId(
  id: MixtureTutorialFieldId
):
  | "mixtureCount"
  | "mixtureSelection"
  | "products"
  | "frequency"
  | "coadyuvants"
  | "preparationOrder"
  | "endTime"
  | "finish" {
  if (id === "productDose" || id === "productPlants") return "products";
  if (id === "applicationVolume") return "frequency";
  if (id === "coadyuvantDose") return "coadyuvants";
  if (id === "reorder") return "preparationOrder";
  if (id === "nextMixture") return "mixtureSelection";
  return id;
}

export function VisitaMezclasScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = singleParam(params.id);
  const [recipeDraft, setRecipeDraft] = useState<RecetaFormDraft | null>(null);
  const [mixtures, setMixtures] = useState<EditableMixture[]>([]);
  const [mixtureCountInput, setMixtureCountInput] = useState("1");
  const [activeNumber, setActiveNumber] = useState(1);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState<number | null>(null);
  const [startVisitTime, setStartVisitTime] = useState("");
  const [endVisitTimeInput, setEndVisitTimeInput] = useState("");
  const [endVisitTimePeriod, setEndVisitTimePeriod] = useState<TimePeriod>("AM");
  const [endVisitTimeError, setEndVisitTimeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirectProductSearchOpen, setIsDirectProductSearchOpen] = useState(false);
  const [openUnitProductRef, setOpenUnitProductRef] = useState<string | null>(null);
  const [isCoadjuvantsExpanded, setIsCoadjuvantsExpanded] = useState(false);
  const [isPreparationOrderExpanded, setIsPreparationOrderExpanded] = useState(false);
  const [hasAttemptedFinalize, setHasAttemptedFinalize] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(() => new Set());
  const [pendingIssueNavigation, setPendingIssueNavigation] = useState<{
    mixtureNumber: number;
    issue: MixtureIssue;
  } | null>(null);
  const isCountConfirmationOpen = useRef(false);
  const formScrollRef = useRef<ScrollView>(null);
  const sectionTargets = useRef<Partial<Record<MixtureIssueSection, View | null>>>({});
  const issueTargets = useRef<Record<string, View | null>>({});
  const issueInputTargets = useRef<Record<string, TextInput | null>>({});
  const pendingIssueNavigationRef = useRef<{
    mixtureNumber: number;
    issue: MixtureIssue;
  } | null>(null);
  const tutorialTargets = useRef<Partial<Record<MixtureTutorialFieldId, View | null>>>(
    {}
  );
  const [tutorialScrollY, setTutorialScrollY] = useState(0);
  const [tutorialStepId, setTutorialStepId] = useState<MixtureTutorialFieldId | null>(
    null
  );
  const [tutorialHistory, setTutorialHistory] = useState<MixtureTutorialFieldId[]>([]);
  const [tutorialNotice, setTutorialNotice] = useState<string | null>(null);

  const recipeIdentity = useMemo<VisitFormDraftIdentity | null>(
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
  const mixtureIdentity = useMemo<VisitFormDraftIdentity | null>(
    () => (recipeIdentity ? { ...recipeIdentity, moduleKey: "mezclas" } : null),
    [recipeIdentity]
  );

  const productOptions = useMemo(() => buildProductOptions(recipeDraft), [recipeDraft]);
  const recipeCatalogs = useMemo(() => visitaRecetasService.getCatalogos(), []);
  const directProductCatalog = useMemo(
    () =>
      buildDirectProductCatalog(
        recipeCatalogs.marcasProducto,
        recipeCatalogs.ingredientesActivos,
        recipeCatalogs.tiposProducto,
        recipeCatalogs.fertilizantes
      ),
    [recipeCatalogs]
  );
  const tutorialSteps = useMemo(
    () => buildMixtureTutorialSteps(productOptions.length > 0),
    [productOptions.length]
  );
  const currentTutorialStep = tutorialStepId
    ? (tutorialSteps.find((step) => step.id === tutorialStepId) ?? null)
    : null;
  const draftValue = useMemo<MezclasFormDraft>(
    () => ({ mixtures, activeNumber, endVisitTimeInput, endVisitTimePeriod }),
    [activeNumber, endVisitTimeInput, endVisitTimePeriod, mixtures]
  );
  const { clearDraft, flushDraft } = useVisitFormDraft({
    enabled: isReady && Boolean(recipeDraft),
    identity: mixtureIdentity,
    value: draftValue
  });

  useEffect(() => {
    if (!visitaId || !recipeIdentity || !mixtureIdentity) {
      setError("No se encontro una visita valida para preparar las mezclas.");
      setIsReady(true);
      return;
    }
    const visit = visitasCampoRepository.getById(visitaId);
    const currentRecipeDraft = readVisitFormDraft<RecetaFormDraft>(recipeIdentity);
    if (!visit || !currentRecipeDraft) {
      setError("Completa primero el paso de Receta para preparar las mezclas.");
      setIsReady(true);
      return;
    }

    setRecipeDraft(currentRecipeDraft);
    setStartVisitTime(visit.startVisitTime);
    const suggested = formatTimeFor12HourInput(
      resolveInitialEndVisitTime(visit.endVisitTime, new Date())
    );
    const saved = readVisitFormDraft<MezclasFormDraft>(mixtureIdentity);
    const options = buildProductOptions(currentRecipeDraft);
    const validRefs = new Set(options.map((item) => item.ref));
    if (saved) {
      const restored = sanitizeMixtures(saved.mixtures, validRefs);
      setMixtures(restored);
      setMixtureCountInput(String(restored.length || 1));
      setActiveNumber(
        restored.some((item) => item.numero === saved.activeNumber)
          ? saved.activeNumber
          : (restored[0]?.numero ?? 1)
      );
      setEndVisitTimeInput(saved.endVisitTimeInput || suggested.time);
      setEndVisitTimePeriod(saved.endVisitTimePeriod ?? suggested.period);
    } else {
      const initialized = initializeMixtures(currentRecipeDraft, options);
      setMixtures(initialized);
      setMixtureCountInput(String(initialized.length || 1));
      setActiveNumber(initialized[0]?.numero ?? 1);
      setEndVisitTimeInput(currentRecipeDraft.endVisitTimeInput || suggested.time);
      setEndVisitTimePeriod(currentRecipeDraft.endVisitTimePeriod ?? suggested.period);
    }
    setIsReady(true);
  }, [mixtureIdentity, recipeIdentity, visitaId]);

  const activeMixture = mixtures.find((item) => item.numero === activeNumber) ?? null;
  const assignedRefs = new Set(
    mixtures.flatMap((mixture) => mixture.assignments.map((item) => item.productRef))
  );
  const unassignedProducts = productOptions.filter((item) => !assignedRefs.has(item.ref));
  const activeMixtureIssues =
    activeMixture && productOptions.length > 0
      ? [
          ...getMixtureIssues(activeMixture, productOptions),
          ...(activeMixture.numero === (mixtures[0]?.numero ?? 1)
            ? unassignedProducts.map<MixtureIssue>((product) => ({
                id: `unassigned:${product.ref}`,
                section: "products",
                message: `Asigna ${product.label} al menos a una mezcla.`
              }))
            : [])
        ]
      : [];
  const activeIssueIds = new Set(activeMixtureIssues.map((issue) => issue.id));
  const readyMixtureCount =
    productOptions.length === 0
      ? mixtures.length
      : mixtures.filter((mixture) => mixtureStatus(mixture, productOptions) === "Lista")
          .length;
  const firstPendingMixture =
    productOptions.length === 0
      ? undefined
      : (mixtures.find((mixture) => mixtureStatus(mixture, productOptions) !== "Lista") ??
        (unassignedProducts.length > 0 ? mixtures[0] : undefined));
  const navigationTargetNumber =
    unassignedProducts.length > 0 && activeNumber !== (mixtures[0]?.numero ?? 1)
      ? mixtures[0]?.numero
      : findNextIncompleteMixtureNumber(mixtures, productOptions, activeNumber);
  const editableMixtureCount = parseMixtureCount(mixtureCountInput) ?? mixtures.length;
  const completionPercentage =
    productOptions.length === 0 || mixtures.length === 0
      ? 100
      : Math.round(
          (readyMixtureCount /
            (mixtures.length + (unassignedProducts.length > 0 ? 1 : 0))) *
            100
        );
  const movableOrderCount =
    activeMixture?.ordenMezcla.filter((item) => !isOrdenMezclaFixedItem(item)).length ??
    0;

  useEffect(() => {
    const issueNavigation = pendingIssueNavigationRef.current;
    setIsReordering(false);
    setSelectedOrderIndex(null);
    setIsCoadjuvantsExpanded(
      issueNavigation?.mixtureNumber === activeNumber &&
        issueNavigation.issue.section === "coadyuvants"
    );
    setIsPreparationOrderExpanded(false);
  }, [activeNumber]);

  useEffect(() => {
    if (tutorialStepId === "coadyuvants" || tutorialStepId === "coadyuvantDose") {
      setIsCoadjuvantsExpanded(true);
    }
    if (tutorialStepId === "preparationOrder" || tutorialStepId === "reorder") {
      setIsPreparationOrderExpanded(true);
    }
  }, [tutorialStepId]);

  useEffect(() => {
    if (!pendingIssueNavigation) return;
    if (activeNumber !== pendingIssueNavigation.mixtureNumber) return;
    if (
      pendingIssueNavigation.issue.section === "coadyuvants" &&
      !isCoadjuvantsExpanded
    ) {
      setIsCoadjuvantsExpanded(true);
      return;
    }

    const targetMixture = mixtures.find(
      (mixture) => mixture.numero === pendingIssueNavigation.mixtureNumber
    );
    if (targetMixture) {
      const fieldKey = `${targetMixture.localId}:${pendingIssueNavigation.issue.id}`;
      setTouchedFields((current) => new Set(current).add(fieldKey));
    }

    const issueId = pendingIssueNavigation.issue.id;
    const issueSection = pendingIssueNavigation.issue.section;
    pendingIssueNavigationRef.current = null;
    setPendingIssueNavigation(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollTargetIntoView(
          issueTargets.current[issueId] ?? sectionTargets.current[issueSection] ?? null
        );
        issueInputTargets.current[issueId]?.focus();
      });
    });
  }, [activeNumber, isCoadjuvantsExpanded, mixtures, pendingIssueNavigation]);

  function updateActive(patch: Partial<EditableMixture>) {
    setMixtures((current) =>
      current.map((item) => (item.numero === activeNumber ? { ...item, ...patch } : item))
    );
    setError(null);
  }

  function markFieldTouched(issueId: string) {
    if (!activeMixture) return;
    const fieldKey = `${activeMixture.localId}:${issueId}`;
    setTouchedFields((current) => new Set(current).add(fieldKey));
  }

  function visibleIssueMessage(issueId: string) {
    if (!activeMixture || !activeIssueIds.has(issueId)) return null;
    const visible =
      hasAttemptedFinalize || touchedFields.has(`${activeMixture.localId}:${issueId}`);
    return visible
      ? (activeMixtureIssues.find((issue) => issue.id === issueId)?.message ?? null)
      : null;
  }

  function scrollToIssue(issue: MixtureIssue, mixtureNumber = activeNumber) {
    pendingIssueNavigationRef.current = { issue, mixtureNumber };
    setPendingIssueNavigation({ issue, mixtureNumber });
    setActiveNumber(mixtureNumber);
  }

  function scrollTargetIntoView(target: View | null) {
    const scrollView = formScrollRef.current;
    if (!target || !scrollView) return;
    const nativeScrollView = scrollView.getNativeScrollRef();
    if (!nativeScrollView) return;
    target.measureInWindow((_targetX, targetY) => {
      nativeScrollView.measureInWindow((_scrollX, scrollY) => {
        scrollView.scrollTo({
          animated: true,
          x: 0,
          y: Math.max(0, tutorialScrollY + targetY - scrollY - theme.spacing.md)
        });
      });
    });
  }

  function updateCountInput(raw: string) {
    setMixtureCountInput(raw.replace(/\D/g, "").slice(0, 2));
  }

  function commitCount() {
    const parsed = parseMixtureCount(mixtureCountInput);
    if (parsed === null) {
      setMixtureCountInput(String(mixtures.length || 1));
      return;
    }
    requestMixtureCount(parsed);
  }

  function requestMixtureCount(parsed: number) {
    if (parsed < mixtures.length) {
      const removedWithData = mixtures
        .slice(parsed)
        .some((item) => item.assignments.length > 0 || item.coadyuvantesIds.length > 0);
      if (removedWithData) {
        if (isCountConfirmationOpen.current) {
          return;
        }
        isCountConfirmationOpen.current = true;
        Alert.alert(
          "Reducir cantidad de mezclas",
          "Las mezclas retiradas tienen datos. Esta accion no se puede deshacer.",
          [
            {
              text: "Cancelar",
              style: "cancel",
              onPress: () => {
                isCountConfirmationOpen.current = false;
                setMixtureCountInput(String(mixtures.length));
              }
            },
            {
              text: "Reducir",
              style: "destructive",
              onPress: () => {
                isCountConfirmationOpen.current = false;
                applyCount(parsed);
              }
            }
          ],
          {
            cancelable: true,
            onDismiss: () => {
              isCountConfirmationOpen.current = false;
            }
          }
        );
        return;
      }
    }
    applyCount(parsed);
  }

  function applyCount(count: number) {
    setMixtures((current) =>
      Array.from({ length: count }, (_, index) => {
        const existing = current[index];
        return existing ?? { ...createEmptyMezcla(index + 1), assignments: [] };
      })
    );
    setMixtureCountInput(String(count));
    setActiveNumber((current) => Math.min(current, count));
    setIsReordering(false);
    setSelectedOrderIndex(null);
  }

  function toggleProduct(option: ProductOption) {
    if (!activeMixture) return;
    const assigned = activeMixture.assignments.some(
      (item) => item.productRef === option.ref
    );
    const assignments = assigned
      ? activeMixture.assignments.filter((item) => item.productRef !== option.ref)
      : [
          ...activeMixture.assignments,
          {
            productRef: option.ref,
            kind: option.kind,
            dose: option.dose,
            unit: option.unit,
            plants: option.plants
          }
        ];
    updateActive({
      assignments,
      ordenMezcla: buildOrder(assignments, activeMixture.coadyuvantesIds)
    });
    setIsReordering(false);
    setSelectedOrderIndex(null);
  }

  function updateAssignment(productRef: string, patch: Partial<MixtureAssignment>) {
    if (!activeMixture) return;
    updateActive({
      assignments: activeMixture.assignments.map((item) =>
        item.productRef === productRef ? { ...item, ...patch } : item
      )
    });
  }

  function persistRecipeDraft(nextDraft: RecetaFormDraft) {
    setRecipeDraft(nextDraft);
    if (recipeIdentity) writeVisitFormDraft(recipeIdentity, nextDraft);
  }

  function addDirectProduct(key: string) {
    if (!recipeDraft || !activeMixture) return;
    const selected = directProductCatalog.find((item) => item.key === key);
    if (!selected) return;

    let productRef: string;
    let nextDraft: RecetaFormDraft;
    if (selected.kind === "fitosanitario") {
      const ingredient = createEmptyIngrediente(activeMixture.numero);
      productRef = ingredient.localId;
      const directApplication: AppFitosanidad = {
        localId: `direct_${ingredient.localId}`,
        numero: recipeDraft.fitosanidadApps.length + 1,
        origen: "mezcla_directa",
        objetivo: "plaga",
        objetivoNombre: "Aplicación directa",
        enfoque: "reactivo",
        objetivoId: null,
        incidenceGrade: 0,
        severityGrade: null,
        tipoControlId: "",
        disolvente: "Agua",
        ingredientes: [
          {
            ...ingredient,
            tipoProductoId: selected.brand.tipoProductoId ?? "",
            ingredienteActivoId: selected.brand.ingredienteActivoId ?? "",
            ingredienteActivoNombre: selected.ingredientName,
            marcaProductoNombre: selected.brand.name,
            concentracionProducto:
              selected.brand.concentracionTexto ??
              selected.brand.concentracion?.toString() ??
              "",
            unidadMedidaProducto: selected.brand.unidadMedida ?? ""
          }
        ]
      };
      nextDraft = {
        ...recipeDraft,
        fitosanidadApps: [...recipeDraft.fitosanidadApps, directApplication]
      };
    } else {
      const fertilizer = createEmptyFertilizacion();
      productRef = fertilizer.localId;
      nextDraft = {
        ...recipeDraft,
        fertilizaciones: [
          ...recipeDraft.fertilizaciones,
          {
            ...fertilizer,
            mezclaNumero: activeMixture.numero,
            origen: "mezcla_directa",
            enfoque: "reactivo",
            nutrienteId: null,
            nutrienteNombre: "Aplicación directa",
            incidenceGrade: 0,
            viaAplicacion: "foliar",
            fertilizanteNombre: selected.fertilizer.name,
            tipoProducto: selected.fertilizer.type,
            concentracion: selected.fertilizer.concentracion ?? "",
            unidadMedida: selected.fertilizer.unidadMedida ?? "",
            factor: "1",
            factorEditable: false
          }
        ]
      };
    }

    persistRecipeDraft(nextDraft);
    setMixtures((current) =>
      current.map((mixture) => {
        if (mixture.numero !== activeNumber) return mixture;
        const assignments = [
          ...mixture.assignments,
          { productRef, kind: selected.kind, dose: "", unit: "", plants: "" }
        ];
        return {
          ...mixture,
          assignments,
          ordenMezcla: buildOrderWithAddedProduct(
            assignments,
            mixture.coadyuvantesIds,
            productRef,
            selected.label
          )
        };
      })
    );
    setIsDirectProductSearchOpen(false);
    setOpenUnitProductRef(productRef);
    setError(null);
  }

  function removeDirectProduct(option: ProductOption) {
    if (!recipeDraft || option.origin !== "mezcla_directa") return;
    const usageCount = mixtures.filter((mixture) =>
      mixture.assignments.some((item) => item.productRef === option.ref)
    ).length;
    const execute = () => {
      const nextDraft: RecetaFormDraft = {
        ...recipeDraft,
        fitosanidadApps: recipeDraft.fitosanidadApps
          .map((application) => ({
            ...application,
            ingredientes: application.ingredientes.filter(
              (ingredient) => ingredient.localId !== option.ref
            )
          }))
          .filter((application) => application.ingredientes.length > 0),
        fertilizaciones: recipeDraft.fertilizaciones.filter(
          (fertilizer) => fertilizer.localId !== option.ref
        )
      };
      persistRecipeDraft(nextDraft);
      setMixtures((current) =>
        current.map((mixture) => {
          const assignments = mixture.assignments.filter(
            (item) => item.productRef !== option.ref
          );
          return {
            ...mixture,
            assignments,
            ordenMezcla: buildOrder(assignments, mixture.coadyuvantesIds)
          };
        })
      );
      setOpenUnitProductRef(null);
    };

    if (usageCount > 1) {
      Alert.alert(
        "Quitar producto",
        `Este producto se usa en ${usageCount} mezclas. Se quitara de todas.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Quitar", style: "destructive", onPress: execute }
        ]
      );
      return;
    }
    execute();
  }

  function toggleCoadjuvant(id: string) {
    if (!activeMixture) return;
    const selected = activeMixture.coadyuvantesIds.includes(id)
      ? activeMixture.coadyuvantesIds.filter((item) => item !== id)
      : [...activeMixture.coadyuvantesIds, id];
    const doses = { ...(activeMixture.coadyuvantesDosis ?? {}) };
    if (selected.includes(id)) doses[id] ??= "";
    else delete doses[id];
    updateActive({
      coadyuvantesIds: selected,
      coadyuvantesDosis: doses,
      ordenMezcla: buildOrder(activeMixture.assignments, selected)
    });
    setIsReordering(false);
    setSelectedOrderIndex(null);
  }

  function updateCoadjuvantDose(id: string, dose: string) {
    if (!activeMixture) return;
    updateActive({
      coadyuvantesDosis: {
        ...(activeMixture.coadyuvantesDosis ?? {}),
        [id]: dose
      }
    });
  }

  function exchangeOrderItem(index: number) {
    if (!activeMixture || !isReordering) return;
    const item = activeMixture.ordenMezcla[index] ?? "";
    if (isOrdenMezclaFixedItem(item)) return;
    if (selectedOrderIndex === null) {
      setSelectedOrderIndex(index);
      return;
    }
    updateActive({
      ordenMezcla: swapOrdenMezclaItems(
        activeMixture.ordenMezcla,
        selectedOrderIndex,
        index
      )
    });
    setSelectedOrderIndex(null);
  }

  function copyFrom(source: EditableMixture) {
    if (!activeMixture || source.numero === activeMixture.numero) return;
    const execute = () => {
      updateActive({
        ...copyMixtureConfiguration(source)
      });
    };
    if (
      activeMixture.assignments.length > 0 ||
      activeMixture.coadyuvantesIds.length > 0 ||
      Boolean(activeMixture.frecuenciaDosis?.trim())
    ) {
      Alert.alert(
        `Reemplazar Mezcla ${activeMixture.numero}`,
        `Se copiara toda la configuracion de la Mezcla ${source.numero}.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Reemplazar", onPress: execute }
        ]
      );
    } else {
      execute();
    }
  }

  function handleEndTime(value: string) {
    setEndVisitTimeInput((current) => formatEditable12HourInput(current, value));
    setEndVisitTimeError(null);
  }

  async function finalize() {
    if (!visitaId || !recipeDraft || isSaving) return;
    setHasAttemptedFinalize(true);
    const validation = validateMixtures(mixtures, productOptions, assignedRefs);
    if (validation) {
      setError(validation);
      AccessibilityInfo.announceForAccessibility(validation);
      const firstIssue = findFirstMixtureIssue(mixtures, productOptions, assignedRefs);
      if (firstIssue) {
        scrollToIssue(firstIssue.issue, firstIssue.mixtureNumber);
      }
      return;
    }

    const normalizedTime = normalize12HourTimeForApi(
      normalizeTyped12HourInput(endVisitTimeInput),
      endVisitTimePeriod
    );
    const timeError = validateVisitEndTime(startVisitTime, normalizedTime);
    setEndVisitTimeError(timeError);
    if (timeError) {
      setError(timeError);
      AccessibilityInfo.announceForAccessibility(timeError);
      requestAnimationFrame(() =>
        scrollTargetIntoView(tutorialTargets.current.endTime ?? null)
      );
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const expandedFito = expandFitosanidad(recipeDraft.fitosanidadApps, mixtures);
      const factorized = deriveMezclaFactors(expandedFito, mixtures);
      const expandedFertilizers = expandFertilizers(
        recipeDraft.fertilizaciones,
        mixtures
      );
      visitaRecetasService.save(visitaId, {
        etapaFenologica:
          visitaRecetasService.getConsolidacionLocal(visitaId).etapaFenologica,
        mezclas: buildMezclasForSave(expandedFito, factorized),
        fertilizacion: buildFertilizacionesForSave(expandedFertilizers),
        riego: recipeDraft.riegoSelection
          ? { tipoRecomendacion: recipeDraft.riegoSelection }
          : null,
        labores: recipeDraft.laborSelections
      });
      await visitasCampoService.update(visitaId, { endVisitTime: normalizedTime });
      clearDraft();
      if (recipeIdentity) deleteVisitFormDraft(recipeIdentity);
      void scheduleSync({ immediate: true });
      router.replace("/visitas-campo/historial");
    } catch (reason) {
      const message = toApiError(reason).message || "No se pudo finalizar la receta.";
      setError(message);
      AccessibilityInfo.announceForAccessibility(message);
      flushDraft();
    } finally {
      setIsSaving(false);
    }
  }

  function handleTutorialScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setTutorialScrollY(event.nativeEvent.contentOffset.y);
  }

  function openTutorial() {
    setTutorialNotice(null);
    setTutorialHistory([]);
    setTutorialStepId(tutorialSteps[0]?.id ?? null);
  }

  function closeTutorial() {
    setTutorialStepId(null);
    setTutorialHistory([]);
  }

  function goToPreviousTutorialStep() {
    const { previousId, remainingHistory } = takePreviousTutorialStep(tutorialHistory);
    if (!previousId) return;

    setTutorialHistory(remainingHistory);
    setTutorialStepId(previousId);
  }

  function goToNextTutorialStep() {
    if (!currentTutorialStep) return;

    const nextStep = getNextTutorialStep(tutorialSteps, currentTutorialStep.id);
    if (!nextStep) {
      setTutorialStepId(null);
      setTutorialHistory([]);
      setTutorialNotice(
        "Tutorial terminado. Revisa cada mezcla y finaliza la visita cuando estes listo."
      );
      return;
    }

    setTutorialHistory((history) => [...history, currentTutorialStep.id]);
    setTutorialStepId(nextStep.id);
  }

  if (!isReady) {
    return (
      <ScreenContainer contentStyle={styles.container}>
        <AppHeader title="Preparando mezclas" subtitle="Cargando el avance guardado..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <FormScrollView
        contentContainerStyle={styles.content}
        onScroll={handleTutorialScroll}
        ref={formScrollRef}
        scrollEnabled={tutorialStepId === null}
      >
        <AppHeader
          title="Mezclas"
          subtitle="Paso 2 de 2 · Configura una mezcla a la vez"
        />

        <Pressable
          accessibilityLabel="Iniciar tutorial de mezclas"
          accessibilityRole="button"
          onPress={openTutorial}
          style={styles.tutorialButton}
        >
          <Ionicons color="#f4c95d" name="navigate" size={17} />
          <AppText style={styles.tutorialButtonText} variant="label">
            Tutorial
          </AppText>
        </Pressable>

        <AppCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressIcon}>
              <Ionicons color={theme.colors.primaryDark} name="flask-outline" size={22} />
            </View>
            <View style={styles.flex}>
              <AppText variant="heading">
                {productOptions.length === 0
                  ? "Sin productos por preparar"
                  : unassignedProducts.length > 0
                    ? `${unassignedProducts.length} producto${
                        unassignedProducts.length === 1 ? "" : "s"
                      } sin asignar`
                    : `${readyMixtureCount} de ${mixtures.length} mezclas listas`}
              </AppText>
              <AppText variant="caption">
                {productOptions.length === 0
                  ? "Puedes añadir un producto o continuar directamente al cierre."
                  : firstPendingMixture
                    ? `Continúa con la Mezcla ${firstPendingMixture.numero}.`
                    : "Todas las mezclas están listas para finalizar."}
              </AppText>
            </View>
            <AppText style={styles.progressPercent} variant="label">
              {completionPercentage}%
            </AppText>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: completionPercentage }}
            style={styles.progressTrack}
          >
            <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
          </View>
          <View style={styles.savedRow}>
            <Ionicons color={theme.colors.success} name="cloud-done-outline" size={18} />
            <AppText variant="caption">
              Avance guardado en este dispositivo. Puedes continuar luego.
            </AppText>
          </View>
        </AppCard>

        <>
          <View
            ref={(node) => {
              tutorialTargets.current.mixtureCount = node;
            }}
          >
            <AppCard style={styles.countCard}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}>
                  <Ionicons
                    color={theme.colors.primary}
                    name="layers-outline"
                    size={20}
                  />
                </View>
                <View style={styles.flex}>
                  <AppText variant="label">Cantidad de mezclas</AppText>
                  <AppText variant="caption">
                    Usa los controles o escribe un valor de 1 a 20.
                  </AppText>
                </View>
              </View>
              <View style={styles.countRow}>
                <Pressable
                  accessibilityLabel="Reducir cantidad de mezclas"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: editableMixtureCount <= 1 }}
                  disabled={editableMixtureCount <= 1}
                  onPress={() =>
                    requestMixtureCount(
                      getSteppedMixtureCount(mixtureCountInput, mixtures.length, -1)
                    )
                  }
                  style={({ pressed }) => [
                    styles.countStepButton,
                    editableMixtureCount <= 1 && styles.countStepButtonDisabled,
                    pressed && styles.pressedControl
                  ]}
                >
                  <Ionicons color={theme.colors.primary} name="remove" size={24} />
                </Pressable>
                <View style={styles.countInputWrap}>
                  <AppInput
                    accessibilityLabel="Cantidad de mezclas"
                    keyboardType="number-pad"
                    onChangeText={updateCountInput}
                    onEndEditing={commitCount}
                    onSubmitEditing={commitCount}
                    selectTextOnFocus
                    style={styles.countInput}
                    value={mixtureCountInput}
                  />
                </View>
                <Pressable
                  accessibilityLabel="Aumentar cantidad de mezclas"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: editableMixtureCount >= 20 }}
                  disabled={editableMixtureCount >= 20}
                  onPress={() =>
                    requestMixtureCount(
                      getSteppedMixtureCount(mixtureCountInput, mixtures.length, 1)
                    )
                  }
                  style={({ pressed }) => [
                    styles.countStepButton,
                    editableMixtureCount >= 20 && styles.countStepButtonDisabled,
                    pressed && styles.pressedControl
                  ]}
                >
                  <Ionicons color={theme.colors.primary} name="add" size={24} />
                </Pressable>
              </View>
            </AppCard>
          </View>

          <View
            ref={(node) => {
              tutorialTargets.current.mixtureSelection = node;
            }}
          >
            <ScrollView
              horizontal
              contentContainerStyle={styles.stepList}
              showsHorizontalScrollIndicator={false}
            >
              {mixtures.map((mixture) => {
                const status = mixtureStatus(mixture, productOptions);
                const pendingCount =
                  productOptions.length === 0
                    ? 0
                    : getMixtureIssues(mixture, productOptions).length;
                const selected = mixture.numero === activeNumber;
                return (
                  <Pressable
                    accessibilityLabel={`Mezcla ${mixture.numero}, ${
                      pendingCount > 0
                        ? `${pendingCount} datos pendientes`
                        : productOptions.length === 0
                          ? "sin productos"
                          : status
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={mixture.localId}
                    onPress={() => setActiveNumber(mixture.numero)}
                    style={[styles.stepChip, selected && styles.stepChipSelected]}
                  >
                    <AppText
                      style={selected ? styles.selectedText : undefined}
                      variant="label"
                    >
                      Mezcla {mixture.numero}
                    </AppText>
                    <AppText
                      style={selected ? styles.selectedText : undefined}
                      variant="caption"
                    >
                      {pendingCount > 0
                        ? `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`
                        : productOptions.length === 0
                          ? "Sin productos"
                          : status}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {activeMixture ? (
            <AppCard style={styles.mixtureCard}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleCopy}>
                  <AppText variant="heading">
                    Mezcla {activeMixture.numero} de {mixtures.length}
                  </AppText>
                  <AppText variant="caption">
                    {activeMixture.assignments.length} producto(s) seleccionado(s)
                  </AppText>
                </View>
                <StatusPill label={mixtureStatus(activeMixture, productOptions)} />
              </View>

              {mixtures.some(
                (item) =>
                  item.numero !== activeMixture.numero && item.assignments.length > 0
              ) ? (
                <View style={styles.copyBlock}>
                  <AppText variant="label">Copiar desde otra mezcla</AppText>
                  <View style={styles.wrapRow}>
                    {mixtures
                      .filter(
                        (item) =>
                          item.numero !== activeMixture.numero &&
                          item.assignments.length > 0
                      )
                      .map((source) => (
                        <AppButton
                          key={source.localId}
                          label={`Mezcla ${source.numero}`}
                          onPress={() => copyFrom(source)}
                          variant="outline"
                        />
                      ))}
                  </View>
                </View>
              ) : null}

              <View
                ref={(node) => {
                  sectionTargets.current.products = node;
                }}
                style={styles.sectionBlock}
              >
                <View
                  ref={(node) => {
                    tutorialTargets.current.products = node;
                  }}
                  style={styles.sectionHeading}
                >
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      color={theme.colors.primary}
                      name="cube-outline"
                      size={20}
                    />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="label">Productos de esta mezcla</AppText>
                    <AppText variant="caption">
                      Los seleccionados aparecen primero con sus datos de aplicación.
                    </AppText>
                  </View>
                </View>
                <AppSelectField
                  emptyMessage="No hay productos disponibles en los catalogos del dispositivo."
                  icon="search-outline"
                  isOpen={isDirectProductSearchOpen}
                  label="Añadir producto del catálogo"
                  maxVisibleOptions={5}
                  onClose={() => setIsDirectProductSearchOpen(false)}
                  onSelect={addDirectProduct}
                  onToggle={() => setIsDirectProductSearchOpen((current) => !current)}
                  options={directProductCatalog.map((item) => ({
                    value: item.key,
                    label: item.label,
                    helper: item.helper
                  }))}
                  placeholder="Buscar nombre comercial o fertilizante"
                  searchable
                  searchPlaceholder="Escribe el nombre del producto"
                />
                {productOptions.length === 0 ? (
                  <AppText variant="muted">
                    Aun no hay productos. Busca uno arriba para comenzar esta mezcla.
                  </AppText>
                ) : null}
                {productOptions.length > 0 ? (
                  <AppText style={styles.productListLabel} variant="caption">
                    Toca un producto para agregarlo o quitarlo de esta mezcla.
                  </AppText>
                ) : null}
                {[...productOptions]
                  .sort((left, right) => {
                    const leftSelected = activeMixture.assignments.some(
                      (item) => item.productRef === left.ref
                    );
                    const rightSelected = activeMixture.assignments.some(
                      (item) => item.productRef === right.ref
                    );
                    return Number(rightSelected) - Number(leftSelected);
                  })
                  .map((option) => {
                    const assignment = activeMixture.assignments.find(
                      (item) => item.productRef === option.ref
                    );
                    return (
                      <View
                        key={`${activeMixture.localId}-${option.ref}`}
                        style={[
                          styles.productBlock,
                          assignment && styles.productBlockSelected
                        ]}
                      >
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: Boolean(assignment) }}
                          onPress={() => toggleProduct(option)}
                          style={styles.productRow}
                        >
                          <Ionicons
                            color={
                              assignment ? theme.colors.primary : theme.colors.textMuted
                            }
                            name={assignment ? "checkbox" : "square-outline"}
                            size={24}
                          />
                          <View style={styles.flex}>
                            <AppText variant="label">{option.label}</AppText>
                            <AppText variant="caption">{option.subtitle}</AppText>
                          </View>
                        </Pressable>
                        {assignment ? (
                          <View style={styles.assignmentFields}>
                            <View
                              ref={(node) => {
                                issueTargets.current[`product:${option.ref}:dose`] = node;
                              }}
                            >
                              <AppInput
                                error={visibleIssueMessage(`product:${option.ref}:dose`)}
                                inputRef={(node) => {
                                  issueInputTargets.current[
                                    `product:${option.ref}:dose`
                                  ] = node;
                                }}
                                keyboardType="decimal-pad"
                                label={
                                  option.origin === "mezcla_directa"
                                    ? "Cantidad de dosis"
                                    : `Dosis (${assignment.unit || "unidad definida en Receta"})`
                                }
                                onChangeText={(dose) =>
                                  updateAssignment(option.ref, { dose })
                                }
                                onBlur={() =>
                                  markFieldTouched(`product:${option.ref}:dose`)
                                }
                                value={assignment.dose}
                              />
                            </View>
                            {option.origin === "mezcla_directa" ? (
                              <View
                                ref={(node) => {
                                  issueTargets.current[`product:${option.ref}:unit`] =
                                    node;
                                }}
                              >
                                <AppSelectField
                                  error={visibleIssueMessage(
                                    `product:${option.ref}:unit`
                                  )}
                                  isOpen={openUnitProductRef === option.ref}
                                  label="Unidad de dosis"
                                  onClose={() => setOpenUnitProductRef(null)}
                                  onSelect={(unit) => {
                                    updateAssignment(option.ref, { unit });
                                    markFieldTouched(`product:${option.ref}:unit`);
                                    setOpenUnitProductRef(null);
                                  }}
                                  onToggle={() =>
                                    setOpenUnitProductRef((current) =>
                                      current === option.ref ? null : option.ref
                                    )
                                  }
                                  options={getDirectDoseUnits(option).map((unit) => ({
                                    value: unit,
                                    label: unit
                                  }))}
                                  placeholder="Selecciona la unidad"
                                  selectedLabel={assignment.unit || undefined}
                                />
                              </View>
                            ) : null}
                            {option.viaAplicacion === "edafica" ? (
                              <View
                                ref={(node) => {
                                  issueTargets.current[`product:${option.ref}:plants`] =
                                    node;
                                }}
                              >
                                <AppInput
                                  error={visibleIssueMessage(
                                    `product:${option.ref}:plants`
                                  )}
                                  inputRef={(node) => {
                                    issueInputTargets.current[
                                      `product:${option.ref}:plants`
                                    ] = node;
                                  }}
                                  keyboardType="number-pad"
                                  label="Cantidad de plantas"
                                  onChangeText={(plants) =>
                                    updateAssignment(option.ref, { plants })
                                  }
                                  onBlur={() =>
                                    markFieldTouched(`product:${option.ref}:plants`)
                                  }
                                  value={assignment.plants}
                                />
                              </View>
                            ) : null}
                            {option.origin === "mezcla_directa" ? (
                              <Pressable
                                accessibilityLabel={`Quitar ${option.label} de la receta`}
                                accessibilityRole="button"
                                onPress={() => removeDirectProduct(option)}
                                style={styles.removeDirectProduct}
                              >
                                <Ionicons
                                  color={theme.colors.error}
                                  name="trash-outline"
                                  size={20}
                                />
                                <AppText
                                  style={styles.removeDirectProductText}
                                  variant="label"
                                >
                                  Quitar producto
                                </AppText>
                              </Pressable>
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
              </View>

              <View
                ref={(node) => {
                  sectionTargets.current.application = node;
                  tutorialTargets.current.frequency = node;
                }}
                style={styles.applicationBlock}
              >
                <View style={styles.sectionHeading}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      color={theme.colors.primary}
                      name="speedometer-outline"
                      size={20}
                    />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="label">Datos de aplicación</AppText>
                    <AppText variant="caption">
                      Completa solo los datos necesarios para estos productos.
                    </AppText>
                  </View>
                </View>
                {requiresVolume(activeMixture, productOptions) ? (
                  <View
                    ref={(node) => {
                      issueTargets.current["application:volume"] = node;
                    }}
                  >
                    <AppInput
                      error={visibleIssueMessage("application:volume")}
                      inputRef={(node) => {
                        issueInputTargets.current["application:volume"] = node;
                      }}
                      keyboardType="decimal-pad"
                      label="Volumen de aplicación (cilindros/ha)"
                      onBlur={() => markFieldTouched("application:volume")}
                      onChangeText={(volumenAplicacion) =>
                        updateActive({ volumenAplicacion })
                      }
                      value={activeMixture.volumenAplicacion}
                    />
                  </View>
                ) : null}
                <View
                  ref={(node) => {
                    issueTargets.current["application:frequency"] = node;
                  }}
                >
                  <AppInput
                    error={visibleIssueMessage("application:frequency")}
                    inputRef={(node) => {
                      issueInputTargets.current["application:frequency"] = node;
                    }}
                    label="Frecuencia de dosis"
                    maxLength={200}
                    onBlur={() => markFieldTouched("application:frequency")}
                    onChangeText={(frecuenciaDosis) => updateActive({ frecuenciaDosis })}
                    placeholder="Ej. Cada 7 dias"
                    value={activeMixture.frecuenciaDosis ?? ""}
                  />
                </View>
              </View>

              <View
                ref={(node) => {
                  sectionTargets.current.coadyuvants = node;
                  tutorialTargets.current.coadyuvants = node;
                }}
                style={[styles.sectionBlock, styles.coadjuvantSection]}
              >
                <AppCollapsibleHeader
                  closeLabel="Ocultar"
                  icon="water-outline"
                  isExpanded={isCoadjuvantsExpanded}
                  onToggle={() => setIsCoadjuvantsExpanded((current) => !current)}
                  openLabel="Agregar o revisar"
                  statusLabel={
                    activeMixtureIssues.some((issue) => issue.section === "coadyuvants")
                      ? "Falta completar dosis"
                      : activeMixture.coadyuvantesIds.length > 0
                        ? `${activeMixture.coadyuvantesIds.length} agregado${
                            activeMixture.coadyuvantesIds.length === 1 ? "" : "s"
                          }`
                        : "Opcional"
                  }
                  statusTone={
                    activeMixtureIssues.some((issue) => issue.section === "coadyuvants")
                      ? "warning"
                      : activeMixture.coadyuvantesIds.length > 0
                        ? "success"
                        : "neutral"
                  }
                  subtitle={
                    activeMixture.coadyuvantesIds.length > 0
                      ? "Revisa la dosis de cada coadyuvante seleccionado."
                      : "Añádelos solamente cuando la preparación los requiera."
                  }
                  title="Coadyuvantes"
                />
                {isCoadjuvantsExpanded ? (
                  <View style={styles.collapsibleContent}>
                    <View style={styles.wrapRow}>
                      {visitaRecetasService.getCatalogos().coadyuvantes.map((item) => {
                        const selected = activeMixture.coadyuvantesIds.includes(item.id);
                        return (
                          <Pressable
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected }}
                            key={item.id}
                            onPress={() => toggleCoadjuvant(item.id)}
                            style={[
                              styles.optionChip,
                              selected && styles.optionChipSelected
                            ]}
                          >
                            <AppText
                              style={selected ? styles.optionTextSelected : undefined}
                              variant="label"
                            >
                              {item.name}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>

                    {activeMixture.coadyuvantesIds.map((id) => {
                      const coadyuvante = visitaRecetasService
                        .getCatalogos()
                        .coadyuvantes.find((item) => item.id === id);
                      return (
                        <View
                          key={`${activeMixture.localId}-dose-${id}`}
                          ref={(node) => {
                            issueTargets.current[`coadyuvant:${id}:dose`] = node;
                          }}
                        >
                          <AppInput
                            error={visibleIssueMessage(`coadyuvant:${id}:dose`)}
                            inputRef={(node) => {
                              issueInputTargets.current[`coadyuvant:${id}:dose`] = node;
                            }}
                            label={`Dosis de ${coadyuvante?.name ?? "coadyuvante"}`}
                            onBlur={() => markFieldTouched(`coadyuvant:${id}:dose`)}
                            onChangeText={(dose) => updateCoadjuvantDose(id, dose)}
                            placeholder="Ej. 100 ml/cilindro"
                            value={activeMixture.coadyuvantesDosis?.[id] ?? ""}
                          />
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              <View
                ref={(node) => {
                  tutorialTargets.current.preparationOrder = node;
                }}
                style={styles.orderBlock}
              >
                <AppCollapsibleHeader
                  closeLabel="Ocultar"
                  icon="list-outline"
                  isExpanded={isPreparationOrderExpanded}
                  onToggle={() => setIsPreparationOrderExpanded((current) => !current)}
                  openLabel="Revisar orden"
                  statusLabel={`${activeMixture.ordenMezcla.length} pasos`}
                  statusTone="neutral"
                  subtitle="Se genera automáticamente y mantiene el agua primero."
                  title="Orden de preparación"
                />
                {isPreparationOrderExpanded ? (
                  <View style={styles.collapsibleContent}>
                    {movableOrderCount >= 2 ? (
                      <AppButton
                        label={
                          isReordering ? "Terminar reordenamiento" : "Modificar orden"
                        }
                        onPress={() => {
                          setIsReordering((current) => !current);
                          setSelectedOrderIndex(null);
                        }}
                        variant={isReordering ? "primary" : "outline"}
                      />
                    ) : null}
                    {isReordering ? (
                      <AppText style={styles.reorderHint} variant="caption">
                        {selectedOrderIndex === null
                          ? "Toca el primer elemento que deseas mover."
                          : "Ahora toca el elemento con el que deseas intercambiarlo."}
                      </AppText>
                    ) : null}
                    {activeMixture.ordenMezcla.map((item, index) => {
                      const fixed = isOrdenMezclaFixedItem(item);
                      const selected = selectedOrderIndex === index;
                      return (
                        <Pressable
                          accessibilityLabel={`${index + 1}. ${item}${fixed ? ", posicion fija" : ""}`}
                          accessibilityRole="button"
                          accessibilityState={{
                            disabled: !isReordering || fixed,
                            selected
                          }}
                          disabled={!isReordering || fixed}
                          key={`${item}-${index}`}
                          onPress={() => exchangeOrderItem(index)}
                          style={[
                            styles.orderItem,
                            fixed && styles.orderItemFixed,
                            isReordering && !fixed && styles.orderItemMovable,
                            selected && styles.orderItemSelected
                          ]}
                        >
                          <View style={styles.orderNumber}>
                            <AppText variant="caption">{index + 1}</AppText>
                          </View>
                          <AppText style={styles.orderItemText} variant="label">
                            {item}
                          </AppText>
                          <Ionicons
                            color={fixed ? theme.colors.textMuted : theme.colors.primary}
                            name={fixed ? "lock-closed-outline" : "swap-vertical-outline"}
                            size={18}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>

              {activeMixtureIssues.length > 0 ? (
                <View style={styles.pendingPanel}>
                  <View style={styles.pendingTitleRow}>
                    <Ionicons
                      color={theme.colors.warning}
                      name="alert-circle-outline"
                      size={22}
                    />
                    <View style={styles.flex}>
                      <AppText variant="label">
                        {activeMixtureIssues.length} dato
                        {activeMixtureIssues.length === 1 ? "" : "s"} por completar
                      </AppText>
                      <AppText variant="caption">
                        Toca un pendiente para ir a esa sección.
                      </AppText>
                    </View>
                  </View>
                  {activeMixtureIssues.slice(0, 3).map((issue) => (
                    <Pressable
                      accessibilityRole="button"
                      key={issue.id}
                      onPress={() => scrollToIssue(issue)}
                      style={({ pressed }) => [
                        styles.pendingItem,
                        pressed && styles.pressedControl
                      ]}
                    >
                      <Ionicons
                        color={theme.colors.warning}
                        name="ellipse-outline"
                        size={16}
                      />
                      <AppText style={styles.pendingItemText} variant="caption">
                        {issue.message}
                      </AppText>
                      <Ionicons
                        color={theme.colors.primary}
                        name="chevron-forward"
                        size={18}
                      />
                    </Pressable>
                  ))}
                  {activeMixtureIssues.length > 3 ? (
                    <AppText variant="caption">
                      Y {activeMixtureIssues.length - 3} pendiente(s) más.
                    </AppText>
                  ) : null}
                </View>
              ) : productOptions.length > 0 ? (
                <View style={styles.readyPanel}>
                  <Ionicons
                    color={theme.colors.success}
                    name="checkmark-circle"
                    size={22}
                  />
                  <AppText style={styles.readyText} variant="label">
                    Esta mezcla esta lista.
                  </AppText>
                </View>
              ) : null}

              {shouldShowMixtureNavigation(mixtures.length) ? (
                <View style={styles.navigationRow}>
                  <AppButton
                    disabled={activeNumber <= 1}
                    label="Mezcla anterior"
                    onPress={() => setActiveNumber((current) => current - 1)}
                    variant="outline"
                  />
                  {navigationTargetNumber ? (
                    <AppButton
                      label={`Continuar con Mezcla ${navigationTargetNumber}`}
                      onPress={() => setActiveNumber(navigationTargetNumber)}
                    />
                  ) : null}
                </View>
              ) : null}
            </AppCard>
          ) : null}
        </>

        <View
          ref={(node) => {
            tutorialTargets.current.endTime = node;
          }}
        >
          <AppCard>
            <AppText variant="heading">Cierre de visita</AppText>
            <AppText variant="muted">
              {firstPendingMixture
                ? `Aún falta completar la Mezcla ${firstPendingMixture.numero}. Puedes confirmar la hora ahora y finalizar después.`
                : "Todas las mezclas están listas. Confirma la hora real de cierre."}
            </AppText>
            <Time12HourInput
              error={endVisitTimeError}
              label="Hora de fin"
              onChangeText={handleEndTime}
              onEndEditing={() => {
                const normalized = normalizeTyped12HourInput(endVisitTimeInput);
                setEndVisitTimeInput(normalized);
                setEndVisitTimeError(
                  validateVisitEndTime(
                    startVisitTime,
                    normalize12HourTimeForApi(normalized, endVisitTimePeriod)
                  )
                );
              }}
              onPeriodChange={(period) => {
                setEndVisitTimePeriod(period);
                setEndVisitTimeError(null);
              }}
              period={endVisitTimePeriod}
              value={endVisitTimeInput}
            />
          </AppCard>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorText} variant="label">
              {error}
            </AppText>
          </View>
        ) : null}

        <View
          ref={(node) => {
            tutorialTargets.current.finish = node;
          }}
          style={styles.actions}
        >
          <AppButton
            label="Volver a Receta"
            onPress={() => {
              flushDraft();
              router.replace({
                pathname: "/visitas-campo/[id]/receta",
                params: { id: visitaId ?? "" }
              });
            }}
            variant="outline"
          />
          <AppButton
            icon="checkmark-circle-outline"
            label={firstPendingMixture ? "Revisar pendientes" : "Finalizar visita"}
            loading={isSaving}
            onPress={() => void finalize()}
          />
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
          canGoBack={tutorialHistory.length > 0}
          currentPosition={
            tutorialSteps.findIndex((step) => step.id === currentTutorialStep.id) + 1
          }
          onBack={goToPreviousTutorialStep}
          onClose={closeTutorial}
          onNext={goToNextTutorialStep}
          refreshKey={currentTutorialStep.id}
          scrollRef={formScrollRef}
          scrollY={tutorialScrollY}
          step={currentTutorialStep}
          target={
            tutorialTargets.current[getMixtureTutorialTargetId(currentTutorialStep.id)] ??
            null
          }
          totalSteps={tutorialSteps.length}
        />
      ) : null}
    </ScreenContainer>
  );

  function buildOrder(assignments: MixtureAssignment[], coadyuvantIds: string[]) {
    const labels = assignments
      .map(
        (assignment) =>
          productOptions.find((item) => item.ref === assignment.productRef)?.label
      )
      .filter((item): item is string => Boolean(item));
    const catalog = visitaRecetasService.getCatalogos().coadyuvantes;
    const coadjuvantNames = coadyuvantIds
      .map((id) => catalog.find((item) => item.id === id)?.name)
      .filter((item): item is string => Boolean(item));
    return generateOrdenMezcla(coadjuvantNames, labels);
  }

  function buildOrderWithAddedProduct(
    assignments: MixtureAssignment[],
    coadyuvantIds: string[],
    addedRef: string,
    addedLabel: string
  ) {
    const labels = assignments
      .map((assignment) =>
        assignment.productRef === addedRef
          ? addedLabel
          : productOptions.find((item) => item.ref === assignment.productRef)?.label
      )
      .filter((item): item is string => Boolean(item));
    const coadjuvantNames = coadyuvantIds
      .map((id) => recipeCatalogs.coadyuvantes.find((item) => item.id === id)?.name)
      .filter((item): item is string => Boolean(item));
    return generateOrdenMezcla(coadjuvantNames, labels);
  }
}

function buildProductOptions(draft: RecetaFormDraft | null): ProductOption[] {
  if (!draft) return [];
  const fitos = draft.fitosanidadApps.flatMap((application) =>
    application.ingredientes
      .filter((item) =>
        Boolean(item.marcaProductoNombre.trim() || item.ingredienteActivoNombre.trim())
      )
      .map((item) => ({
        ref: item.localId,
        kind: "fitosanitario" as const,
        label: item.marcaProductoNombre.trim() || item.ingredienteActivoNombre.trim(),
        subtitle: `${application.objetivoNombre} · Fitosanitario`,
        dose: item.dosisProducto,
        unit: item.unidadDosis ?? "",
        plants: "",
        viaAplicacion: "foliar" as const,
        origin: application.origen ?? "recomendacion",
        productType: null
      }))
  );
  const fertilizers = draft.fertilizaciones
    .filter((item) => Boolean(item.fertilizanteNombre.trim()))
    .map((item) => ({
      ref: item.localId,
      kind: "fertilizante" as const,
      label: item.fertilizanteNombre,
      subtitle: `${item.nutrienteNombre || "Nutricion"} · ${item.viaAplicacion === "edafica" ? "Edafico" : "Foliar"}`,
      dose: item.dosis,
      unit: item.unidadDosis,
      plants: item.cantidadTotalPlantas,
      viaAplicacion: item.viaAplicacion,
      origin: item.origen ?? "recomendacion",
      productType: item.tipoProducto
    }));
  return [...fitos, ...fertilizers];
}

export function initializeMixtures(
  draft: RecetaFormDraft,
  options: ProductOption[]
): EditableMixture[] {
  const count = Math.max(1, draft.mezclas.length);
  return Array.from({ length: count }, (_, index) => {
    const numero = index + 1;
    const base = draft.mezclas[index] ?? createEmptyMezcla(numero);
    const assignments = options
      .filter((option) => {
        if (option.kind === "fitosanitario") {
          return draft.fitosanidadApps.some((application) =>
            application.ingredientes.some(
              (item) => item.localId === option.ref && item.mezclaNumero === numero
            )
          );
        }
        return draft.fertilizaciones.some(
          (item) => item.localId === option.ref && item.mezclaNumero === numero
        );
      })
      .map((option) => ({
        productRef: option.ref,
        kind: option.kind,
        dose: option.dose,
        unit: option.unit,
        plants: option.plants
      }));
    return { ...base, numero, assignments };
  });
}

function sanitizeMixtures(mixtures: EditableMixture[], validRefs: Set<string>) {
  const current =
    mixtures.length > 0 ? mixtures : [{ ...createEmptyMezcla(1), assignments: [] }];
  return current.slice(0, 20).map((mixture, index) => ({
    ...mixture,
    numero: index + 1,
    coadyuvantesDosis: Object.fromEntries(
      Object.entries(mixture.coadyuvantesDosis ?? {}).filter(([id]) =>
        mixture.coadyuvantesIds.includes(id)
      )
    ),
    assignments: mixture.assignments.filter((item) => validRefs.has(item.productRef))
  }));
}

function expandFitosanidad(
  applications: AppFitosanidad[],
  mixtures: EditableMixture[]
): AppFitosanidad[] {
  return applications.map((application) => ({
    ...application,
    ingredientes: application.ingredientes.flatMap((ingredient) =>
      mixtures.flatMap((mixture) =>
        mixture.assignments
          .filter(
            (assignment) =>
              assignment.kind === "fitosanitario" &&
              assignment.productRef === ingredient.localId
          )
          .map((assignment) => ({
            ...ingredient,
            mezclaNumero: mixture.numero,
            dosisProducto: assignment.dose,
            unidadDosis: assignment.unit
          }))
      )
    )
  }));
}

function expandFertilizers(
  fertilizers: AppFertilizacion[],
  mixtures: EditableMixture[]
): AppFertilizacion[] {
  return fertilizers.flatMap((fertilizer) =>
    mixtures.flatMap((mixture) =>
      mixture.assignments
        .filter(
          (assignment) =>
            assignment.kind === "fertilizante" &&
            assignment.productRef === fertilizer.localId
        )
        .map((assignment) => ({
          ...fertilizer,
          mezclaNumero: mixture.numero,
          dosis: assignment.dose,
          unidadDosis: assignment.unit,
          cantidadTotalPlantas:
            fertilizer.viaAplicacion === "edafica" ? assignment.plants : "",
          volumenAplicacion:
            fertilizer.viaAplicacion === "foliar" ? mixture.volumenAplicacion : ""
        }))
    )
  );
}

function StatusPill({ label }: { label: string }) {
  const ready = label === "Lista";
  const empty = label === "Sin configurar";
  return (
    <View
      style={[
        styles.statusPill,
        ready && styles.statusPillReady,
        empty && styles.statusPillEmpty
      ]}
    >
      <Ionicons
        color={
          ready
            ? theme.colors.success
            : empty
              ? theme.colors.textMuted
              : theme.colors.warning
        }
        name={ready ? "checkmark-circle" : empty ? "ellipse-outline" : "create-outline"}
        size={16}
      />
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: 40 },
  tutorialButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: "rgba(244, 201, 93, 0.58)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 14
  },
  tutorialButtonText: {
    color: theme.colors.text,
    fontSize: 13
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
  tutorialNoticeText: { color: theme.colors.primaryDark },
  progressCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primaryLight,
    gap: 12
  },
  progressHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  progressIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  progressPercent: { color: theme.colors.primaryDark },
  progressTrack: {
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.radius.full,
    height: 8,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: "100%"
  },
  savedRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  countCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primaryLight
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center"
  },
  countStepButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  countStepButtonDisabled: { opacity: 0.4 },
  countInputWrap: { width: 84 },
  countInput: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  pressedControl: { opacity: 0.72 },
  stepList: { gap: 8, paddingVertical: 4 },
  stepChip: {
    minWidth: 128,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 2
  },
  stepChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  mixtureCard: {
    borderTopWidth: 4,
    borderTopColor: theme.colors.primary,
    gap: theme.spacing.md
  },
  selectedText: { color: theme.colors.textInverse },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  cardTitleCopy: { flex: 1 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.warningMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusPillReady: { backgroundColor: theme.colors.successMuted },
  statusPillEmpty: { backgroundColor: theme.colors.borderLight },
  pendingPanel: {
    backgroundColor: theme.colors.warningMuted,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  pendingTitleRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  pendingItem: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  pendingItemText: { flex: 1 },
  readyPanel: {
    alignItems: "center",
    backgroundColor: theme.colors.successMuted,
    borderColor: theme.colors.success,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  readyText: { color: theme.colors.primaryDark },
  sectionBlock: {
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surfaceElevated
  },
  coadjuvantSection: {
    borderColor: theme.colors.info,
    backgroundColor: theme.colors.infoMuted
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primaryMuted
  },
  copyBlock: {
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated
  },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  productBlock: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    overflow: "hidden"
  },
  productBlockSelected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary
  },
  productListLabel: { color: theme.colors.textMuted },
  productRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12
  },
  removeDirectProduct: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorMuted
  },
  removeDirectProductText: { color: theme.colors.error },
  assignmentFields: { gap: 12, padding: 12, paddingTop: 0 },
  applicationBlock: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  collapsibleContent: { gap: 12, paddingTop: 4 },
  flex: { flex: 1, gap: 2 },
  optionChip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceElevated
  },
  optionChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryMuted
  },
  optionTextSelected: { color: theme.colors.primaryDark },
  orderBlock: {
    gap: 10,
    padding: 12,
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning
  },
  reorderHint: { color: theme.colors.primaryDark },
  orderItem: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  orderItemFixed: { backgroundColor: theme.colors.borderLight },
  orderItemMovable: { borderColor: theme.colors.primary },
  orderItemSelected: {
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryMuted
  },
  orderNumber: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.warningMuted
  },
  orderItemText: { flex: 1 },
  navigationRow: { gap: 12 },
  actions: { gap: 12 },
  errorBanner: {
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  errorText: { color: theme.colors.error }
});
