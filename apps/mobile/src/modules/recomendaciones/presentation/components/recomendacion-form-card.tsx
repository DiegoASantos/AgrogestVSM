import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppInput,
  AppSelectField,
  AppText,
  type AppSelectOption
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import type { RecomendacionFormErrors, RecomendacionFormValues } from "../../types";

type RecomendacionFormCardProps = {
  values: RecomendacionFormValues;
  errors: RecomendacionFormErrors;
  recommendationTypeOptions: AppSelectOption[];
  applyOptions: AppSelectOption[];
  selectedRecommendationTypeLabel?: string;
  selectedApplyLabel?: string;
  activeSelect: "recommendationType" | "applies" | null;
  recommendationTypesError: string | null;
  isLoadingRecommendationTypes: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  submitError: string | null;
  onChange: <K extends keyof RecomendacionFormValues>(
    field: K,
    value: RecomendacionFormValues[K]
  ) => void;
  onToggleSelect: (field: "recommendationType" | "applies") => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
};

export function RecomendacionFormCard({
  values,
  errors,
  recommendationTypeOptions,
  applyOptions,
  selectedRecommendationTypeLabel,
  selectedApplyLabel,
  activeSelect,
  recommendationTypesError,
  isLoadingRecommendationTypes,
  isSubmitting,
  isEditing,
  submitError,
  onChange,
  onToggleSelect,
  onSubmit,
  onCancelEdit
}: RecomendacionFormCardProps) {
  return (
    <AppCard style={isEditing ? styles.editingCard : undefined}>
      <AppText variant="heading">
        {isEditing ? "Editar recomendacion" : "Nueva recomendacion"}
      </AppText>

      <View style={styles.fields}>
        <AppSelectField
          emptyMessage="No hay tipos de recomendacion disponibles."
          error={errors.recommendationTypeId || recommendationTypesError}
          isLoading={isLoadingRecommendationTypes}
          isOpen={activeSelect === "recommendationType"}
          label="Tipo de recomendacion"
          onSelect={(value) => onChange("recommendationTypeId", value)}
          onToggle={() => onToggleSelect("recommendationType")}
          options={recommendationTypeOptions}
          placeholder="Selecciona un tipo"
          selectedLabel={selectedRecommendationTypeLabel}
        />

        <AppSelectField
          emptyMessage="No hay opciones disponibles."
          error={errors.applies || null}
          isOpen={activeSelect === "applies"}
          label="Aplica"
          onSelect={(value) => onChange("applies", value)}
          onToggle={() => onToggleSelect("applies")}
          options={applyOptions}
          placeholder="Selecciona una opcion"
          selectedLabel={selectedApplyLabel}
        />

        <AppInput
          label="Detalle"
          multiline
          numberOfLines={3}
          onChangeText={(value) => onChange("detail", value)}
          placeholder="Detalle general de la recomendacion"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={values.detail}
          error={errors.detail}
        />
      </View>

      {submitError ? (
        <View style={styles.errorBanner}>
          <AppText style={styles.submitErrorText} variant="caption">
            {submitError}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          disabled={isSubmitting}
          loading={isSubmitting}
          label={
            isSubmitting
              ? "Guardando..."
              : isEditing
                ? "Guardar cambios"
                : "Agregar recomendacion"
          }
          onPress={onSubmit}
        />
        {isEditing ? (
          <AppButton
            disabled={isSubmitting}
            label="Cancelar"
            onPress={onCancelEdit}
            variant="outline"
          />
        ) : null}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  editingCard: {
    borderColor: theme.colors.primaryLight,
    borderWidth: 2
  },
  fields: {
    gap: 14
  },
  multilineInput: {
    minHeight: 90,
    paddingTop: 12
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  submitErrorText: {
    color: theme.colors.error
  },
  actions: {
    gap: 10
  }
});
