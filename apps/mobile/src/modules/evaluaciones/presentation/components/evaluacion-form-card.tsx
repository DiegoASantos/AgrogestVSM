import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppInput,
  AppText
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import type { EvaluacionFormErrors, EvaluacionFormValues } from "../../types";

type EvaluacionFormCardProps = {
  values: EvaluacionFormValues;
  errors: EvaluacionFormErrors;
  isSubmitting: boolean;
  isEditing: boolean;
  submitError: string | null;
  onChange: <K extends keyof EvaluacionFormValues>(
    field: K,
    value: EvaluacionFormValues[K]
  ) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
};

export function EvaluacionFormCard({
  values,
  errors,
  isSubmitting,
  isEditing,
  submitError,
  onChange,
  onSubmit,
  onCancelEdit
}: EvaluacionFormCardProps) {
  return (
    <AppCard style={isEditing ? styles.editingCard : undefined}>
      <AppText variant="heading">
        {isEditing ? "Editar evaluacion" : "Nueva evaluacion"}
      </AppText>

      <View style={styles.fields}>
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <AppInput
              keyboardType="number-pad"
              label="Orden"
              onChangeText={(value) => onChange("order", value)}
              placeholder="Ej. 1"
              value={values.order}
              error={errors.order}
            />
          </View>
          <View style={styles.inlineField}>
            <AppInput
              keyboardType="decimal-pad"
              label="Porcentaje"
              onChangeText={(value) => onChange("percentage", value)}
              placeholder="Ej. 65.5"
              value={values.percentage}
              error={errors.percentage}
            />
          </View>
        </View>

        <AppInput
          label="Descripcion"
          multiline
          numberOfLines={3}
          onChangeText={(value) => onChange("description", value)}
          placeholder="Describe la evaluacion realizada"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={values.description}
          error={errors.description}
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
                : "Agregar evaluacion"
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
  inlineFields: {
    flexDirection: "row",
    gap: 12
  },
  inlineField: {
    flex: 1
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
