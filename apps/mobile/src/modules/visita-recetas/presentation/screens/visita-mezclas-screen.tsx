import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppText,
  FormScrollView,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import {
  buildVisitDraftScopeKey,
  deleteVisitFormDraft,
  readVisitFormDraft,
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
  generateOrdenMezcla,
  isOrdenMezclaFixedItem,
  swapOrdenMezclaItems
} from "./visita-receta-order";
import {
  buildFertilizacionesForSave,
  buildMezclasForSave,
  createEmptyMezcla,
  deriveMezclaFactors,
  type AppFertilizacion,
  type AppFitosanidad
} from "./visita-receta-multiple-products";
import type { RecetaFormDraft } from "./visita-receta-screen";
import {
  copyMixtureConfiguration,
  mixtureStatus,
  parseMixtureCount,
  requiresVolume,
  shouldShowMixtureNavigation,
  validateMixtures,
  type EditableMixture,
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
  const isCountConfirmationOpen = useRef(false);

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
      const restored = sanitizeMixtures(saved.mixtures, validRefs, options);
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
  const movableOrderCount =
    activeMixture?.ordenMezcla.filter((item) => !isOrdenMezclaFixedItem(item)).length ??
    0;
  const assignedRefs = new Set(
    mixtures.flatMap((mixture) => mixture.assignments.map((item) => item.productRef))
  );

  useEffect(() => {
    setIsReordering(false);
    setSelectedOrderIndex(null);
  }, [activeNumber]);

  function updateActive(patch: Partial<EditableMixture>) {
    setMixtures((current) =>
      current.map((item) => (item.numero === activeNumber ? { ...item, ...patch } : item))
    );
    setError(null);
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
      activeMixture.coadyuvantesIds.length > 0
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
    const normalizedTime = normalize12HourTimeForApi(
      normalizeTyped12HourInput(endVisitTimeInput),
      endVisitTimePeriod
    );
    const timeError = validateVisitEndTime(startVisitTime, normalizedTime);
    setEndVisitTimeError(timeError);
    if (timeError) {
      setError(timeError);
      return;
    }
    const validation = validateMixtures(mixtures, productOptions, assignedRefs);
    if (validation) {
      setError(validation);
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
      setError(toApiError(reason).message || "No se pudo finalizar la receta.");
      flushDraft();
    } finally {
      setIsSaving(false);
    }
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
      <FormScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Mezclas"
          subtitle="Paso 2 de 2 · Configura una mezcla a la vez"
        />

        <AppCard style={styles.guideCard}>
          <View style={styles.guideTitle}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={theme.colors.primary}
            />
            <AppText variant="label">Tu avance se guarda en este dispositivo</AppText>
          </View>
          <AppText variant="muted">
            Puedes salir y continuar luego desde el historial de la visita.
          </AppText>
        </AppCard>

        {productOptions.length === 0 ? (
          <AppCard>
            <AppText variant="heading">No requiere mezcla</AppText>
            <AppText variant="muted">
              La receta no contiene productos comerciales, ingredientes activos ni
              fertilizantes.
            </AppText>
          </AppCard>
        ) : (
          <>
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
                    Escribe un valor de 1 a 20 y luego aplícalo.
                  </AppText>
                </View>
              </View>
              <View style={styles.countRow}>
                <View style={styles.flex}>
                  <AppInput
                    accessibilityLabel="Cantidad de mezclas"
                    keyboardType="number-pad"
                    onChangeText={updateCountInput}
                    onEndEditing={commitCount}
                    value={mixtureCountInput}
                  />
                </View>
                <AppButton label="Aplicar" onPress={commitCount} size="small" />
              </View>
            </AppCard>

            <ScrollView
              horizontal
              contentContainerStyle={styles.stepList}
              showsHorizontalScrollIndicator={false}
            >
              {mixtures.map((mixture) => {
                const status = mixtureStatus(mixture, productOptions);
                const selected = mixture.numero === activeNumber;
                return (
                  <Pressable
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
                      {status}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {activeMixture ? (
              <AppCard style={styles.mixtureCard}>
                <View style={styles.cardTitleRow}>
                  <View>
                    <AppText variant="heading">Mezcla {activeMixture.numero}</AppText>
                    <AppText variant="caption">
                      {activeMixture.assignments.length} producto(s) seleccionado(s)
                    </AppText>
                  </View>
                  <StatusPill label={mixtureStatus(activeMixture, productOptions)} />
                </View>

                {mixtures.length > 1 ? (
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
                            size="small"
                            variant="outline"
                          />
                        ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeading}>
                    <View style={styles.sectionIcon}>
                      <Ionicons
                        color={theme.colors.primary}
                        name="cube-outline"
                        size={20}
                      />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="label">Productos de la receta</AppText>
                      <AppText variant="caption">
                        Selecciona los que se usarán en esta mezcla.
                      </AppText>
                    </View>
                  </View>
                  {productOptions.map((option) => {
                    const assignment = activeMixture.assignments.find(
                      (item) => item.productRef === option.ref
                    );
                    return (
                      <View
                        key={`${activeMixture.localId}-${option.ref}`}
                        style={styles.productBlock}
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
                            <AppInput
                              keyboardType="decimal-pad"
                              label={`Dosis (${assignment.unit || "unidad definida en Receta"})`}
                              onChangeText={(dose) =>
                                updateAssignment(option.ref, { dose })
                              }
                              value={assignment.dose}
                            />
                            {option.viaAplicacion === "edafica" ? (
                              <AppInput
                                keyboardType="number-pad"
                                label="Cantidad de plantas"
                                onChangeText={(plants) =>
                                  updateAssignment(option.ref, { plants })
                                }
                                value={assignment.plants}
                              />
                            ) : null}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {requiresVolume(activeMixture, productOptions) ? (
                  <AppInput
                    keyboardType="decimal-pad"
                    label="Volumen de aplicacion (cilindros/ha)"
                    onChangeText={(volumenAplicacion) =>
                      updateActive({ volumenAplicacion })
                    }
                    value={activeMixture.volumenAplicacion}
                  />
                ) : null}

                <View style={[styles.sectionBlock, styles.coadjuvantSection]}>
                  <View style={styles.sectionHeading}>
                    <View style={styles.sectionIcon}>
                      <Ionicons
                        color={theme.colors.info}
                        name="water-outline"
                        size={20}
                      />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="label">Coadyuvantes de esta mezcla</AppText>
                      <AppText variant="caption">
                        La dosis y unidad son obligatorias para cada selección.
                      </AppText>
                    </View>
                  </View>
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
                      <AppInput
                        error={
                          activeMixture.coadyuvantesDosis?.[id]?.trim()
                            ? null
                            : "Ingresa dosis y unidad."
                        }
                        key={`${activeMixture.localId}-dose-${id}`}
                        label={`Dosis de ${coadyuvante?.name ?? "coadyuvante"}`}
                        onChangeText={(dose) => updateCoadjuvantDose(id, dose)}
                        placeholder="Ej. 100 ml/cilindro"
                        value={activeMixture.coadyuvantesDosis?.[id] ?? ""}
                      />
                    );
                  })}
                </View>

                <View style={styles.orderBlock}>
                  <View style={styles.orderHeader}>
                    <View style={styles.flex}>
                      <AppText variant="label">Orden de preparación</AppText>
                      <AppText variant="caption">
                        Agua permanece fija. Intercambia dos elementos para reordenar.
                      </AppText>
                    </View>
                    {movableOrderCount >= 2 ? (
                      <AppButton
                        label={isReordering ? "Listo" : "Reordenar"}
                        onPress={() => {
                          setIsReordering((current) => !current);
                          setSelectedOrderIndex(null);
                        }}
                        size="small"
                        variant={isReordering ? "primary" : "outline"}
                      />
                    ) : null}
                  </View>
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

                {shouldShowMixtureNavigation(mixtures.length) ? (
                  <View style={styles.navigationRow}>
                    <AppButton
                      disabled={activeNumber <= 1}
                      label="Anterior"
                      onPress={() => setActiveNumber((current) => current - 1)}
                      variant="outline"
                    />
                    <AppButton
                      disabled={activeNumber >= mixtures.length}
                      label="Siguiente"
                      onPress={() => setActiveNumber((current) => current + 1)}
                    />
                  </View>
                ) : null}
              </AppCard>
            ) : null}
          </>
        )}

        <AppCard>
          <AppText variant="heading">Cierre de visita</AppText>
          <AppText variant="muted">
            Confirma la hora real. Es obligatoria para finalizar.
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

        {error ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.errorText} variant="label">
              {error}
            </AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
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
            label="Finalizar visita"
            loading={isSaving}
            onPress={() => void finalize()}
          />
        </View>
      </FormScrollView>
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
        viaAplicacion: "foliar" as const
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
      viaAplicacion: item.viaAplicacion
    }));
  return [...fitos, ...fertilizers];
}

export function initializeMixtures(
  draft: RecetaFormDraft,
  options: ProductOption[]
): EditableMixture[] {
  if (options.length === 0) return [];
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

function sanitizeMixtures(
  mixtures: EditableMixture[],
  validRefs: Set<string>,
  options: ProductOption[]
) {
  if (options.length === 0) return [];
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
  guideCard: { backgroundColor: theme.colors.infoMuted },
  guideTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  countCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primaryLight
  },
  countRow: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  productRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12
  },
  assignmentFields: { gap: 12, padding: 12, paddingTop: 0 },
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
  orderHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  navigationRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  actions: { gap: 12 },
  errorBanner: {
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  errorText: { color: theme.colors.error }
});
