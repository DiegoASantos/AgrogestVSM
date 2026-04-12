import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer,
  type AppSelectOption
} from "../../../../shared/components";
import { toApiError } from "../../../../shared/services";
import { RecomendacionFormCard } from "../components/recomendacion-form-card";
import { recomendacionesService } from "../../services";
import type {
  RecommendationTypeCatalogItem,
  RecomendacionFormErrors,
  RecomendacionFormValues,
  VisitaRecomendacion
} from "../../types";

const INITIAL_FORM_VALUES: RecomendacionFormValues = {
  recommendationTypeId: "",
  applies: "true",
  detail: ""
};

const APPLY_OPTIONS: AppSelectOption[] = [
  { value: "true", label: "Si" },
  { value: "false", label: "No" }
];

export function VisitaRecomendacionesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [recomendaciones, setRecomendaciones] = useState<VisitaRecomendacion[]>([]);
  const [recommendationTypes, setRecommendationTypes] = useState<
    RecommendationTypeCatalogItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingRecommendationTypes, setIsLoadingRecommendationTypes] =
    useState(true);
  const [recommendationTypesError, setRecommendationTypesError] = useState<
    string | null
  >(null);
  const [formValues, setFormValues] =
    useState<RecomendacionFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<RecomendacionFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingRecomendacionId, setEditingRecomendacionId] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSelect, setActiveSelect] = useState<
    "recommendationType" | "applies" | null
  >(null);

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }

    void Promise.all([loadRecomendaciones(visitaId), loadRecommendationTypes()]);
  }, [visitaId]);

  const recommendationTypeOptions = useMemo<AppSelectOption[]>(
    () =>
      recommendationTypes
        .filter((recommendationType) => recommendationType.isActive)
        .map((recommendationType) => ({
          value: recommendationType.id,
          label: recommendationType.name
        })),
    [recommendationTypes]
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RecomendacionFormCard
          activeSelect={activeSelect}
          applyOptions={APPLY_OPTIONS}
          errors={formErrors}
          isEditing={editingRecomendacionId !== null}
          isLoadingRecommendationTypes={isLoadingRecommendationTypes}
          isSubmitting={isSubmitting}
          onCancelEdit={resetForm}
          onChange={handleFormChange}
          onSubmit={() => {
            void handleSubmit();
          }}
          onToggleSelect={toggleSelect}
          recommendationTypeOptions={recommendationTypeOptions}
          recommendationTypesError={recommendationTypesError}
          selectedApplyLabel={getSelectedLabel(APPLY_OPTIONS, formValues.applies)}
          selectedRecommendationTypeLabel={getSelectedLabel(
            recommendationTypeOptions,
            formValues.recommendationTypeId
          )}
          submitError={submitError}
          values={formValues}
        />

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando recomendaciones...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error al cargar" subtitle={error} />
            <AppButton
              label="Reintentar"
              onPress={() => {
                if (visitaId) {
                  void loadRecomendaciones(visitaId);
                }
              }}
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && recomendaciones.length === 0 ? (
          <AppEmptyState
            title="Sin recomendaciones"
            message="Agrega la primera recomendacion usando el formulario de arriba."
          />
        ) : null}

        {!isLoading && !error && recomendaciones.length > 0
          ? recomendaciones.map((recomendacion) => (
              <AppCard key={recomendacion.id} variant="outlined">
                <View style={styles.itemInfo}>
                  <AppText variant="eyebrow">
                    {getRecommendationTypeLabel(
                      recomendacion.recommendationTypeId,
                      recommendationTypes
                    )}
                  </AppText>
                  <AppText variant="label">
                    {recomendacion.detail || "Sin detalle registrado"}
                  </AppText>
                  <AppText variant="caption">
                    {recomendacion.applies ? "Aplica" : "No aplica"}
                  </AppText>
                </View>

                <View style={styles.itemActions}>
                  <AppButton
                    label="Editar"
                    onPress={() => startEdit(recomendacion)}
                    variant="secondary"
                    size="small"
                  />
                  <AppButton
                    label="Eliminar"
                    onPress={() => {
                      confirmDelete(recomendacion);
                    }}
                    variant="outline"
                    size="small"
                  />
                </View>
              </AppCard>
            ))
          : null}

        <AppButton
          label="Volver a visita"
          onPress={() => router.back()}
          variant="outline"
        />
      </ScrollView>
    </ScreenContainer>
  );

  function handleFormChange<K extends keyof RecomendacionFormValues>(
    field: K,
    value: RecomendacionFormValues[K]
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
    setSubmitError(null);
    if (field === "recommendationTypeId" || field === "applies") {
      setActiveSelect(null);
    }
  }

  function toggleSelect(field: "recommendationType" | "applies") {
    setActiveSelect((currentValue) => (currentValue === field ? null : field));
  }

  function startEdit(recomendacion: VisitaRecomendacion) {
    setEditingRecomendacionId(recomendacion.id);
    setSubmitError(null);
    setFormErrors({});
    setFormValues({
      recommendationTypeId: recomendacion.recommendationTypeId,
      applies: String(recomendacion.applies),
      detail: recomendacion.detail ?? ""
    });
    setActiveSelect(null);
  }

  function resetForm() {
    setEditingRecomendacionId(null);
    setFormValues(INITIAL_FORM_VALUES);
    setFormErrors({});
    setSubmitError(null);
    setActiveSelect(null);
  }

  async function handleSubmit() {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    const nextErrors = validateForm(formValues);

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      setSubmitError("Revisa los datos antes de guardar.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (editingRecomendacionId) {
        await recomendacionesService.update(
          editingRecomendacionId,
          buildUpdatePayload(formValues)
        );
        Alert.alert("Recomendacion actualizada", "Los cambios se guardaron.");
      } else {
        await recomendacionesService.create(
          visitaId,
          buildCreatePayload(formValues)
        );
        Alert.alert(
          "Recomendacion creada",
          "La recomendacion se registro correctamente."
        );
      }

      resetForm();
      await loadRecomendaciones(visitaId);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar la recomendacion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete(recomendacion: VisitaRecomendacion) {
    Alert.alert(
      "Eliminar recomendacion",
      "Se eliminara la recomendacion seleccionada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void handleDelete(recomendacion.id);
          }
        }
      ]
    );
  }

  async function handleDelete(id: string) {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    try {
      await recomendacionesService.remove(id);
      if (editingRecomendacionId === id) {
        resetForm();
      }
      await loadRecomendaciones(visitaId);
      Alert.alert("Recomendacion eliminada", "La recomendacion fue eliminada.");
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo eliminar la recomendacion.");
    }
  }

  async function loadRecomendaciones(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextRecomendaciones = await recomendacionesService.getByVisitaId(id);
      setRecomendaciones(nextRecomendaciones);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener la lista.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRecommendationTypes() {
    setIsLoadingRecommendationTypes(true);
    setRecommendationTypesError(null);

    try {
      const nextRecommendationTypes =
        await recomendacionesService.getRecommendationTypes();
      setRecommendationTypes(nextRecommendationTypes);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setRecommendationTypesError(
        apiError.message || "No se pudo cargar el catalogo."
      );
    } finally {
      setIsLoadingRecommendationTypes(false);
    }
  }
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function validateForm(values: RecomendacionFormValues): RecomendacionFormErrors {
  const nextErrors: RecomendacionFormErrors = {};

  if (!values.recommendationTypeId) {
    nextErrors.recommendationTypeId = "Selecciona un tipo de recomendacion.";
  }

  if (!["true", "false"].includes(values.applies)) {
    nextErrors.applies = "Selecciona si aplica o no.";
  }

  return nextErrors;
}

function buildCreatePayload(values: RecomendacionFormValues) {
  return {
    recommendationTypeId: values.recommendationTypeId,
    applies: values.applies === "true",
    ...(values.detail.trim() ? { detail: values.detail.trim() } : {})
  };
}

function buildUpdatePayload(values: RecomendacionFormValues) {
  return {
    recommendationTypeId: values.recommendationTypeId,
    applies: values.applies === "true",
    detail: values.detail.trim() || null
  };
}

function getSelectedLabel(options: AppSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label;
}

function getRecommendationTypeLabel(
  id: string,
  recommendationTypes: RecommendationTypeCatalogItem[]
) {
  return (
    recommendationTypes.find((recommendationType) => recommendationType.id === id)
      ?.name || `ID ${id}`
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  itemInfo: {
    gap: 4
  },
  itemActions: {
    flexDirection: "row",
    gap: 10
  }
});
