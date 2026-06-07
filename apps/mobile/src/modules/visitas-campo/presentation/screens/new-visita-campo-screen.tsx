import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type LayoutChangeEvent,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
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
  SubEtapaCatalogItem,
  VariedadCatalogItem
} from "../../types";
import { getSubEtapaImageSource } from "../../utils/sub-etapa-images";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

type ActiveVisitaField =
  | "crop"
  | "variety"
  | "phenologicalStage"
  | "sowingDate";

type WizardStep = {
  index: number;
  title: string;
  routeLabel: string;
};

const WIZARD_STEPS: WizardStep[] = [
  { index: 1, title: "Datos basicos y etapas fenologicas", routeLabel: "Datos" },
  { index: 2, title: "Plagas y enfermedades", routeLabel: "Sanidad" },
  { index: 3, title: "Evaluaciones", routeLabel: "Evaluaciones" },
  { index: 4, title: "Recomendaciones", routeLabel: "Recom." },
  { index: 5, title: "Productos recomendados", routeLabel: "Productos" }
];

const CURRENT_STEP = 1;

export function NewVisitaCampoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { session } = useAuthSession();
  const params = useLocalSearchParams<{
    id?: string | string[];
    parcelaCode?: string | string[];
    parcelaName?: string | string[];
  }>();

  const today = useMemo(() => formatDateForApi(new Date()), []);
  const parcelaId = toSingleParam(params.id);
  const parcelaCode = toSingleParam(params.parcelaCode);
  const parcelaName = toSingleParam(params.parcelaName);
  const parcelaLabel = [parcelaCode, parcelaName].filter(Boolean).join(" - ");
  const isTwoColumnLayout = width >= 620;
  const isCompactProgress = width < 540;
  const [activeCatalog, setActiveCatalog] = useState<ActiveVisitaField | null>(null);

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
  const [subEtapas, setSubEtapas] = useState<SubEtapaCatalogItem[]>([]);
  const [isLoadingSubEtapas, setIsLoadingSubEtapas] = useState(false);
  const [subEtapasError, setSubEtapasError] = useState<string | null>(null);
  const [selectedSubEtapaInfo, setSelectedSubEtapaInfo] =
    useState<SubEtapaCatalogItem | null>(null);
  const [sliderTrackWidth, setSliderTrackWidth] = useState(0);

  const [values, setValues] = useState<NewVisitaCampoFormValues>(() => ({
    crop: "",
    variety: "",
    parcelaId: parcelaId ?? "",
    parcelaLabel: parcelaLabel || parcelaId || "",
    campaign: "",
    plantsCount: "",
    areaHectares: "",
    sowingDate: "",
    visitDate: today,
    startVisitTime: "",
    endVisitTime: "",
    phenologicalStage: "",
    subEtapaId: "",
    subEtapaPercentage: "",
    generalObservation: ""
  }));
  const [errors, setErrors] = useState<NewVisitaCampoFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadCultivos();
  }, []);

  useEffect(() => {
    if (!values.parcelaId) {
      return;
    }

    const defaults = visitasCampoService.getLastVisitDefaultsByParcelaId(
      values.parcelaId
    );

    if (!defaults) {
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      plantsCount:
        currentValues.plantsCount ||
        (defaults.plantsCount === null || defaults.plantsCount === undefined
          ? ""
          : String(defaults.plantsCount)),
      sowingDate: currentValues.sowingDate || defaults.sowingDate || "",
      areaHectares:
        currentValues.areaHectares || defaults.areaHectares || ""
    }));
  }, [values.parcelaId]);

  useEffect(() => {
    if (!values.crop) {
      setVariedades([]);
      setCampanias([]);
      setEtapasFenologicas([]);
      setSubEtapas([]);
      setVariedadesError(null);
      setCampaniasError(null);
      setEtapasFenologicasError(null);
      setSubEtapasError(null);
      updateField("campaign", "");
      return;
    }

    void loadDependentCatalogs(values.crop);
  }, [values.crop]);

  const selectedEtapaFenologica = useMemo(
    () =>
      etapasFenologicas.find((etapa) => etapa.id === values.phenologicalStage) ??
      null,
    [etapasFenologicas, values.phenologicalStage]
  );

  useEffect(() => {
    if (!selectedEtapaFenologica) {
      setSubEtapas([]);
      setSubEtapasError(null);
      setValues((currentValues) => ({
        ...currentValues,
        subEtapaId: "",
        subEtapaPercentage: ""
      }));
      return;
    }

    if (selectedEtapaFenologica.type === "Etapa") {
      void loadSubEtapas(selectedEtapaFenologica.id);
      return;
    }

    setSubEtapas([]);
    setSubEtapasError(null);
    setValues((currentValues) => ({
      ...currentValues,
      subEtapaId: "",
      subEtapaPercentage: isPendingLabor(selectedEtapaFenologica)
        ? ""
        : currentValues.subEtapaPercentage || "0"
    }));
  }, [selectedEtapaFenologica?.id, selectedEtapaFenologica?.type]);

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

  const etapaFenologicaOptions = useMemo(
    () =>
      etapasFenologicas.map((etapa) => ({
        value: etapa.id,
        label: etapa.name
      })),
    [etapasFenologicas]
  );

  const selectedCampania = useMemo(
    () => campanias.find((campania) => campania.id === values.campaign),
    [campanias, values.campaign]
  );

  const subEtapaProgress = values.subEtapaPercentage.trim()
    ? Number(values.subEtapaPercentage)
    : 0;
  const shouldShowSubEtapas =
    selectedEtapaFenologica?.type === "Etapa" &&
    (isLoadingSubEtapas || subEtapas.length > 0 || !!subEtapasError);
  const shouldShowLaborProgress =
    selectedEtapaFenologica?.type === "Labor" &&
    !isPendingLabor(selectedEtapaFenologica);

  if (!session.accessToken) {
    return (
      <ScreenContainer contentStyle={styles.authContainer}>
        <StatusBar style="light" />
        <AppCard>
          <AppText variant="heading">Registrar visita</AppText>
          <AppText variant="muted">
            Necesitas iniciar sesion para registrar una visita de campo.
          </AppText>
          <View style={styles.authActions}>
            <AppButton label="Iniciar sesion" onPress={() => router.replace("/login")} />
            <AppButton label="Volver" onPress={() => router.back()} variant="outline" />
          </View>
        </AppCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar backgroundColor="#064b31" style="light" />
      <SafeAreaView edges={["top"]} style={styles.safeTop}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons color="#ffffff" name="arrow-back" size={27} />
          </Pressable>
          <AppText style={styles.topBarTitle} variant="title">
            Registro de visita
          </AppText>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          imageStyle={styles.heroImage}
          resizeMode="cover"
          source={VISITA_HERO_IMAGE}
          style={styles.hero}
        >
          <View style={styles.heroScrim}>
            <AppText style={styles.heroEyebrow} variant="eyebrow">
              Nueva visita
            </AppText>
            <AppText style={styles.heroTitle} variant="title">
              Datos basicos y etapas fenologicas
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Completa la informacion inicial de la visita y selecciona la etapa
              del cultivo.
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <WizardProgress
            compact={isCompactProgress}
            currentStep={CURRENT_STEP}
            steps={WIZARD_STEPS}
          />

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Datos basicos
              </AppText>
              <AppText style={styles.sectionSubtitle} variant="caption">
                Las campañas y la fecha de visita se completan automaticamente.
              </AppText>
            </View>

            <View style={isTwoColumnLayout ? styles.fieldGrid : styles.fieldStack}>
              <View style={styles.fieldColumn}>
                <AppSelectField
                  disabled={isLoadingCultivos}
                  emptyMessage="No hay cultivos disponibles."
                  error={getCatalogError(cultivosError, errors.crop)}
                  icon="leaf-outline"
                  isLoading={isLoadingCultivos}
                  isOpen={activeCatalog === "crop"}
                  label="Cultivo"
                  onSelect={(value) => handleCatalogSelection("crop", value)}
                  onToggle={() => toggleCatalog("crop")}
                  options={cultivoOptions}
                  placeholder="Selecciona cultivo"
                  selectedLabel={getSelectedLabel(cultivoOptions, values.crop)}
                />
              </View>

              <View style={styles.fieldColumn}>
                <AppSelectField
                  disabled={!values.crop || isLoadingVariedades}
                  emptyMessage="No hay variedades para el cultivo seleccionado."
                  error={getCatalogError(variedadesError, errors.variety)}
                  icon="flower-outline"
                  isLoading={isLoadingVariedades}
                  isOpen={activeCatalog === "variety"}
                  label="Variedad"
                  onSelect={(value) => handleCatalogSelection("variety", value)}
                  onToggle={() => toggleCatalog("variety")}
                  options={variedadOptions}
                  placeholder={
                    values.crop ? "Selecciona variedad" : "Selecciona cultivo"
                  }
                  selectedLabel={getSelectedLabel(variedadOptions, values.variety)}
                />
              </View>

              <View style={styles.fieldColumn}>
                <ReadonlyField
                  error={getCatalogError(campaniasError, errors.campaign)}
                  helper={
                    isLoadingCampanias
                      ? "Buscando campaña activa..."
                      : "Se asigna segun el cultivo seleccionado"
                  }
                  icon="calendar-outline"
                  label="Campañas"
                  value={
                    selectedCampania?.name ||
                    (values.crop ? "Sin campaña activa" : "Selecciona cultivo")
                  }
                />
              </View>

              <View style={styles.fieldColumn}>
                <IconTextInput
                  error={errors.plantsCount}
                  icon="flower-outline"
                  keyboardType="number-pad"
                  label="Numero de plantas"
                  onChangeText={(value) => updateField("plantsCount", value)}
                  placeholder="Ingresa el numero"
                  value={values.plantsCount}
                />
              </View>

              <View style={styles.fieldColumn}>
                <IconTextInput
                  error={errors.areaHectares}
                  icon="resize-outline"
                  keyboardType="decimal-pad"
                  label="Area (ha)"
                  onChangeText={(value) =>
                    updateField("areaHectares", formatDecimalInput(value))
                  }
                  placeholder="Ingresa el area"
                  value={values.areaHectares}
                />
              </View>

              <View style={styles.fieldColumn}>
                <DatePickerField
                  allowClear
                  error={errors.sowingDate}
                  isOpen={activeCatalog === "sowingDate"}
                  label="Fecha de siembra"
                  maxDate={today}
                  onClear={() => handleDateSelection("sowingDate", "")}
                  onSelect={(value) => handleDateSelection("sowingDate", value)}
                  onToggle={() => toggleCatalog("sowingDate")}
                  placeholder="Selecciona fecha"
                  value={values.sowingDate}
                />
              </View>

              <View style={styles.fieldColumn}>
                <ReadonlyField
                  icon="calendar-outline"
                  label="Fecha de visita"
                  value={formatDisplayDate(values.visitDate) || values.visitDate}
                />
              </View>

              <View style={styles.fieldColumn}>
                <IconTextInput
                  error={errors.startVisitTime}
                  icon="time-outline"
                  keyboardType="number-pad"
                  label="Hora de inicio"
                  onChangeText={(value) =>
                    updateField("startVisitTime", formatTypedTimeInput(value))
                  }
                  onEndEditing={() =>
                    updateField("startVisitTime", normalizeTypedTimeInput(values.startVisitTime))
                  }
                  placeholder="HH:MM"
                  value={values.startVisitTime}
                />
                <AppText style={styles.fieldHint} variant="caption">
                  Ingresa la hora (24 h)
                </AppText>
              </View>

              <View style={styles.fieldColumn}>
                <IconTextInput
                  error={errors.endVisitTime}
                  icon="time-outline"
                  keyboardType="number-pad"
                  label="Hora de fin"
                  onChangeText={(value) =>
                    updateField("endVisitTime", formatTypedTimeInput(value))
                  }
                  onEndEditing={() =>
                    updateField("endVisitTime", normalizeTypedTimeInput(values.endVisitTime))
                  }
                  placeholder="HH:MM"
                  value={values.endVisitTime}
                />
                <AppText style={styles.fieldHint} variant="caption">
                  Ingresa la hora (24 h)
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Etapa fenologica
              </AppText>
              <AppText style={styles.sectionSubtitle} variant="caption">
                Selecciona la etapa actual del cultivo.
              </AppText>
            </View>

            <AppSelectField
              disabled={!values.crop}
              emptyMessage="No hay etapas fenologicas disponibles."
              error={etapasFenologicasError}
              icon="flower"
              isLoading={isLoadingEtapasFenologicas}
              isOpen={activeCatalog === "phenologicalStage"}
              label="Etapa"
              onSelect={(value) => handleCatalogSelection("phenologicalStage", value)}
              onToggle={() => toggleCatalog("phenologicalStage")}
              options={etapaFenologicaOptions}
              placeholder={
                values.crop ? "Selecciona etapa" : "Selecciona primero un cultivo"
              }
              selectedLabel={getSelectedLabel(
                etapaFenologicaOptions,
                values.phenologicalStage
              )}
            />

            {shouldShowSubEtapas ? (
              <ProgressGuide
                error={getCatalogError(subEtapasError, errors.subEtapaPercentage)}
                isLoading={isLoadingSubEtapas}
                onImagePress={(subEtapa) => setSelectedSubEtapaInfo(subEtapa)}
                onTrackLayout={(event) =>
                  setSliderTrackWidth(event.nativeEvent.layout.width)
                }
                onValueChange={handleSubEtapaProgressChange}
                onValueCommit={commitSubEtapaProgress}
                progress={Number.isFinite(subEtapaProgress) ? subEtapaProgress : 0}
                showMarkers
                sliderTrackWidth={sliderTrackWidth}
                subEtapas={subEtapas}
                subtitle="Ajusta el avance observado del cultivo."
                title="Sub etapa"
                valueText={values.subEtapaPercentage}
              />
            ) : null}

            {shouldShowLaborProgress ? (
              <ProgressGuide
                error={errors.subEtapaPercentage ?? null}
                isLoading={false}
                onImagePress={(subEtapa) => setSelectedSubEtapaInfo(subEtapa)}
                onTrackLayout={(event) =>
                  setSliderTrackWidth(event.nativeEvent.layout.width)
                }
                onValueChange={handleSubEtapaProgressChange}
                onValueCommit={commitSubEtapaProgress}
                progress={Number.isFinite(subEtapaProgress) ? subEtapaProgress : 0}
                showMarkers={false}
                sliderTrackWidth={sliderTrackWidth}
                subEtapas={[]}
                subtitle="Ajusta el porcentaje de avance de la labor."
                title="Avance de labor"
                valueText={values.subEtapaPercentage}
              />
            ) : null}
          </View>

          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle} variant="heading">
                Observacion general
              </AppText>
              <AppText style={styles.sectionSubtitle} variant="caption">
                Opcional para esta primera etapa del registro.
              </AppText>
            </View>

            <TextInput
              multiline
              numberOfLines={4}
              onChangeText={(value) => updateField("generalObservation", value)}
              placeholder="Observaciones generales de la visita"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.observationInput}
              textAlignVertical="top"
              value={values.generalObservation}
            />
          </View>

          <ReadonlyField
            icon="location-outline"
            label="Parcela"
            value={values.parcelaLabel || "Sin parcela seleccionada"}
            error={errors.parcelaId}
          />

          {submitError ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.submitErrorText} variant="label">
                {submitError}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => {
                void handleSubmit();
              }}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && !isSubmitting && styles.pressed,
                isSubmitting && styles.disabledButton
              ]}
            >
              <Ionicons color="#d8f3dc" name="leaf" size={20} />
              <AppText style={styles.continueButtonText} variant="label">
                {isSubmitting ? "Guardando..." : "Continuar"}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backOutlineButton,
                pressed && !isSubmitting && styles.pressed,
                isSubmitting && styles.disabledButton
              ]}
            >
              <AppText style={styles.backOutlineButtonText} variant="label">
                Volver
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <SubEtapaInfoModal
        onClose={() => setSelectedSubEtapaInfo(null)}
        subEtapa={selectedSubEtapaInfo}
      />
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

  function toggleCatalog(field: ActiveVisitaField) {
    setActiveCatalog((currentField) => (currentField === field ? null : field));
  }

  function handleCatalogSelection(
    field: "crop" | "variety" | "phenologicalStage",
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
        phenologicalStage: "",
        subEtapaId: "",
        subEtapaPercentage: ""
      }));
    } else if (field === "phenologicalStage") {
      setErrors((currentErrors) => ({
        ...currentErrors,
        phenologicalStage: undefined
      }));
      setValues((currentValues) => ({
        ...currentValues,
        phenologicalStage: value,
        subEtapaId: "",
        subEtapaPercentage: ""
      }));
    } else {
      updateField(field, value);
    }

    setActiveCatalog(null);
  }

  function handleDateSelection(
    field: "sowingDate",
    value: string
  ) {
    updateField(field, value);
    setActiveCatalog(null);
  }

  function handleSubEtapaProgressChange(value: number | string) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      subEtapaPercentage: undefined
    }));
    setSubmitError(null);

    const parsedPercentage =
      typeof value === "number"
        ? roundPercentageToStep(value)
        : parsePercentageValue(value);

    if (parsedPercentage === null) {
      setValues((currentValues) => ({
        ...currentValues,
        subEtapaId: "",
        subEtapaPercentage: ""
      }));
      return;
    }

    const closestSubEtapa = findClosestSubEtapa(subEtapas, parsedPercentage);

    setValues((currentValues) => ({
      ...currentValues,
      subEtapaId: closestSubEtapa?.id ?? "",
      subEtapaPercentage: formatPercentageValue(parsedPercentage)
    }));
  }

  function commitSubEtapaProgress(value: number | string) {
    setErrors((currentErrors) => ({
      ...currentErrors,
      subEtapaPercentage: undefined
    }));
    setSubmitError(null);

    const parsedPercentage = parsePercentageValue(value);

    if (parsedPercentage === null) {
      setValues((currentValues) => ({
        ...currentValues,
        subEtapaId: "",
        subEtapaPercentage: ""
      }));
      return;
    }

    const roundedPercentage = roundPercentageToStep(parsedPercentage);
    const closestSubEtapa = findClosestSubEtapa(subEtapas, roundedPercentage);

    setValues((currentValues) => ({
      ...currentValues,
      subEtapaId: closestSubEtapa?.id ?? "",
      subEtapaPercentage: formatPercentageValue(roundedPercentage)
    }));
  }

  async function handleSubmit() {
    const normalizedValues = normalizeFormValuesForSubmit(values, subEtapas);
    const nextErrors = validateForm(normalizedValues, today);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSubmitError("Revisa los campos obligatorios antes de continuar.");
      return;
    }

    if (!session.accessToken) {
      setSubmitError("Tu sesion ya no es valida. Vuelve a iniciar sesion.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setValues(normalizedValues);

    try {
      const location = await captureLocationSilently();
      const createdVisita = await visitasCampoService.create(
        buildCreateDraft(normalizedValues, location),
        {
          accessToken: session.accessToken,
          tokenType: session.tokenType
        }
      );

      router.replace({
        pathname: "/visitas-campo/[id]/observaciones-sanitarias",
        params: {
          id: createdVisita.id
        }
      });
    } catch (error) {
      const apiError = toApiError(error);
      setSubmitError(apiError.message || "No se pudo guardar la visita de campo.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function captureLocationSilently() {
    try {
      const capturedLocation = await captureCurrentDeviceLocation();
      return capturedLocation.point;
    } catch {
      return null;
    }
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
      updateField("campaign", campaniasResult.value[0]?.id ?? "");

      if (campaniasResult.value.length === 0) {
        setCampaniasError("No hay campaña activa para el cultivo seleccionado.");
      }
    } else {
      setCampanias([]);
      updateField("campaign", "");
      setCampaniasError(
        toApiError(campaniasResult.reason).message || "No se pudo cargar campañas."
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

  async function loadSubEtapas(etapaFenologicaId: string) {
    setIsLoadingSubEtapas(true);
    setSubEtapasError(null);

    try {
      const nextSubEtapas =
        await visitaCampoCatalogsService.getSubEtapasByEtapaFenologica(
          etapaFenologicaId
        );

      setSubEtapas(nextSubEtapas);

      if (nextSubEtapas.length > 0) {
        const initialPercentage =
          values.subEtapaPercentage.trim().length > 0
            ? parsePercentageValue(values.subEtapaPercentage) ?? 0
            : nextSubEtapas[0]?.percentage ?? 0;
        const initialSubEtapa = findClosestSubEtapa(
          nextSubEtapas,
          initialPercentage
        );

        setValues((currentValues) => ({
          ...currentValues,
          subEtapaId: initialSubEtapa?.id ?? "",
          subEtapaPercentage: formatPercentageValue(initialPercentage)
        }));
      } else {
        setValues((currentValues) => ({
          ...currentValues,
          subEtapaId: "",
          subEtapaPercentage: ""
        }));
      }
    } catch (error) {
      setSubEtapas([]);
      setSubEtapasError(
        toApiError(error).message || "No se pudo cargar sub etapas."
      );
    } finally {
      setIsLoadingSubEtapas(false);
    }
  }
}

type WizardProgressProps = {
  compact: boolean;
  currentStep: number;
  steps: WizardStep[];
};

function WizardProgress({ compact, currentStep, steps }: WizardProgressProps) {
  const activeStep = steps.find((step) => step.index === currentStep) ?? steps[0];

  return (
    <View style={[styles.progressCard, compact && styles.progressCardCompact]}>
      <View style={[styles.progressCopy, compact && styles.progressCopyCompact]}>
        <AppText style={styles.progressStepText} variant="label">
          Paso {currentStep} de {steps.length}
        </AppText>
        <AppText style={styles.progressTitle} variant="body">
          {activeStep.title}
        </AppText>
      </View>

      <View style={styles.progressTrack}>
        {steps.map((step, index) => {
          const isActive = step.index === currentStep;
          const isComplete = step.index < currentStep;

          return (
            <View key={step.index} style={styles.progressStepItem}>
              {index > 0 ? (
                <View
                  style={[
                    styles.progressConnector,
                    isComplete && styles.progressConnectorActive
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.progressNode,
                  (isActive || isComplete) && styles.progressNodeActive
                ]}
              >
                <AppText
                  style={[
                    styles.progressNodeText,
                    (isActive || isComplete) && styles.progressNodeTextActive
                  ]}
                  variant="label"
                >
                  {step.index}
                </AppText>
              </View>
              {isActive ? <View style={styles.progressActiveDot} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

type ProgressGuideProps = {
  subEtapas: SubEtapaCatalogItem[];
  progress: number;
  valueText: string;
  sliderTrackWidth: number;
  isLoading: boolean;
  error: string | null;
  title: string;
  subtitle: string;
  showMarkers: boolean;
  onTrackLayout: (event: LayoutChangeEvent) => void;
  onValueChange: (value: number | string) => void;
  onValueCommit: (value: number | string) => void;
  onImagePress: (subEtapa: SubEtapaCatalogItem) => void;
};

function ProgressGuide({
  subEtapas,
  progress,
  valueText,
  sliderTrackWidth,
  isLoading,
  error,
  title,
  subtitle,
  showMarkers,
  onTrackLayout,
  onValueChange,
  onValueCommit,
  onImagePress
}: ProgressGuideProps) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          updateProgressFromTouch(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updateProgressFromTouch(event.nativeEvent.locationX);
        }
      }),
    [onValueChange, sliderTrackWidth]
  );

  const markerSize = sliderTrackWidth < 320 ? 48 : 58;
  const markerImageSize = markerSize - 8;
  const clampedProgress = clampNumber(progress, 0, 100);
  const thumbLeft =
    sliderTrackWidth > 0
      ? (clampedProgress / 100) * sliderTrackWidth - 13
      : 0;

  return (
    <View style={styles.subEtapasPanel}>
      <View style={styles.subEtapasHeader}>
        <View style={styles.subEtapasHeaderCopy}>
          <AppText style={styles.subEtapasTitle} variant="label">
            {title}
          </AppText>
          <AppText style={styles.subEtapasSubtitle} variant="caption">
            {subtitle}
          </AppText>
        </View>
        <View style={styles.percentageInputShell}>
          <TextInput
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={onValueChange}
            onEndEditing={() => onValueCommit(valueText)}
            placeholder="0"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.percentageInput}
            value={valueText}
          />
          <AppText style={styles.percentageSymbol} variant="label">
            %
          </AppText>
        </View>
      </View>

      {isLoading ? (
        <AppText style={styles.fieldHint} variant="caption">
          Cargando sub etapas...
        </AppText>
      ) : null}

      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}

      {!isLoading && !error && (subEtapas.length > 0 || !showMarkers) ? (
        <View style={styles.sliderArea}>
          <View
            onLayout={onTrackLayout}
            style={styles.sliderTrack}
            {...panResponder.panHandlers}
          >
            <View
              style={[
                styles.sliderTrackFill,
                { width: `${clampedProgress}%` }
              ]}
            />
            <View
              style={[
                styles.sliderThumb,
                {
                  left: clampNumber(
                    thumbLeft,
                    0,
                    Math.max(0, sliderTrackWidth - 26)
                  )
                }
              ]}
            />
            {showMarkers ? subEtapas.map((subEtapa) => {
              const percentage = subEtapa.percentage ?? 0;
              const markerLeft =
                sliderTrackWidth > 0
                  ? (clampNumber(percentage, 0, 100) / 100) * sliderTrackWidth -
                    markerSize / 2
                  : 0;

              return (
                <Pressable
                  accessibilityLabel={`Ver sub etapa ${subEtapa.name}`}
                  accessibilityRole="button"
                  key={subEtapa.id}
                  onPress={() => onImagePress(subEtapa)}
                  style={({ pressed }) => [
                    styles.subEtapaMarker,
                    {
                      width: markerSize,
                      left: clampNumber(
                        markerLeft,
                        0,
                        Math.max(0, sliderTrackWidth - markerSize)
                      )
                    },
                    pressed && styles.pressed
                  ]}
                >
                  <Image
                    source={getSubEtapaImageSource(subEtapa.name)}
                    style={[
                      styles.subEtapaMarkerImage,
                      {
                        width: markerImageSize,
                        height: markerImageSize
                      }
                    ]}
                  />
                  <AppText
                    numberOfLines={1}
                    style={styles.subEtapaMarkerPercent}
                    variant="caption"
                  >
                    {formatPercentageValue(percentage)}%
                  </AppText>
                </Pressable>
              );
            }) : null}
          </View>
          <View style={styles.sliderFooter}>
            <AppText style={styles.sliderBoundText} variant="caption">
              0%
            </AppText>
            <AppText style={styles.sliderBoundText} variant="caption">
              100%
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );

  function updateProgressFromTouch(locationX: number) {
    if (sliderTrackWidth <= 0) {
      return;
    }

    const rawValue = (clampNumber(locationX, 0, sliderTrackWidth) / sliderTrackWidth) * 100;
    onValueChange(Math.round(rawValue / 5) * 5);
  }
}

function SubEtapaInfoModal({
  subEtapa,
  onClose
}: {
  subEtapa: SubEtapaCatalogItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={subEtapa !== null}
    >
      <View style={styles.modalScrim}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.subEtapaModalCard}>
          {subEtapa ? (
            <>
              <Image
                resizeMode="contain"
                source={getSubEtapaImageSource(subEtapa.name)}
                style={styles.subEtapaModalImage}
              />
              <AppText style={styles.subEtapaModalTitle} variant="heading">
                {subEtapa.name}
              </AppText>
              <AppText style={styles.subEtapaModalPercent} variant="label">
                {subEtapa.percentage === null
                  ? "Sin porcentaje"
                  : `${formatPercentageValue(subEtapa.percentage)}%`}
              </AppText>
              <AppText style={styles.subEtapaModalDescription} variant="body">
                {subEtapa.description || "Sin descripcion registrada."}
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.pressed
                ]}
              >
                <AppText style={styles.modalCloseButtonText} variant="label">
                  Cerrar
                </AppText>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type ReadonlyFieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  helper?: string;
  error?: string | null;
};

function ReadonlyField({
  icon,
  label,
  value,
  helper,
  error
}: ReadonlyFieldProps) {
  return (
    <View style={styles.localFieldWrapper}>
      <AppText style={styles.localFieldLabel} variant="label">
        {label}
      </AppText>
      <View style={[styles.readonlyTrigger, error && styles.localFieldError]}>
        <View style={styles.localFieldIcon}>
          <Ionicons color="#064b31" name={icon} size={22} />
        </View>
        <AppText
          style={[
            styles.readonlyValue,
            value.startsWith("Sin") && styles.placeholderValue
          ]}
          variant="body"
        >
          {value}
        </AppText>
      </View>
      {helper ? (
        <AppText style={styles.fieldHint} variant="caption">
          {helper}
        </AppText>
      ) : null}
      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type IconTextInputProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
  error?: string | null;
  onChangeText: (value: string) => void;
  onEndEditing?: () => void;
};

function IconTextInput({
  icon,
  label,
  value,
  placeholder,
  keyboardType = "default",
  error,
  onChangeText,
  onEndEditing
}: IconTextInputProps) {
  return (
    <View style={styles.localFieldWrapper}>
      <AppText style={styles.localFieldLabel} variant="label">
        {label}
      </AppText>
      <View style={[styles.inputFrame, error && styles.localFieldError]}>
        <View style={styles.localFieldIcon}>
          <Ionicons color="#064b31" name={icon} size={22} />
        </View>
        <TextInput
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.iconInput}
          value={value}
        />
      </View>
      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type InlinePickerFieldProps = {
  label: string;
  placeholder: string;
  valueLabel?: string;
  isOpen: boolean;
  disabled?: boolean;
  error?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  onToggle: () => void;
  children: ReactNode;
};

type DatePickerFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  isOpen: boolean;
  error?: string | null;
  allowClear?: boolean;
  maxDate?: string;
  onToggle: () => void;
  onSelect: (value: string) => void;
  onClear?: () => void;
};

function InlinePickerField({
  label,
  placeholder,
  valueLabel,
  isOpen,
  disabled = false,
  error,
  icon,
  onToggle,
  children
}: InlinePickerFieldProps) {
  return (
    <View style={styles.localFieldWrapper}>
      <AppText style={styles.localFieldLabel} variant="label">
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.pickerTrigger,
          isOpen && styles.pickerTriggerOpen,
          error && styles.localFieldError,
          disabled && styles.pickerTriggerDisabled,
          pressed && !disabled && styles.pressed
        ]}
      >
        <View style={styles.localFieldIcon}>
          <Ionicons color="#064b31" name={icon} size={22} />
        </View>
        <AppText
          style={[styles.pickerValue, !valueLabel && styles.placeholderValue]}
          variant="body"
        >
          {valueLabel || placeholder}
        </AppText>
        <Ionicons
          color="#064b31"
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={21}
          style={styles.pickerChevron}
        />
      </Pressable>
      {error ? (
        <AppText style={styles.localErrorText} variant="caption">
          {error}
        </AppText>
      ) : null}
      {isOpen ? <View style={styles.pickerPanel}>{children}</View> : null}
    </View>
  );
}

function DatePickerField({
  label,
  placeholder,
  value,
  isOpen,
  error,
  allowClear = false,
  maxDate,
  onToggle,
  onSelect,
  onClear
}: DatePickerFieldProps) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(parseDateValue(value) ?? new Date())
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setVisibleMonth(getMonthStart(parseDateValue(value) ?? new Date()));
  }, [isOpen, value]);

  const calendarWeeks = useMemo(
    () => buildCalendarWeeks(visibleMonth),
    [visibleMonth]
  );

  return (
    <InlinePickerField
      error={error}
      icon="calendar-outline"
      isOpen={isOpen}
      label={label}
      onToggle={onToggle}
      placeholder={placeholder}
      valueLabel={formatDisplayDate(value)}
    >
      <View style={styles.calendarHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
          style={({ pressed }) => [
            styles.calendarNavButton,
            pressed && styles.calendarNavButtonPressed
          ]}
        >
          <Ionicons color="#064b31" name="chevron-back" size={20} />
        </Pressable>
        <AppText style={styles.calendarMonthText} variant="label">
          {formatMonthYear(visibleMonth)}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
          style={({ pressed }) => [
            styles.calendarNavButton,
            pressed && styles.calendarNavButtonPressed
          ]}
        >
          <Ionicons color="#064b31" name="chevron-forward" size={20} />
        </Pressable>
      </View>

      <View style={styles.calendarWeekHeader}>
        {DAY_LABELS.map((dayLabel) => (
          <View key={dayLabel} style={styles.calendarDayLabelCell}>
            <AppText style={styles.calendarDayLabelText} variant="caption">
              {dayLabel}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarWeeks.map((week, weekIndex) => (
          <View key={`${visibleMonth.toISOString()}-${weekIndex}`} style={styles.calendarWeekRow}>
            {week.map((day, dayIndex) => {
              const isFutureDay =
                !!day.value && !!maxDate && compareDateValues(day.value, maxDate) > 0;
              const isDisabled = !day.isCurrentMonth || isFutureDay;

              return (
                <Pressable
                  accessibilityRole="button"
                  disabled={isDisabled}
                  key={`${weekIndex}-${dayIndex}-${day.value || "empty"}`}
                  onPress={() => {
                    if (day.value) {
                      onSelect(day.value);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.calendarDayCell,
                    !day.isCurrentMonth && styles.calendarDayCellOutsideMonth,
                    isFutureDay && styles.calendarDayCellDisabled,
                    day.value === value && styles.calendarDayCellSelected,
                    pressed &&
                      !isDisabled &&
                      day.value !== value &&
                      styles.calendarDayCellPressed
                  ]}
                >
                  <AppText
                    style={[
                      (!day.isCurrentMonth || isFutureDay) &&
                        styles.calendarDayTextDisabled,
                      day.value === value && styles.calendarDayTextSelected
                    ]}
                    variant="body"
                  >
                    {day.dayNumber > 0 ? String(day.dayNumber) : ""}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {allowClear && value && onClear ? (
        <View style={styles.pickerActionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={onClear}
            style={({ pressed }) => [
              styles.pickerActionButton,
              pressed && styles.pickerActionButtonPressed
            ]}
          >
            <AppText variant="label">Limpiar fecha</AppText>
          </Pressable>
        </View>
      ) : null}
    </InlinePickerField>
  );
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

function isPendingLabor(etapa: EtapaFenologicaCatalogItem) {
  return etapa.type === "Labor" && normalizeCatalogName(etapa.name).includes("induccion flor");
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function validateForm(
  values: NewVisitaCampoFormValues,
  today: string
): NewVisitaCampoFormErrors {
  const nextErrors: NewVisitaCampoFormErrors = {};

  if (!values.crop) {
    nextErrors.crop = "Selecciona un cultivo.";
  }

  if (!values.variety) {
    nextErrors.variety = "Selecciona una variedad.";
  }

  if (!values.campaign) {
    nextErrors.campaign = "No se encontro una campaña activa para el cultivo.";
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

  if (values.areaHectares.trim().length > 0) {
    const areaHectares = Number(values.areaHectares);

    if (!Number.isFinite(areaHectares) || areaHectares <= 0) {
      nextErrors.areaHectares = "Area debe ser un numero mayor que cero.";
    }
  }

  if (values.sowingDate) {
    if (!DATE_PATTERN.test(values.sowingDate.trim())) {
      nextErrors.sowingDate = "Fecha de siembra debe tener formato AAAA-MM-DD.";
    } else if (compareDateValues(values.sowingDate, today) > 0) {
      nextErrors.sowingDate = "Fecha de siembra no puede ser mayor a la fecha actual.";
    }
  }

  if (!values.visitDate.trim()) {
    nextErrors.visitDate = "La fecha de visita es obligatoria.";
  } else if (!DATE_PATTERN.test(values.visitDate.trim())) {
    nextErrors.visitDate = "Fecha de visita debe tener formato AAAA-MM-DD.";
  }

  if (!values.startVisitTime.trim()) {
    nextErrors.startVisitTime = "La hora de inicio es obligatoria.";
  } else if (!TIME_PATTERN.test(values.startVisitTime.trim())) {
    nextErrors.startVisitTime = "Hora de inicio debe tener formato HH:mm.";
  }

  if (values.endVisitTime.trim()) {
    if (!TIME_PATTERN.test(values.endVisitTime.trim())) {
      nextErrors.endVisitTime = "Hora de fin debe tener formato HH:mm.";
    } else if (
      values.startVisitTime.trim() &&
      normalizeTimeForApi(values.startVisitTime) >
        normalizeTimeForApi(values.endVisitTime)
    ) {
      nextErrors.startVisitTime =
        "Hora de inicio no puede ser mayor a la hora de fin.";
    }
  }

  if (values.subEtapaPercentage.trim().length > 0) {
    const subEtapaPercentage = Number(values.subEtapaPercentage);

    if (
      !Number.isFinite(subEtapaPercentage) ||
      subEtapaPercentage < 0 ||
      subEtapaPercentage > 100
    ) {
      nextErrors.subEtapaPercentage =
        "Porcentaje de sub etapa debe estar entre 0 y 100.";
    } else if (!isPercentageStep(subEtapaPercentage)) {
      nextErrors.subEtapaPercentage =
        "Porcentaje debe avanzar de 5 en 5.";
    }
  }

  return nextErrors;
}

function normalizeFormValuesForSubmit(
  values: NewVisitaCampoFormValues,
  subEtapas: SubEtapaCatalogItem[]
): NewVisitaCampoFormValues {
  const parsedPercentage = parsePercentageValue(values.subEtapaPercentage);

  if (parsedPercentage === null) {
    return values;
  }

  const roundedPercentage = roundPercentageToStep(parsedPercentage);
  const closestSubEtapa = findClosestSubEtapa(subEtapas, roundedPercentage);

  return {
    ...values,
    subEtapaId: closestSubEtapa?.id ?? "",
    subEtapaPercentage: formatPercentageValue(roundedPercentage)
  };
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
    ...(values.areaHectares.trim()
      ? { areaHectares: values.areaHectares.trim() }
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
    ...(values.subEtapaId ? { subEtapaId: values.subEtapaId } : {}),
    ...(values.subEtapaPercentage.trim()
      ? { subEtapaPercentage: Number(values.subEtapaPercentage.trim()) }
      : {}),
    ...(values.generalObservation.trim()
      ? { generalObservation: values.generalObservation.trim() }
      : {})
  };
}

function findClosestSubEtapa(
  subEtapas: SubEtapaCatalogItem[],
  percentage: number
) {
  return subEtapas.reduce<SubEtapaCatalogItem | null>((closest, subEtapa) => {
    if (subEtapa.percentage === null) {
      return closest;
    }

    if (!closest || closest.percentage === null) {
      return subEtapa;
    }

    const currentDistance = Math.abs(subEtapa.percentage - percentage);
    const closestDistance = Math.abs(closest.percentage - percentage);

    return currentDistance < closestDistance ? subEtapa : closest;
  }, null);
}

function parsePercentageValue(value: number | string) {
  if (typeof value === "string") {
    const normalizedValue = formatIntegerInput(value);

    if (!normalizedValue) {
      return null;
    }

    const parsedValue = Number(normalizedValue);

    if (!Number.isFinite(parsedValue)) {
      return null;
    }

    return clampNumber(parsedValue, 0, 100);
  }

  if (!Number.isFinite(value)) {
    return null;
  }

  return clampNumber(value, 0, 100);
}

function formatPercentageValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function roundPercentageToStep(value: number) {
  return clampNumber(Math.round(value / 5) * 5, 0, 100);
}

function isPercentageStep(value: number) {
  return Number.isInteger(value) && value % 5 === 0;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDecimalInput(value: string, maxDecimals = 4) {
  const normalizedValue = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalizedValue.split(".");
  const decimalPart = decimalParts.join("").slice(0, maxDecimals);

  if (normalizedValue.includes(".")) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
}

function formatIntegerInput(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeTimeForApi(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.length === 5 ? `${trimmedValue}:00` : trimmedValue;
}

function formatTypedTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    if (digits.length < 2) {
      return digits;
    }

    return formatBoundedTimePart(digits, 23);
  }

  const hour = formatBoundedTimePart(digits.slice(0, 2), 23);
  const minute =
    digits.length === 3
      ? digits.slice(2)
      : formatBoundedTimePart(digits.slice(2), 59);

  return `${hour}:${minute}`;
}

function normalizeTypedTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);

  if (!digits) {
    return "";
  }

  if (digits.length <= 2) {
    return `${formatBoundedTimePart(digits, 23)}:00`;
  }

  const hourDigits = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
  const minuteDigits = digits.length === 3 ? digits.slice(1) : digits.slice(2);

  return `${formatBoundedTimePart(hourDigits, 23)}:${formatBoundedTimePart(
    minuteDigits,
    59
  )}`;
}

function formatBoundedTimePart(value: string, max: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "00";
  }

  return padTimeValue(clampNumber(parsedValue, 0, max));
}

function parseDateValue(value: string) {
  const trimmedValue = value.trim();

  if (!DATE_PATTERN.test(trimmedValue)) {
    return null;
  }

  const [yearValue, monthValue, dayValue] = trimmedValue
    .split("-")
    .map((item) => Number(item));

  if (
    !Number.isInteger(yearValue) ||
    !Number.isInteger(monthValue) ||
    !Number.isInteger(dayValue)
  ) {
    return null;
  }

  const parsedDate = new Date(yearValue, monthValue - 1, dayValue);

  if (
    parsedDate.getFullYear() !== yearValue ||
    parsedDate.getMonth() !== monthValue - 1 ||
    parsedDate.getDate() !== dayValue
  ) {
    return null;
  }

  return parsedDate;
}

function compareDateValues(left: string, right: string) {
  const leftDate = parseDateValue(left);
  const rightDate = parseDateValue(right);

  if (!leftDate || !rightDate) {
    return 0;
  }

  return leftDate.getTime() - rightDate.getTime();
}

function formatDisplayDate(value: string) {
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return undefined;
  }

  return `${padTimeValue(parsedDate.getDate())}/${padTimeValue(parsedDate.getMonth() + 1)}/${parsedDate.getFullYear()}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatMonthYear(date: Date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

function buildCalendarWeeks(date: Date) {
  const firstDayOfMonth = getMonthStart(date);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const weeks: Array<
    Array<{ value: string | null; dayNumber: number; isCurrentMonth: boolean }>
  > = [];

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const dayOffset = cellIndex - startOffset + 1;
    const isCurrentMonth = dayOffset >= 1 && dayOffset <= daysInMonth;
    const weekIndex = Math.floor(cellIndex / 7);
    const targetWeek = weeks[weekIndex] ?? [];

    if (isCurrentMonth) {
      const currentDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        dayOffset
      );

      targetWeek.push({
        value: formatDateForApi(currentDate),
        dayNumber: dayOffset,
        isCurrentMonth: true
      });
    } else {
      targetWeek.push({
        value: null,
        dayNumber: 0,
        isCurrentMonth: false
      });
    }

    weeks[weekIndex] = targetWeek;
  }

  return weeks;
}

function formatDateForApi(date: Date) {
  return `${date.getFullYear()}-${padTimeValue(date.getMonth() + 1)}-${padTimeValue(date.getDate())}`;
}

function padTimeValue(value: number) {
  return String(value).padStart(2, "0");
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"] as const;
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
] as const;
const styles = StyleSheet.create({
  authContainer: {
    justifyContent: "center"
  },
  authActions: {
    gap: 10
  },
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  safeTop: {
    backgroundColor: "#064b31"
  },
  topBar: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#064b31"
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24
  },
  topBarTitle: {
    flex: 1,
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 0
  },
  scrollContent: {
    paddingBottom: 18,
    backgroundColor: "#fbfcf9"
  },
  hero: {
    minHeight: 284,
    width: "100%",
    backgroundColor: "#f7f5ed"
  },
  heroImage: {
    opacity: 0.86
  },
  heroScrim: {
    minHeight: 284,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 26,
    backgroundColor: "rgba(255, 252, 244, 0.58)"
  },
  heroEyebrow: {
    color: "#064b31",
    letterSpacing: 2
  },
  heroTitle: {
    maxWidth: 530,
    marginTop: 14,
    color: "#073b2a",
    fontSize: 37,
    lineHeight: 43,
    letterSpacing: 0
  },
  heroSubtitle: {
    maxWidth: 560,
    marginTop: 13,
    color: "#4e5b56",
    fontSize: 16,
    lineHeight: 25
  },
  body: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 16
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    minHeight: 104,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5
  },
  progressCardCompact: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 14
  },
  progressCopy: {
    width: 210,
    maxWidth: "42%",
    gap: 5
  },
  progressCopyCompact: {
    width: "100%",
    maxWidth: "100%"
  },
  progressStepText: {
    color: "#176b2d",
    fontSize: 17
  },
  progressTitle: {
    color: "#102e23",
    fontSize: 15,
    lineHeight: 21
  },
  progressTrack: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  progressStepItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1
  },
  progressConnector: {
    width: 22,
    height: 1.5,
    backgroundColor: "#d8d3c5",
    flexShrink: 1
  },
  progressConnectorActive: {
    backgroundColor: "#3f8f21"
  },
  progressNode: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#d8d3c5",
    backgroundColor: "#ffffff"
  },
  progressNodeActive: {
    borderColor: "#12622f",
    backgroundColor: "#12622f"
  },
  progressNodeText: {
    color: "#17231d"
  },
  progressNodeTextActive: {
    color: "#ffffff"
  },
  progressActiveDot: {
    width: 8,
    height: 8,
    marginLeft: 5,
    borderRadius: 4,
    backgroundColor: "#3f8f21"
  },
  formCard: {
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 19,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ece8dd",
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 9,
    elevation: 4
  },
  sectionHeader: {
    gap: 4
  },
  sectionTitle: {
    color: "#073b2a",
    fontSize: 22,
    lineHeight: 27
  },
  sectionSubtitle: {
    color: "#5f6b66",
    fontSize: 14,
    lineHeight: 19
  },
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  fieldStack: {
    gap: 14
  },
  fieldColumn: {
    minWidth: 250,
    flex: 1
  },
  localFieldWrapper: {
    gap: 6
  },
  localFieldLabel: {
    color: "#0f1c18",
    fontSize: 15
  },
  readonlyTrigger: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#fbfbf8"
  },
  inputFrame: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#ffffff"
  },
  localFieldIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f0f3e8"
  },
  readonlyValue: {
    minWidth: 0,
    flex: 1,
    color: "#1f2b26",
    fontSize: 16
  },
  iconInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: theme.colors.text,
    fontSize: 16
  },
  placeholderValue: {
    color: theme.colors.textMuted
  },
  localFieldError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.errorMuted
  },
  localErrorText: {
    color: theme.colors.error
  },
  fieldHint: {
    color: "#6b716f",
    fontSize: 13,
    lineHeight: 17
  },
  pickerTrigger: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#ffffff"
  },
  pickerTriggerOpen: {
    borderColor: "#12622f",
    borderWidth: 1.8
  },
  pickerTriggerDisabled: {
    opacity: 0.55
  },
  pickerValue: {
    minWidth: 0,
    flex: 1,
    color: "#1f2b26",
    fontSize: 16
  },
  pickerChevron: {
    marginRight: 5
  },
  pickerPanel: {
    gap: 12,
    borderWidth: 1.2,
    borderColor: "#e3dfd2",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  calendarNavButton: {
    minWidth: 42,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f0f3e8",
    borderWidth: 1,
    borderColor: "#e3dfd2"
  },
  calendarNavButtonPressed: {
    backgroundColor: "#d8f3dc"
  },
  calendarMonthText: {
    color: "#102e23"
  },
  calendarWeekHeader: {
    flexDirection: "row"
  },
  calendarDayLabelCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4
  },
  calendarDayLabelText: {
    color: "#65706b",
    fontWeight: "700"
  },
  calendarGrid: {
    gap: 6
  },
  calendarWeekRow: {
    flexDirection: "row",
    gap: 6
  },
  calendarDayCell: {
    flex: 1,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#f8faf5"
  },
  calendarDayCellOutsideMonth: {
    backgroundColor: "transparent"
  },
  calendarDayCellDisabled: {
    opacity: 0.32
  },
  calendarDayCellSelected: {
    backgroundColor: "#12622f"
  },
  calendarDayCellPressed: {
    backgroundColor: "#d8f3dc"
  },
  calendarDayTextDisabled: {
    color: theme.colors.textMuted
  },
  calendarDayTextSelected: {
    color: "#ffffff",
    fontWeight: "700"
  },
  timePickerSection: {
    gap: 8
  },
  timeChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  timeChip: {
    minWidth: 52,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e3dfd2",
    backgroundColor: "#f8faf5",
    paddingHorizontal: 10
  },
  timeChipSelected: {
    borderColor: "#12622f",
    backgroundColor: "#12622f"
  },
  timeChipPressed: {
    backgroundColor: "#d8f3dc"
  },
  timeChipTextSelected: {
    color: "#ffffff"
  },
  pickerActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10
  },
  pickerActionButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d8d3c5",
    backgroundColor: "#ffffff",
    paddingHorizontal: 13
  },
  pickerActionButtonPrimary: {
    borderColor: "#12622f",
    backgroundColor: "#12622f"
  },
  pickerActionButtonPressed: {
    opacity: 0.85
  },
  pickerActionButtonPrimaryText: {
    color: "#ffffff"
  },
  observationInput: {
    minHeight: 110,
    borderWidth: 1.3,
    borderColor: "#d8d3c5",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingTop: 12,
    color: theme.colors.text,
    fontSize: 16,
    backgroundColor: "#ffffff"
  },
  subEtapasPanel: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#e3dfd2",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#fbfbf8"
  },
  subEtapasHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12
  },
  subEtapasHeaderCopy: {
    minWidth: 180,
    flex: 1,
    flexShrink: 1
  },
  subEtapasTitle: {
    color: "#073b2a",
    fontSize: 16
  },
  subEtapasSubtitle: {
    color: "#5f6b66"
  },
  percentageInputShell: {
    width: 92,
    maxWidth: "100%",
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "#cfd8c2",
    borderRadius: 12,
    paddingHorizontal: 9,
    backgroundColor: "#ffffff",
    flexShrink: 0
  },
  percentageInput: {
    minWidth: 44,
    paddingVertical: 0,
    textAlign: "right",
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  percentageSymbol: {
    color: "#176b2d",
    fontSize: 16
  },
  sliderArea: {
    minHeight: 122,
    paddingTop: 72
  },
  sliderTrack: {
    height: 8,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#d8d3c5"
  },
  sliderTrackFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#3f8f21"
  },
  sliderThumb: {
    position: "absolute",
    top: -9,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#12622f",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  subEtapaMarker: {
    position: "absolute",
    top: -70,
    alignItems: "center",
    gap: 3
  },
  subEtapaMarkerImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#f0f3e8"
  },
  subEtapaMarkerPercent: {
    color: "#176b2d",
    fontSize: 11,
    fontWeight: "700"
  },
  sliderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10
  },
  sliderBoundText: {
    color: "#65706b"
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(6, 18, 13, 0.48)"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  subEtapaModalCard: {
    gap: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    backgroundColor: "#ffffff"
  },
  subEtapaModalImage: {
    width: "100%",
    height: 210,
    borderRadius: 18,
    backgroundColor: "#f0f3e8"
  },
  subEtapaModalTitle: {
    color: "#073b2a",
    fontSize: 22
  },
  subEtapaModalPercent: {
    color: "#176b2d"
  },
  subEtapaModalDescription: {
    color: "#3e4a45",
    fontSize: 15,
    lineHeight: 23
  },
  modalCloseButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#08643f"
  },
  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 16
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.colors.error
  },
  submitErrorText: {
    color: theme.colors.error
  },
  actions: {
    gap: 12,
    paddingBottom: 8
  },
  continueButton: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#08643f",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 18
  },
  backOutlineButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#08643f",
    backgroundColor: "#ffffff"
  },
  backOutlineButtonText: {
    color: "#08643f",
    fontSize: 17
  },
  disabledButton: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.82
  }
});
