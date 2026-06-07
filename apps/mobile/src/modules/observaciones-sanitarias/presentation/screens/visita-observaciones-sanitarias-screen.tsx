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
import { ObservacionSanitariaFormCard } from "../components/observacion-sanitaria-form-card";
import { observacionesSanitariasService } from "../../services";
import type {
  IncidenceLevelCatalogItem,
  ObservacionSanitariaFormErrors,
  ObservacionSanitariaFormValues,
  PestDiseaseCatalogItem,
  VisitaObservacionSanitaria
} from "../../types";

const INITIAL_FORM_VALUES: ObservacionSanitariaFormValues = {
  pestDiseaseId: "",
  incidenceLevelId: "",
  observation: ""
};

export function VisitaObservacionesSanitariasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [observaciones, setObservaciones] = useState<
    VisitaObservacionSanitaria[]
  >([]);
  const [pestDiseases, setPestDiseases] = useState<PestDiseaseCatalogItem[]>([]);
  const [incidenceLevels, setIncidenceLevels] = useState<
    IncidenceLevelCatalogItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPestDiseases, setIsLoadingPestDiseases] = useState(true);
  const [isLoadingIncidenceLevels, setIsLoadingIncidenceLevels] = useState(true);
  const [pestDiseasesError, setPestDiseasesError] = useState<string | null>(null);
  const [incidenceLevelsError, setIncidenceLevelsError] = useState<string | null>(
    null
  );
  const [formValues, setFormValues] =
    useState<ObservacionSanitariaFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<ObservacionSanitariaFormErrors>(
    {}
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingObservacionId, setEditingObservacionId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSelect, setActiveSelect] = useState<
    "pestDisease" | "incidenceLevel" | null
  >(null);

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }

    void Promise.all([
      loadObservaciones(visitaId),
      loadPestDiseases(),
      loadIncidenceLevels()
    ]);
  }, [visitaId]);

  const pestDiseaseOptions = useMemo<AppSelectOption[]>(
    () =>
      pestDiseases
        .filter((pestDisease) => pestDisease.isActive)
        .map((pestDisease) => ({
          value: pestDisease.id,
          label: pestDisease.name,
          helper: [pestDisease.type, pestDisease.scientificName]
            .filter(Boolean)
            .join(" | ")
        })),
    [pestDiseases]
  );

  const incidenceLevelOptions = useMemo<AppSelectOption[]>(
    () =>
      incidenceLevels.map((incidenceLevel) => ({
        value: incidenceLevel.id,
        label: incidenceLevel.name,
        helper: `${formatIncidenceLevelType(incidenceLevel.type)} | Orden ${incidenceLevel.sortOrder}`
      })),
    [incidenceLevels]
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ObservacionSanitariaFormCard
          activeSelect={activeSelect}
          errors={formErrors}
          incidenceLevelOptions={incidenceLevelOptions}
          incidenceLevelsError={incidenceLevelsError}
          isEditing={editingObservacionId !== null}
          isLoadingIncidenceLevels={isLoadingIncidenceLevels}
          isLoadingPestDiseases={isLoadingPestDiseases}
          isSubmitting={isSubmitting}
          onCancelEdit={resetForm}
          onChange={handleFormChange}
          onSubmit={() => {
            void handleSubmit();
          }}
          onToggleSelect={toggleSelect}
          pestDiseaseOptions={pestDiseaseOptions}
          pestDiseasesError={pestDiseasesError}
          selectedIncidenceLevelLabel={getSelectedLabel(
            incidenceLevelOptions,
            formValues.incidenceLevelId
          )}
          selectedPestDiseaseLabel={getSelectedLabel(
            pestDiseaseOptions,
            formValues.pestDiseaseId
          )}
          submitError={submitError}
          values={formValues}
        />

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">
              Cargando observaciones sanitarias...
            </AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error al cargar" subtitle={error} />
            <AppButton
              label="Reintentar"
              onPress={() => {
                if (visitaId) {
                  void loadObservaciones(visitaId);
                }
              }}
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && observaciones.length === 0 ? (
          <AppEmptyState
            title="Sin observaciones"
            message="Agrega la primera observacion sanitaria usando el formulario de arriba."
          />
        ) : null}

        {!isLoading && !error && observaciones.length > 0
          ? observaciones.map((observacion) => (
              <AppCard key={observacion.id} variant="outlined">
                <View style={styles.itemInfo}>
                  <AppText variant="eyebrow">
                    {getPestDiseaseLabel(observacion.pestDiseaseId, pestDiseases)}
                  </AppText>
                  <AppText variant="label">
                    {observacion.observation || "Sin observacion detallada"}
                  </AppText>
                  <AppText variant="caption">
                    {getIncidenceLevelLabel(
                      observacion.incidenceLevelId,
                      incidenceLevels
                    )}
                  </AppText>
                </View>

                <View style={styles.itemActions}>
                  <AppButton
                    label="Editar"
                    onPress={() => startEdit(observacion)}
                    variant="secondary"
                    size="small"
                  />
                  <AppButton
                    label="Eliminar"
                    onPress={() => {
                      confirmDelete(observacion);
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

  function handleFormChange<K extends keyof ObservacionSanitariaFormValues>(
    field: K,
    value: ObservacionSanitariaFormValues[K]
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
    if (field === "pestDiseaseId" || field === "incidenceLevelId") {
      setActiveSelect(null);
    }
  }

  function toggleSelect(field: "pestDisease" | "incidenceLevel") {
    setActiveSelect((currentValue) => (currentValue === field ? null : field));
  }

  function startEdit(observacion: VisitaObservacionSanitaria) {
    setEditingObservacionId(observacion.id);
    setSubmitError(null);
    setFormErrors({});
    setFormValues({
      pestDiseaseId: observacion.pestDiseaseId,
      incidenceLevelId: observacion.incidenceLevelId ?? "",
      observation: observacion.observation ?? ""
    });
    setActiveSelect(null);
  }

  function resetForm() {
    setEditingObservacionId(null);
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
      if (editingObservacionId) {
        await observacionesSanitariasService.update(
          editingObservacionId,
          buildUpdatePayload(formValues)
        );
        Alert.alert("Observacion actualizada", "Los cambios se guardaron.");
      } else {
        await observacionesSanitariasService.create(
          visitaId,
          buildCreatePayload(formValues)
        );
        Alert.alert(
          "Observacion creada",
          "La observacion sanitaria se registro correctamente."
        );
      }

      resetForm();
      await loadObservaciones(visitaId);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar la observacion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete(observacion: VisitaObservacionSanitaria) {
    Alert.alert(
      "Eliminar observacion",
      "Se eliminara la observacion sanitaria seleccionada.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void handleDelete(observacion.id);
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
      await observacionesSanitariasService.remove(id);
      if (editingObservacionId === id) {
        resetForm();
      }
      await loadObservaciones(visitaId);
      Alert.alert("Observacion eliminada", "La observacion fue eliminada.");
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo eliminar la observacion.");
    }
  }

  async function loadObservaciones(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextObservaciones =
        await observacionesSanitariasService.getByVisitaId(id);
      setObservaciones(nextObservaciones);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener la lista.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPestDiseases() {
    setIsLoadingPestDiseases(true);
    setPestDiseasesError(null);

    try {
      const nextPestDiseases = await observacionesSanitariasService.getPestDiseases();
      setPestDiseases(nextPestDiseases);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setPestDiseasesError(apiError.message || "No se pudo cargar el catalogo.");
    } finally {
      setIsLoadingPestDiseases(false);
    }
  }

  async function loadIncidenceLevels() {
    setIsLoadingIncidenceLevels(true);
    setIncidenceLevelsError(null);

    try {
      const nextIncidenceLevels =
        await observacionesSanitariasService.getIncidenceLevels();
      setIncidenceLevels(nextIncidenceLevels);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setIncidenceLevelsError(
        apiError.message || "No se pudo cargar el catalogo."
      );
    } finally {
      setIsLoadingIncidenceLevels(false);
    }
  }
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function validateForm(
  values: ObservacionSanitariaFormValues
): ObservacionSanitariaFormErrors {
  const nextErrors: ObservacionSanitariaFormErrors = {};

  if (!values.pestDiseaseId) {
    nextErrors.pestDiseaseId = "Selecciona una plaga o enfermedad.";
  }

  return nextErrors;
}

function buildCreatePayload(values: ObservacionSanitariaFormValues) {
  return {
    pestDiseaseId: values.pestDiseaseId,
    ...(values.incidenceLevelId.trim()
      ? { incidenceLevelId: values.incidenceLevelId.trim() }
      : {}),
    ...(values.observation.trim()
      ? { observation: values.observation.trim() }
      : {})
  };
}

function buildUpdatePayload(values: ObservacionSanitariaFormValues) {
  return {
    pestDiseaseId: values.pestDiseaseId,
    incidenceLevelId: values.incidenceLevelId.trim() || null,
    observation: values.observation.trim() || null
  };
}

function getSelectedLabel(options: AppSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label;
}

function getPestDiseaseLabel(id: string, pestDiseases: PestDiseaseCatalogItem[]) {
  return pestDiseases.find((pestDisease) => pestDisease.id === id)?.name || `ID ${id}`;
}

function getIncidenceLevelLabel(
  id: string | null,
  incidenceLevels: IncidenceLevelCatalogItem[]
) {
  if (id === null) {
    return "Sin nivel registrado";
  }

  return (
    incidenceLevels.find((incidenceLevel) => incidenceLevel.id === id)?.name ||
    `ID ${id}`
  );
}

function formatIncidenceLevelType(type: IncidenceLevelCatalogItem["type"]) {
  return type === "incidencia" ? "Incidencia" : "Severidad";
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
