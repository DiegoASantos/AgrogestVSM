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
import type {
  ObservacionSanitariaFormErrors,
  ObservacionSanitariaFormValues
} from "../../types";

type ObservacionSanitariaFormCardProps = {
  values: ObservacionSanitariaFormValues;
  errors: ObservacionSanitariaFormErrors;
  pestDiseaseOptions: AppSelectOption[];
  incidenceLevelOptions: AppSelectOption[];
  selectedPestDiseaseLabel?: string;
  selectedIncidenceLevelLabel?: string;
  activeSelect: "pestDisease" | "incidenceLevel" | null;
  pestDiseasesError: string | null;
  incidenceLevelsError: string | null;
  isLoadingPestDiseases: boolean;
  isLoadingIncidenceLevels: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  submitError: string | null;
  onChange: <K extends keyof ObservacionSanitariaFormValues>(
    field: K,
    value: ObservacionSanitariaFormValues[K]
  ) => void;
  onToggleSelect: (field: "pestDisease" | "incidenceLevel") => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
};

export function ObservacionSanitariaFormCard({
  values,
  errors,
  pestDiseaseOptions,
  incidenceLevelOptions,
  selectedPestDiseaseLabel,
  selectedIncidenceLevelLabel,
  activeSelect,
  pestDiseasesError,
  incidenceLevelsError,
  isLoadingPestDiseases,
  isLoadingIncidenceLevels,
  isSubmitting,
  isEditing,
  submitError,
  onChange,
  onToggleSelect,
  onSubmit,
  onCancelEdit
}: ObservacionSanitariaFormCardProps) {
  return (
    <AppCard style={isEditing ? styles.editingCard : undefined}>
      <AppText variant="heading">
        {isEditing ? "Editar observacion" : "Nueva observacion"}
      </AppText>

      <View style={styles.fields}>
        <AppSelectField
          emptyMessage="No hay plagas o enfermedades disponibles."
          error={errors.pestDiseaseId || pestDiseasesError}
          isLoading={isLoadingPestDiseases}
          isOpen={activeSelect === "pestDisease"}
          label="Plaga o enfermedad"
          onSelect={(value) => onChange("pestDiseaseId", value)}
          onToggle={() => onToggleSelect("pestDisease")}
          options={pestDiseaseOptions}
          placeholder="Selecciona una plaga o enfermedad"
          selectedLabel={selectedPestDiseaseLabel}
        />

        <AppSelectField
          emptyMessage="No hay niveles de incidencia disponibles."
          error={errors.incidenceLevelId || incidenceLevelsError}
          isLoading={isLoadingIncidenceLevels}
          isOpen={activeSelect === "incidenceLevel"}
          label="Nivel de incidencia"
          onSelect={(value) => onChange("incidenceLevelId", value)}
          onToggle={() => onToggleSelect("incidenceLevel")}
          options={incidenceLevelOptions}
          placeholder="Opcional"
          selectedLabel={selectedIncidenceLevelLabel}
        />

        <AppInput
          label="Observacion"
          multiline
          numberOfLines={3}
          onChangeText={(value) => onChange("observation", value)}
          placeholder="Detalle sanitario observado"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={values.observation}
          error={errors.observation}
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
                : "Agregar observacion"
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
