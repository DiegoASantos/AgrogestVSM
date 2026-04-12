import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { toApiError } from "../../../../shared/services";
import { EvaluacionFormCard } from "../components/evaluacion-form-card";
import { evaluacionesService } from "../../services";
import type {
  EvaluacionFormErrors,
  EvaluacionFormValues,
  VisitaEvaluacion
} from "../../types";

const INITIAL_FORM_VALUES: EvaluacionFormValues = {
  order: "",
  percentage: "",
  description: ""
};

export function VisitaEvaluacionesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [evaluaciones, setEvaluaciones] = useState<VisitaEvaluacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] =
    useState<EvaluacionFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<EvaluacionFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingEvaluacionId, setEditingEvaluacionId] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }

    void loadEvaluaciones(visitaId);
  }, [visitaId]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <EvaluacionFormCard
          errors={formErrors}
          isEditing={editingEvaluacionId !== null}
          isSubmitting={isSubmitting}
          onCancelEdit={resetForm}
          onChange={handleFormChange}
          onSubmit={() => {
            void handleSubmit();
          }}
          submitError={submitError}
          values={formValues}
        />

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando evaluaciones...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error al cargar" subtitle={error} />
            <AppButton
              label="Reintentar"
              onPress={() => {
                if (visitaId) {
                  void loadEvaluaciones(visitaId);
                }
              }}
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && evaluaciones.length === 0 ? (
          <AppEmptyState
            title="Sin evaluaciones"
            message="Agrega la primera evaluacion usando el formulario de arriba."
          />
        ) : null}

        {!isLoading && !error && evaluaciones.length > 0
          ? evaluaciones.map((evaluacion) => (
              <AppCard key={evaluacion.id} variant="outlined">
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <AppText variant="eyebrow">
                      Orden {evaluacion.order}
                    </AppText>
                    <AppText variant="label">{evaluacion.description}</AppText>
                    <AppText variant="caption">
                      {formatPercentage(evaluacion.percentage)}
                    </AppText>
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <AppButton
                    label="Editar"
                    onPress={() => startEdit(evaluacion)}
                    variant="secondary"
                    size="small"
                  />
                  <AppButton
                    label="Eliminar"
                    onPress={() => {
                      confirmDelete(evaluacion);
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

  function handleFormChange<K extends keyof EvaluacionFormValues>(
    field: K,
    value: EvaluacionFormValues[K]
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
  }

  function startEdit(evaluacion: VisitaEvaluacion) {
    setEditingEvaluacionId(evaluacion.id);
    setSubmitError(null);
    setFormErrors({});
    setFormValues({
      order: String(evaluacion.order),
      percentage: evaluacion.percentage ?? "",
      description: evaluacion.description
    });
  }

  function resetForm() {
    setEditingEvaluacionId(null);
    setFormValues(INITIAL_FORM_VALUES);
    setFormErrors({});
    setSubmitError(null);
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
      if (editingEvaluacionId) {
        await evaluacionesService.update(
          editingEvaluacionId,
          buildUpdatePayload(formValues)
        );
        Alert.alert("Evaluacion actualizada", "Los cambios se guardaron.");
      } else {
        await evaluacionesService.create(visitaId, buildCreatePayload(formValues));
        Alert.alert("Evaluacion creada", "La evaluacion se registro correctamente.");
      }

      resetForm();
      await loadEvaluaciones(visitaId);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar la evaluacion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete(evaluacion: VisitaEvaluacion) {
    Alert.alert(
      "Eliminar evaluacion",
      `Se eliminara la evaluacion de orden ${evaluacion.order}.`,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void handleDelete(evaluacion.id);
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
      await evaluacionesService.remove(id);
      if (editingEvaluacionId === id) {
        resetForm();
      }
      await loadEvaluaciones(visitaId);
      Alert.alert("Evaluacion eliminada", "La evaluacion fue eliminada.");
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo eliminar la evaluacion.");
    }
  }

  async function loadEvaluaciones(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextEvaluaciones = await evaluacionesService.getByVisitaId(id);
      setEvaluaciones(nextEvaluaciones);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener la lista.");
    } finally {
      setIsLoading(false);
    }
  }
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function validateForm(values: EvaluacionFormValues): EvaluacionFormErrors {
  const nextErrors: EvaluacionFormErrors = {};

  if (!values.order.trim()) {
    nextErrors.order = "El orden es obligatorio.";
  } else {
    const parsedOrder = Number(values.order.trim());

    if (!Number.isInteger(parsedOrder) || parsedOrder < 1) {
      nextErrors.order = "El orden debe ser un entero mayor o igual a 1.";
    }
  }

  if (values.percentage.trim()) {
    const parsedPercentage = Number(values.percentage.trim());

    if (!Number.isFinite(parsedPercentage)) {
      nextErrors.percentage = "El porcentaje debe ser numerico.";
    } else if (parsedPercentage < 0 || parsedPercentage > 100) {
      nextErrors.percentage = "El porcentaje debe estar entre 0 y 100.";
    }
  }

  if (!values.description.trim()) {
    nextErrors.description = "La descripcion es obligatoria.";
  }

  return nextErrors;
}

function buildCreatePayload(values: EvaluacionFormValues) {
  return {
    order: Number(values.order.trim()),
    ...(values.percentage.trim()
      ? { percentage: Number(values.percentage.trim()) }
      : {}),
    description: values.description.trim()
  };
}

function buildUpdatePayload(values: EvaluacionFormValues) {
  return {
    order: Number(values.order.trim()),
    percentage: values.percentage.trim()
      ? Number(values.percentage.trim())
      : null,
    description: values.description.trim()
  };
}

function formatPercentage(value: string | null) {
  if (!value) {
    return "Sin porcentaje";
  }

  return `${value}%`;
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
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  itemInfo: {
    flex: 1,
    gap: 4
  },
  itemActions: {
    flexDirection: "row",
    gap: 10
  }
});
