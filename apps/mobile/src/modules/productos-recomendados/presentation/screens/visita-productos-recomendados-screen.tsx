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
import { ProductoRecomendadoFormCard } from "../components/producto-recomendado-form-card";
import { productosRecomendadosService } from "../../services";
import type {
  ApplicationFrequencyCatalogItem,
  ProductCatalogItem,
  ProductoRecomendadoFormErrors,
  ProductoRecomendadoFormValues,
  VisitaProductoRecomendado
} from "../../types";

const INITIAL_FORM_VALUES: ProductoRecomendadoFormValues = {
  productId: "",
  dose: "",
  applicationFrequencyId: "",
  instructions: ""
};

export function VisitaProductosRecomendadosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [productosRecomendados, setProductosRecomendados] = useState<
    VisitaProductoRecomendado[]
  >([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [applicationFrequencies, setApplicationFrequencies] = useState<
    ApplicationFrequencyCatalogItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingApplicationFrequencies, setIsLoadingApplicationFrequencies] =
    useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [applicationFrequenciesError, setApplicationFrequenciesError] =
    useState<string | null>(null);
  const [formValues, setFormValues] =
    useState<ProductoRecomendadoFormValues>(INITIAL_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<ProductoRecomendadoFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingProductoId, setEditingProductoId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSelect, setActiveSelect] = useState<
    "product" | "applicationFrequency" | null
  >(null);

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }

    void Promise.all([
      loadProductosRecomendados(visitaId),
      loadProducts(),
      loadApplicationFrequencies()
    ]);
  }, [visitaId]);

  const productOptions = useMemo<AppSelectOption[]>(
    () =>
      products
        .filter((product) => product.isActive)
        .map((product) => ({
          value: product.id,
          label: product.name
        })),
    [products]
  );

  const applicationFrequencyOptions = useMemo<AppSelectOption[]>(
    () =>
      [
        {
          value: "",
          label: "Sin frecuencia",
          helper: "Dejar este campo vacio"
        },
        ...applicationFrequencies
          .filter((applicationFrequency) => applicationFrequency.isActive)
          .map((applicationFrequency) => ({
            value: applicationFrequency.id,
            label: applicationFrequency.name,
            helper:
              applicationFrequency.intervalDays === null
                ? undefined
                : `Cada ${applicationFrequency.intervalDays} dias`
          }))
      ],
    [applicationFrequencies]
  );

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProductoRecomendadoFormCard
          activeSelect={activeSelect}
          applicationFrequenciesError={applicationFrequenciesError}
          applicationFrequencyOptions={applicationFrequencyOptions}
          errors={formErrors}
          isEditing={editingProductoId !== null}
          isLoadingApplicationFrequencies={isLoadingApplicationFrequencies}
          isLoadingProducts={isLoadingProducts}
          isSubmitting={isSubmitting}
          onCancelEdit={resetForm}
          onChange={handleFormChange}
          onSubmit={() => {
            void handleSubmit();
          }}
          onToggleSelect={toggleSelect}
          productOptions={productOptions}
          productsError={productsError}
          selectedApplicationFrequencyLabel={getSelectedLabel(
            applicationFrequencyOptions,
            formValues.applicationFrequencyId
          )}
          selectedProductLabel={getSelectedLabel(
            productOptions,
            formValues.productId
          )}
          submitError={submitError}
          values={formValues}
        />

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando productos recomendados...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error al cargar" subtitle={error} />
            <AppButton
              label="Reintentar"
              onPress={() => {
                if (visitaId) {
                  void loadProductosRecomendados(visitaId);
                }
              }}
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && productosRecomendados.length === 0 ? (
          <AppEmptyState
            title="Sin productos"
            message="Agrega el primer producto recomendado usando el formulario de arriba."
          />
        ) : null}

        {!isLoading && !error && productosRecomendados.length > 0
          ? productosRecomendados.map((productoRecomendado) => (
              <AppCard key={productoRecomendado.id} variant="outlined">
                <View style={styles.itemInfo}>
                  <AppText variant="eyebrow">
                    {getProductLabel(productoRecomendado.productId, products)}
                  </AppText>
                  <AppText variant="label">
                    Dosis: {productoRecomendado.dose}
                  </AppText>
                  <AppText variant="caption">
                    {getApplicationFrequencyLabel(
                      productoRecomendado.applicationFrequencyId,
                      applicationFrequencies
                    )}
                  </AppText>
                  {productoRecomendado.instructions ? (
                    <AppText variant="caption">
                      {productoRecomendado.instructions}
                    </AppText>
                  ) : null}
                </View>

                <View style={styles.itemActions}>
                  <AppButton
                    label="Editar"
                    onPress={() => startEdit(productoRecomendado)}
                    variant="secondary"
                    size="small"
                  />
                  <AppButton
                    label="Eliminar"
                    onPress={() => {
                      confirmDelete(productoRecomendado);
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

  function handleFormChange<K extends keyof ProductoRecomendadoFormValues>(
    field: K,
    value: ProductoRecomendadoFormValues[K]
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
    if (field === "productId" || field === "applicationFrequencyId") {
      setActiveSelect(null);
    }
  }

  function toggleSelect(field: "product" | "applicationFrequency") {
    setActiveSelect((currentValue) => (currentValue === field ? null : field));
  }

  function startEdit(productoRecomendado: VisitaProductoRecomendado) {
    setEditingProductoId(productoRecomendado.id);
    setSubmitError(null);
    setFormErrors({});
    setFormValues({
      productId: productoRecomendado.productId,
      dose: productoRecomendado.dose,
      applicationFrequencyId: productoRecomendado.applicationFrequencyId ?? "",
      instructions: productoRecomendado.instructions ?? ""
    });
    setActiveSelect(null);
  }

  function resetForm() {
    setEditingProductoId(null);
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
      if (editingProductoId) {
        await productosRecomendadosService.update(
          editingProductoId,
          buildUpdatePayload(formValues)
        );
        Alert.alert(
          "Producto actualizado",
          "Los cambios se guardaron correctamente."
        );
      } else {
        await productosRecomendadosService.create(
          visitaId,
          buildCreatePayload(formValues)
        );
        Alert.alert(
          "Producto registrado",
          "El producto recomendado se registro correctamente."
        );
      }

      resetForm();
      await loadProductosRecomendados(visitaId);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(
        apiError.message || "No se pudo guardar el producto recomendado."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function confirmDelete(productoRecomendado: VisitaProductoRecomendado) {
    Alert.alert(
      "Eliminar producto recomendado",
      "Se eliminara el producto recomendado seleccionado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void handleDelete(productoRecomendado.id);
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
      await productosRecomendadosService.remove(id);
      if (editingProductoId === id) {
        resetForm();
      }
      await loadProductosRecomendados(visitaId);
      Alert.alert(
        "Producto eliminado",
        "El producto recomendado fue eliminado."
      );
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(
        apiError.message || "No se pudo eliminar el producto recomendado."
      );
    }
  }

  async function loadProductosRecomendados(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextProductosRecomendados =
        await productosRecomendadosService.getByVisitaId(id);
      setProductosRecomendados(nextProductosRecomendados);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener la lista.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadProducts() {
    setIsLoadingProducts(true);
    setProductsError(null);

    try {
      const nextProducts = await productosRecomendadosService.getProducts();
      setProducts(nextProducts);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setProductsError(apiError.message || "No se pudo cargar el catalogo.");
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function loadApplicationFrequencies() {
    setIsLoadingApplicationFrequencies(true);
    setApplicationFrequenciesError(null);

    try {
      const nextApplicationFrequencies =
        await productosRecomendadosService.getApplicationFrequencies();
      setApplicationFrequencies(nextApplicationFrequencies);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setApplicationFrequenciesError(
        apiError.message || "No se pudo cargar el catalogo."
      );
    } finally {
      setIsLoadingApplicationFrequencies(false);
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
  values: ProductoRecomendadoFormValues
): ProductoRecomendadoFormErrors {
  const nextErrors: ProductoRecomendadoFormErrors = {};

  if (!values.productId) {
    nextErrors.productId = "Selecciona un producto.";
  }

  if (!values.dose.trim()) {
    nextErrors.dose = "La dosis es obligatoria.";
  }

  return nextErrors;
}

function buildCreatePayload(values: ProductoRecomendadoFormValues) {
  return {
    productId: values.productId,
    dose: values.dose.trim(),
    ...(values.applicationFrequencyId
      ? { applicationFrequencyId: values.applicationFrequencyId }
      : {}),
    ...(values.instructions.trim()
      ? { instructions: values.instructions.trim() }
      : {})
  };
}

function buildUpdatePayload(values: ProductoRecomendadoFormValues) {
  return {
    productId: values.productId,
    dose: values.dose.trim(),
    applicationFrequencyId: values.applicationFrequencyId || null,
    instructions: values.instructions.trim() || null
  };
}

function getSelectedLabel(options: AppSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label;
}

function getProductLabel(id: string, products: ProductCatalogItem[]) {
  return products.find((product) => product.id === id)?.name || `ID ${id}`;
}

function getApplicationFrequencyLabel(
  id: string | null,
  applicationFrequencies: ApplicationFrequencyCatalogItem[]
) {
  if (!id) {
    return "Sin frecuencia";
  }

  return (
    applicationFrequencies.find(
      (applicationFrequency) => applicationFrequency.id === id
    )?.name || `ID ${id}`
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
