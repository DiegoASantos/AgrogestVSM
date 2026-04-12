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
  ProductoRecomendadoFormErrors,
  ProductoRecomendadoFormValues
} from "../../types";

type ProductoRecomendadoFormCardProps = {
  values: ProductoRecomendadoFormValues;
  errors: ProductoRecomendadoFormErrors;
  productOptions: AppSelectOption[];
  applicationFrequencyOptions: AppSelectOption[];
  selectedProductLabel?: string;
  selectedApplicationFrequencyLabel?: string;
  activeSelect: "product" | "applicationFrequency" | null;
  productsError: string | null;
  applicationFrequenciesError: string | null;
  isLoadingProducts: boolean;
  isLoadingApplicationFrequencies: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  submitError: string | null;
  onChange: <K extends keyof ProductoRecomendadoFormValues>(
    field: K,
    value: ProductoRecomendadoFormValues[K]
  ) => void;
  onToggleSelect: (field: "product" | "applicationFrequency") => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
};

export function ProductoRecomendadoFormCard({
  values,
  errors,
  productOptions,
  applicationFrequencyOptions,
  selectedProductLabel,
  selectedApplicationFrequencyLabel,
  activeSelect,
  productsError,
  applicationFrequenciesError,
  isLoadingProducts,
  isLoadingApplicationFrequencies,
  isSubmitting,
  isEditing,
  submitError,
  onChange,
  onToggleSelect,
  onSubmit,
  onCancelEdit
}: ProductoRecomendadoFormCardProps) {
  return (
    <AppCard style={isEditing ? styles.editingCard : undefined}>
      <AppText variant="heading">
        {isEditing ? "Editar producto" : "Nuevo producto recomendado"}
      </AppText>

      <View style={styles.fields}>
        <AppSelectField
          emptyMessage="No hay productos disponibles."
          error={errors.productId || productsError}
          isLoading={isLoadingProducts}
          isOpen={activeSelect === "product"}
          label="Producto"
          onSelect={(value) => onChange("productId", value)}
          onToggle={() => onToggleSelect("product")}
          options={productOptions}
          placeholder="Selecciona un producto"
          selectedLabel={selectedProductLabel}
        />

        <AppInput
          label="Dosis"
          onChangeText={(value) => onChange("dose", value)}
          placeholder="Ejemplo: 250 ml / 200 L"
          value={values.dose}
          error={errors.dose}
        />

        <AppSelectField
          emptyMessage="No hay frecuencias disponibles."
          error={errors.applicationFrequencyId || applicationFrequenciesError}
          isLoading={isLoadingApplicationFrequencies}
          isOpen={activeSelect === "applicationFrequency"}
          label="Frecuencia de aplicacion"
          onSelect={(value) => onChange("applicationFrequencyId", value)}
          onToggle={() => onToggleSelect("applicationFrequency")}
          options={applicationFrequencyOptions}
          placeholder="Opcional"
          selectedLabel={selectedApplicationFrequencyLabel}
        />

        <AppInput
          label="Instrucciones"
          multiline
          numberOfLines={3}
          onChangeText={(value) => onChange("instructions", value)}
          placeholder="Indicaciones para la aplicacion"
          style={styles.multilineInput}
          textAlignVertical="top"
          value={values.instructions}
          error={errors.instructions}
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
                : "Agregar producto"
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
