import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import {
  AppMap,
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { captureCurrentDeviceLocation } from "../../../../shared/location/device-location";
import type { GeoJsonPointGeometry } from "../../../../shared/maps/geo";
import { toApiError } from "../../../../shared/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { visitaCampoCatalogsService, visitasCampoService } from "../../services";
import type {
  CreateVisitaCampoDraft,
  NewVisitaCampoFormErrors,
  NewVisitaCampoFormValues
} from "../../types";
import type {
  CampaniaCatalogItem,
  CatalogSelectOption,
  CultivoCatalogItem,
  EtapaFenologicaCatalogItem,
  VariedadCatalogItem
} from "../../types";

export function NewVisitaCampoScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const params = useLocalSearchParams<{
    id?: string | string[];
    parcelaCode?: string | string[];
    parcelaName?: string | string[];
  }>();

  const parcelaId = toSingleParam(params.id);
  const parcelaCode = toSingleParam(params.parcelaCode);
  const parcelaName = toSingleParam(params.parcelaName);
  const parcelaLabel = [parcelaCode, parcelaName].filter(Boolean).join(" - ");
  const [activeCatalog, setActiveCatalog] = useState<
    "crop" | "variety" | "campaign" | "phenologicalStage" | null
  >(null);

  const [cultivos, setCultivos] = useState<CultivoCatalogItem[]>([]);
  const [isLoadingCultivos, setIsLoadingCultivos] = useState(true);
  const [cultivosError, setCultivosError] = useState<string | null>(null);

  const [variedades, setVariedades] = useState<VariedadCatalogItem[]>([]);
  const [isLoadingVariedades, setIsLoadingVariedades] = useState(false);
  const [variedadesError, setVariedadesError] = useState<string | null>(null);

  const [campanias, setCampanias] = useState<CampaniaCatalogItem[]>([]);
  const [isLoadingCampanias, setIsLoadingCampanias] = useState(false);
  const [campaniasError, setCampaniasError] = useState<string | null>(null);

  const [etapasFenologicas, setEtapasFenologicas] = useState<
    EtapaFenologicaCatalogItem[]
  >([]);
  const [isLoadingEtapasFenologicas, setIsLoadingEtapasFenologicas] = useState(false);
  const [etapasFenologicasError, setEtapasFenologicasError] = useState<string | null>(
    null
  );

  const [values, setValues] = useState<NewVisitaCampoFormValues>({
    crop: "",
    variety: "",
    parcelaId: parcelaId ?? "",
    parcelaLabel: parcelaLabel || parcelaId || "",
    campaign: "",
    plantsCount: "",
    sowingDate: "",
    visitDate: "",
    startVisitTime: "",
    endVisitTime: "",
    phenologicalStage: "",
    generalObservation: ""
  });
  const [errors, setErrors] = useState<NewVisitaCampoFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visitLocation, setVisitLocation] = useState<GeoJsonPointGeometry | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  useEffect(() => {
    void loadCultivos();
  }, []);

  useEffect(() => {
    if (!values.crop) {
      setVariedades([]);
      setCampanias([]);
      setEtapasFenologicas([]);
      setVariedadesError(null);
      setCampaniasError(null);
      setEtapasFenologicasError(null);
      return;
    }

    void loadDependentCatalogs(values.crop);
  }, [values.crop]);

  const cultivoOptions = useMemo(
    () =>
      cultivos.map((cultivo) => ({
        value: cultivo.id,
        label: cultivo.name,
        helper: cultivo.code
      })),
    [cultivos]
  );

  const variedadOptions = useMemo(
    () =>
      variedades.map((variedad) => ({
        value: variedad.id,
        label: variedad.name,
        helper: variedad.code
      })),
    [variedades]
  );

  const campaniaOptions = useMemo(
    () =>
      campanias.map((campania) => ({
        value: campania.id,
        label: campania.name,
        helper: campania.description || undefined
      })),
    [campanias]
  );

  const etapaFenologicaOptions = useMemo(
    () =>
      etapasFenologicas.map((etapa) => ({
        value: etapa.id,
        label: etapa.name,
        helper: etapa.description || undefined
      })),
    [etapasFenologicas]
  );

  const locationPoints = useMemo(() => {
    if (!visitLocation) {
      return [];
    }

    return [
      {
        id: "new-visita-location",
        geometry: visitLocation,
        title: "Ubicacion de la visita",
        description: buildLocationPreview(visitLocation, locationMessage),
        pinColor: "#c77700"
      }
    ];
  }, [locationMessage, visitLocation]);

  if (!session.accessToken) {
    return (
      <ScreenContainer contentStyle={styles.container}>
        <StatusBar style="light" />
        <View style={styles.scrollContent}>
          <AppHeader
            eyebrow="Nueva visita"
            title="Registrar visita"
            subtitle="Necesitas iniciar sesion para registrar una visita de campo."
          />
          <AppCard>
            <AppText variant="muted">
              La visita necesita asociarse al usuario autenticado antes de guardarse
              localmente.
            </AppText>
            <View style={styles.actions}>
              <AppButton
                label="Iniciar sesion"
                onPress={() => router.replace("/login")}
              />
              <AppButton
                label="Volver"
                onPress={() => router.back()}
                variant="outline"
              />
            </View>
          </AppCard>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow="Nueva visita"
          title="Registrar visita"
          subtitle={
            parcelaLabel
              ? `Parcela: ${parcelaLabel}`
              : "Completa los datos de la visita de campo."
          }
        />

        <AppCard>
          <AppText variant="heading">Cultivo y campania</AppText>

          <View style={styles.fields}>
            <AppSelectField
              disabled={isLoadingCultivos}
              emptyMessage="No hay cultivos disponibles."
              error={getCatalogError(cultivosError, errors.crop)}
              isLoading={isLoadingCultivos}
              isOpen={activeCatalog === "crop"}
              label="Cultivo"
              onSelect={(value) => handleCatalogSelection("crop", value)}
              onToggle={() => toggleCatalog("crop")}
              options={cultivoOptions}
              placeholder="Selecciona un cultivo"
              selectedLabel={getSelectedLabel(cultivoOptions, values.crop)}
            />
            <AppSelectField
              disabled={!values.crop}
              emptyMessage="No hay variedades para el cultivo seleccionado."
              error={getCatalogError(variedadesError, errors.variety)}
              isLoading={isLoadingVariedades}
              isOpen={activeCatalog === "variety"}
              label="Variedad"
              onSelect={(value) => handleCatalogSelection("variety", value)}
              onToggle={() => toggleCatalog("variety")}
              options={variedadOptions}
              placeholder={
                values.crop ? "Selecciona una variedad" : "Selecciona primero un cultivo"
              }
              selectedLabel={getSelectedLabel(variedadOptions, values.variety)}
            />
            <AppSelectField
              disabled={!values.crop}
              emptyMessage="No hay campanias activas para el cultivo seleccionado."
              error={getCatalogError(campaniasError, errors.campaign)}
              isLoading={isLoadingCampanias}
              isOpen={activeCatalog === "campaign"}
              label="Campania"
              onSelect={(value) => handleCatalogSelection("campaign", value)}
              onToggle={() => toggleCatalog("campaign")}
              options={campaniaOptions}
              placeholder={
                values.crop ? "Selecciona una campania" : "Selecciona primero un cultivo"
              }
              selectedLabel={getSelectedLabel(campaniaOptions, values.campaign)}
            />
            <AppSelectField
              disabled={!values.crop}
              emptyMessage="No hay etapas fenologicas disponibles."
              error={etapasFenologicasError}
              isLoading={isLoadingEtapasFenologicas}
              isOpen={activeCatalog === "phenologicalStage"}
              label="Etapa fenologica"
              onSelect={(value) => handleCatalogSelection("phenologicalStage", value)}
              onToggle={() => toggleCatalog("phenologicalStage")}
              options={etapaFenologicaOptions}
              placeholder={
                values.crop
                  ? "Selecciona una etapa fenologica"
                  : "Selecciona primero un cultivo"
              }
              selectedLabel={getSelectedLabel(
                etapaFenologicaOptions,
                values.phenologicalStage
              )}
            />
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="heading">Datos de la visita</AppText>

          <View style={styles.fields}>
            <AppInput
              keyboardType="number-pad"
              label="Numero de plantas"
              onChangeText={(value) => updateField("plantsCount", value)}
              placeholder="Ej. 120"
              value={values.plantsCount}
              error={errors.plantsCount}
            />
            <AppInput
              label="Fecha de siembra"
              onChangeText={(value) => updateField("sowingDate", value)}
              placeholder="AAAA-MM-DD"
              value={values.sowingDate}
              error={errors.sowingDate}
            />
            <AppInput
              label="Fecha de visita"
              onChangeText={(value) => updateField("visitDate", value)}
              placeholder="AAAA-MM-DD"
              value={values.visitDate}
              error={errors.visitDate}
            />
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <AppInput
                  label="Hora inicio"
                  onChangeText={(value) => updateField("startVisitTime", value)}
                  placeholder="08:30"
                  value={values.startVisitTime}
                  error={errors.startVisitTime}
                />
              </View>
              <View style={styles.timeField}>
                <AppInput
                  label="Hora fin"
                  onChangeText={(value) => updateField("endVisitTime", value)}
                  placeholder="09:15"
                  value={values.endVisitTime}
                  error={errors.endVisitTime}
                />
              </View>
            </View>
            <AppInput
              editable={false}
              label="Parcela"
              value={values.parcelaLabel || "Sin parcela seleccionada"}
              error={errors.parcelaId}
            />
            <AppInput
              label="Observacion general"
              multiline
              numberOfLines={4}
              onChangeText={(value) => updateField("generalObservation", value)}
              placeholder="Observaciones generales de la visita"
              style={styles.multilineInput}
              textAlignVertical="top"
              value={values.generalObservation}
            />
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="heading">Ubicacion de la visita</AppText>
          <AppText variant="muted">
            Opcional. Usa la ubicacion actual del dispositivo para registrar el punto de
            la visita.
          </AppText>

          <View style={styles.locationActions}>
            <AppButton
              disabled={isSubmitting}
              label={
                isCapturingLocation
                  ? "Capturando..."
                  : visitLocation
                    ? "Actualizar ubicacion"
                    : "Usar ubicacion actual"
              }
              loading={isCapturingLocation}
              onPress={() => {
                void handleCaptureLocation();
              }}
              size="small"
              variant="secondary"
            />
            {visitLocation ? (
              <AppButton
                disabled={isSubmitting || isCapturingLocation}
                label="Quitar ubicacion"
                onPress={handleClearLocation}
                size="small"
                variant="outline"
              />
            ) : null}
          </View>

          {locationError ? (
            <AppText style={styles.locationErrorText} variant="caption">
              {locationError}
            </AppText>
          ) : null}

          {locationMessage ? (
            <AppText variant="caption">{locationMessage}</AppText>
          ) : null}

          <AppMap
            emptyMessage="Todavia no registraste la ubicacion de la visita."
            minHeight={220}
            points={locationPoints}
          />
        </AppCard>

        {submitError ? (
          <View style={styles.errorBanner}>
            <AppText style={styles.submitErrorText} variant="label">
              {submitError}
            </AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            disabled={isSubmitting}
            loading={isSubmitting}
            label={isSubmitting ? "Guardando..." : "Guardar visita"}
            onPress={() => {
              void handleSubmit();
            }}
          />
          <AppButton
            label="Cancelar"
            onPress={() => router.back()}
            disabled={isSubmitting}
            variant="outline"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function updateField<K extends keyof NewVisitaCampoFormValues>(
    field: K,
    value: NewVisitaCampoFormValues[K]
  ) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined
    }));
    setSubmitError(null);
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value
    }));
  }

  function toggleCatalog(field: "crop" | "variety" | "campaign" | "phenologicalStage") {
    setActiveCatalog((currentField) => (currentField === field ? null : field));
  }

  function handleCatalogSelection(
    field: "crop" | "variety" | "campaign" | "phenologicalStage",
    value: string
  ) {
    if (field === "crop") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        crop: undefined,
        variety: undefined,
        campaign: undefined
      }));
      setValues((currentValues) => ({
        ...currentValues,
        crop: value,
        variety: "",
        campaign: "",
        phenologicalStage: ""
      }));
    } else {
      updateField(field, value);
    }

    setActiveCatalog(null);
  }

  async function handleSubmit() {
    const nextErrors = validateForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("Revisa los campos obligatorios antes de guardar.");
      return;
    }

    if (!session.accessToken) {
      setSubmitError("Tu sesion ya no es valida. Vuelve a iniciar sesion.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createdVisita = await visitasCampoService.create(
        buildCreateDraft(values, visitLocation),
        {
          accessToken: session.accessToken,
          tokenType: session.tokenType
        }
      );

      Alert.alert(
        "Visita guardada",
        `La visita ${createdVisita.publicId} se guardo localmente.`,
        [
          {
            text: "Ver detalle",
            onPress: () => {
              router.replace({
                pathname: "/visitas-campo/[id]",
                params: {
                  id: createdVisita.id
                }
              });
            }
          }
        ]
      );
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError.message || "No se pudo guardar la visita de campo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCaptureLocation() {
    setIsCapturingLocation(true);
    setLocationError(null);

    try {
      const capturedLocation = await captureCurrentDeviceLocation();
      setVisitLocation(capturedLocation.point);
      setLocationMessage(buildLocationMessage(capturedLocation));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo obtener la ubicacion actual.";
      setLocationError(message);
    } finally {
      setIsCapturingLocation(false);
    }
  }

  function handleClearLocation() {
    setVisitLocation(null);
    setLocationError(null);
    setLocationMessage(null);
  }

  async function loadCultivos() {
    setIsLoadingCultivos(true);
    setCultivosError(null);

    try {
      const nextCultivos = await visitaCampoCatalogsService.getCultivos();
      setCultivos(nextCultivos);
    } catch (error) {
      const apiError = toApiError(error);
      setCultivosError(apiError.message || "No se pudo cargar cultivos.");
    } finally {
      setIsLoadingCultivos(false);
    }
  }

  async function loadDependentCatalogs(cultivoId: string) {
    setIsLoadingVariedades(true);
    setIsLoadingCampanias(true);
    setIsLoadingEtapasFenologicas(true);
    setVariedadesError(null);
    setCampaniasError(null);
    setEtapasFenologicasError(null);

    const [variedadesResult, campaniasResult, etapasResult] = await Promise.allSettled([
      visitaCampoCatalogsService.getVariedadesByCultivo(cultivoId),
      visitaCampoCatalogsService.getCampaniasByCultivo(cultivoId),
      visitaCampoCatalogsService.getEtapasFenologicasByCultivo(cultivoId)
    ]);

    if (variedadesResult.status === "fulfilled") {
      setVariedades(variedadesResult.value);
    } else {
      setVariedades([]);
      setVariedadesError(
        toApiError(variedadesResult.reason).message || "No se pudo cargar variedades."
      );
    }

    if (campaniasResult.status === "fulfilled") {
      setCampanias(campaniasResult.value);
    } else {
      setCampanias([]);
      setCampaniasError(
        toApiError(campaniasResult.reason).message || "No se pudo cargar campanias."
      );
    }

    if (etapasResult.status === "fulfilled") {
      setEtapasFenologicas(etapasResult.value);
    } else {
      setEtapasFenologicas([]);
      setEtapasFenologicasError(
        toApiError(etapasResult.reason).message || "No se pudo cargar etapas fenologicas."
      );
    }

    setIsLoadingVariedades(false);
    setIsLoadingCampanias(false);
    setIsLoadingEtapasFenologicas(false);
  }
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSelectedLabel(options: CatalogSelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label;
}

function getCatalogError(loadError: string | null, validationError?: string) {
  return validationError || loadError;
}

function validateForm(values: NewVisitaCampoFormValues): NewVisitaCampoFormErrors {
  const nextErrors: NewVisitaCampoFormErrors = {};

  if (!values.crop) {
    nextErrors.crop = "Selecciona un cultivo.";
  }

  if (!values.variety) {
    nextErrors.variety = "Selecciona una variedad.";
  }

  if (!values.campaign) {
    nextErrors.campaign = "Selecciona una campania.";
  }

  if (!values.parcelaId) {
    nextErrors.parcelaId = "No se encontro una parcela valida.";
  }

  if (values.plantsCount.trim().length > 0) {
    const plantsCount = Number(values.plantsCount);

    if (!Number.isInteger(plantsCount) || plantsCount < 0) {
      nextErrors.plantsCount =
        "Numero de plantas debe ser un entero mayor o igual a cero.";
    }
  }

  if (values.sowingDate && !DATE_PATTERN.test(values.sowingDate.trim())) {
    nextErrors.sowingDate = "Fecha de siembra debe tener formato AAAA-MM-DD.";
  }

  if (!values.visitDate.trim()) {
    nextErrors.visitDate = "La fecha de visita es obligatoria.";
  } else if (!DATE_PATTERN.test(values.visitDate.trim())) {
    nextErrors.visitDate = "Fecha de visita debe tener formato AAAA-MM-DD.";
  }

  if (!values.startVisitTime.trim()) {
    nextErrors.startVisitTime = "La hora de inicio es obligatoria.";
  } else if (!TIME_PATTERN.test(values.startVisitTime.trim())) {
    nextErrors.startVisitTime = "Hora de inicio debe tener formato HH:mm o HH:mm:ss.";
  }

  if (values.endVisitTime.trim()) {
    if (!TIME_PATTERN.test(values.endVisitTime.trim())) {
      nextErrors.endVisitTime = "Hora de fin debe tener formato HH:mm o HH:mm:ss.";
    } else if (
      normalizeTimeForApi(values.endVisitTime) <
      normalizeTimeForApi(values.startVisitTime)
    ) {
      nextErrors.endVisitTime = "Hora de fin debe ser mayor o igual a la hora de inicio.";
    }
  }

  return nextErrors;
}

function buildCreateDraft(
  values: NewVisitaCampoFormValues,
  visitLocation: GeoJsonPointGeometry | null
): CreateVisitaCampoDraft {
  return {
    cropId: values.crop,
    varietyId: values.variety,
    parcelaId: values.parcelaId,
    campaignId: values.campaign,
    ...(visitLocation ? { visitLocation } : {}),
    ...(values.plantsCount.trim()
      ? { plantsCount: Number(values.plantsCount.trim()) }
      : {}),
    ...(values.sowingDate.trim() ? { sowingDate: values.sowingDate.trim() } : {}),
    visitDate: values.visitDate.trim(),
    startVisitTime: normalizeTimeForApi(values.startVisitTime),
    ...(values.endVisitTime.trim()
      ? { endVisitTime: normalizeTimeForApi(values.endVisitTime) }
      : {}),
    ...(values.phenologicalStage
      ? { phenologicalStageId: values.phenologicalStage }
      : {}),
    ...(values.generalObservation.trim()
      ? { generalObservation: values.generalObservation.trim() }
      : {})
  };
}

function normalizeTimeForApi(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.length === 5 ? `${trimmedValue}:00` : trimmedValue;
}

function buildLocationMessage(location: {
  accuracyMeters: number | null;
  point: GeoJsonPointGeometry;
}) {
  const coordinates = formatCoordinates(location.point);

  if (location.accuracyMeters === null) {
    return `Ubicacion capturada: ${coordinates}.`;
  }

  return `Ubicacion capturada: ${coordinates}. Precision aprox. ${location.accuracyMeters} m.`;
}

function buildLocationPreview(point: GeoJsonPointGeometry, message: string | null) {
  return message ?? `Coordenadas ${formatCoordinates(point)}.`;
}

function formatCoordinates(point: GeoJsonPointGeometry) {
  const [longitude, latitude] = point.coordinates;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  fields: {
    gap: 14
  },
  timeRow: {
    flexDirection: "row",
    gap: 12
  },
  timeField: {
    flex: 1
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  submitErrorText: {
    color: theme.colors.error
  },
  locationActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  locationErrorText: {
    color: theme.colors.error
  },
  actions: {
    gap: 10,
    paddingBottom: 12
  }
});
