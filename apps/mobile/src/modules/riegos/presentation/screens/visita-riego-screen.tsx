import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { getDatabase } from "../../../../shared/database/connection";
import { theme } from "../../../../shared/constants/theme";
import { downloadAllCatalogs } from "../../../../shared/database/seed-catalogs";
import { toApiError } from "../../../../shared/services";
import {
  ComplianceScoreCard,
  PreviousRecipeSummaryCard,
  StepObservationCard
} from "../../../visita-calificaciones/presentation/components";
import { visitaCalificacionesService } from "../../../visita-calificaciones/services";
import type { RecetaAnterior } from "../../../visita-calificaciones/types";
import { observacionesSanitariasService } from "../../../observaciones-sanitarias/services";
import { riegosService } from "../../services";
import type { TipoRiegoCatalogItem } from "../../types";
import {
  FUENTES_AGUA,
  FUENTE_AGUA_LABELS,
  TIPOS_SUELO,
  TIPO_SUELO_LABELS,
  TIPO_SUELO_DESCRIPTIONS,
  HUMEDADES_SUELO,
  HUMEDAD_SUELO_LABELS,
  HUMEDAD_SUELO_DESCRIPTIONS,
  type FuenteAgua,
  type TipoSuelo,
  type HumedadSuelo
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

const STEP_NUMBER = 5;
const WIZARD_STEPS = [1, 2, 3, 4, 5, 6] as const;

const META_KEYS = {
  fuenteAgua: "riego_fuente_agua_default",
  tipoSuelo: "riego_tipo_suelo_default"
} as const;

export function VisitaRiegoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [tiposRiego, setTiposRiego] = useState<TipoRiegoCatalogItem[]>([]);
  const [selectedTipoRiegoId, setSelectedTipoRiegoId] = useState<string | null>(null);
  const [fuenteAgua, setFuenteAgua] = useState<FuenteAgua | null>(null);
  const [tipoSuelo, setTipoSuelo] = useState<TipoSuelo | null>(null);
  const [humedadSuelo, setHumedadSuelo] = useState<HumedadSuelo | null>(null);
  const [estresHidrico, setEstresHidrico] = useState(false);
  const [scoreValue, setScoreValue] = useState<number | null>(null);
  const [scoreJustificado, setScoreJustificado] = useState<boolean | null>(null);
  const [categoriaJustificacion, setCategoriaJustificacion] = useState<string | null>(null);
  const [motivoJustificacion, setMotivoJustificacion] = useState<string | null>(null);
  const [stepObservation, setStepObservation] = useState("");
  const [recetaAnterior, setRecetaAnterior] = useState<RecetaAnterior | null>(null);

  const [legendSuelo, setLegendSuelo] = useState(false);
  const [legendHumedad, setLegendHumedad] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }

    void loadStep(visitaId);
  }, [visitaId]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
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
          <SafeAreaView edges={["top"]}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Volver"
                accessibilityRole="button"
                onPress={() => goBackToStep3()}
                style={styles.backIconButton}
              >
                <Ionicons color="#ffffff" name="arrow-back" size={24} />
              </Pressable>
              <AppText style={styles.topBarTitle} variant="heading">
                Registro de visita
              </AppText>
            </View>
          </SafeAreaView>

          <View style={styles.heroContent}>
            <AppText style={styles.heroTitle} variant="title">
              Riego
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              Registra la labor de riego y las condiciones del suelo durante la visita a campo.
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <WizardProgress />

          {isLoading ? (
            <AppCard>
              <AppText variant="muted">Cargando...</AppText>
            </AppCard>
          ) : null}

          {!isLoading && error ? (
            <AppCard>
              <AppText variant="heading">No se pudo cargar el paso 5</AppText>
              <AppText variant="muted">{error}</AppText>
              <AppButton
                label="Reintentar"
                onPress={() => {
                  if (visitaId) {
                    void loadStep(visitaId);
                  }
                }}
              />
            </AppCard>
          ) : null}

          {!isLoading && !error && tiposRiego.length === 0 ? (
            <AppEmptyState
              title="Sin tipos de riego"
              message="No hay tipos de riego activos para registrar."
            />
          ) : null}

          {!isLoading && !error && tiposRiego.length > 0 ? (
            <>
              <View style={styles.selectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      color={theme.colors.primaryDark}
                      name="water-outline"
                      size={22}
                    />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <AppText style={styles.sectionTitle} variant="heading">
                      Sistema de riego
                    </AppText>
                    <AppText variant="muted">
                      Selecciona el sistema utilizado durante la visita.
                    </AppText>
                  </View>
                </View>

                <View style={styles.optionList}>
                  {tiposRiego.map((tipoRiego) => (
                    <OptionListItem
                      description={tipoRiego.description}
                      isSelected={selectedTipoRiegoId === tipoRiego.id}
                      key={tipoRiego.id}
                      label={tipoRiego.name}
                      onPress={() => {
                        setSubmitError(null);
                        setSelectedTipoRiegoId(tipoRiego.id);
                      }}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.selectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      color={theme.colors.primaryDark}
                      name="color-filter-outline"
                      size={22}
                    />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <AppText style={styles.sectionTitle} variant="heading">
                      Fuente de agua
                    </AppText>
                    <AppText variant="muted">
                      Origen del agua utilizada en el riego.
                    </AppText>
                  </View>
                </View>

                <View style={styles.optionList}>
                  {FUENTES_AGUA.map((opcion) => {
                    const isSelected = fuenteAgua === opcion;
                    return (
                      <OptionListItem
                        isSelected={isSelected}
                        key={opcion}
                        label={FUENTE_AGUA_LABELS[opcion]}
                        onPress={() => {
                          setSubmitError(null);
                          setFuenteAgua(opcion);
                        }}
                      />
                    );
                  })}
                </View>
              </View>

              <View style={styles.selectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      color={theme.colors.primaryDark}
                      name="earth-outline"
                      size={22}
                    />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <AppText style={styles.sectionTitle} variant="heading">
                      Tipo de suelo
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityLabel="Ver leyenda de tipos de suelo"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setLegendSuelo(true)}
                    style={styles.legendButton}
                  >
                    <Ionicons color={theme.colors.info} name="information-circle-outline" size={24} />
                  </Pressable>
                </View>

                <View style={styles.optionList}>
                  {TIPOS_SUELO.map((opcion) => {
                    const isSelected = tipoSuelo === opcion;
                    return (
                      <OptionListItem
                        isSelected={isSelected}
                        key={opcion}
                        label={TIPO_SUELO_LABELS[opcion]}
                        onPress={() => {
                          setSubmitError(null);
                          setTipoSuelo(opcion);
                        }}
                      />
                    );
                  })}
                </View>
              </View>

              <View style={styles.selectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <Ionicons
                      color={theme.colors.primaryDark}
                      name="water-outline"
                      size={22}
                    />
                  </View>
                  <View style={styles.sectionHeaderText}>
                    <AppText style={styles.sectionTitle} variant="heading">
                      Humedad del suelo
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityLabel="Ver leyenda de humedad del suelo"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => setLegendHumedad(true)}
                    style={styles.legendButton}
                  >
                    <Ionicons color={theme.colors.info} name="information-circle-outline" size={24} />
                  </Pressable>
                </View>

                <View style={styles.optionList}>
                  {HUMEDADES_SUELO.map((opcion) => {
                    const isSelected = humedadSuelo === opcion;
                    return (
                      <OptionListItem
                        isSelected={isSelected}
                        key={opcion}
                        label={HUMEDAD_SUELO_LABELS[opcion]}
                        onPress={() => {
                          setSubmitError(null);
                          setHumedadSuelo(opcion);
                          if (opcion !== "seco") {
                            setEstresHidrico(false);
                          }
                        }}
                      />
                    );
                  })}
                </View>
              </View>

              {humedadSuelo === "seco" ? (
              <View style={styles.switchCard}>
                <View style={styles.switchContent}>
                  <View style={styles.switchTextArea}>
                    <AppText style={styles.switchTitle} variant="heading">
                      Estres hidrico intencionado
                    </AppText>
                    <AppText variant="muted">
                      Marca si la condicion seca corresponde a un estres hidrico planificado.
                    </AppText>
                  </View>
                  <Switch
                    accessibilityLabel="Estres hidrico intencionado"
                    accessibilityRole="switch"
                    ios_backgroundColor={theme.colors.border}
                    onValueChange={(value) => {
                      setSubmitError(null);
                      setEstresHidrico(value);
                    }}
                    thumbColor={estresHidrico ? theme.colors.primaryDark : theme.colors.surface}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primaryMuted
                    }}
                    value={estresHidrico}
                  />
                </View>
                {estresHidrico ? (
                  <View style={styles.stressBadge}>
                    <Ionicons color={theme.colors.warning} name="warning" size={16} />
                    <AppText style={styles.stressBadgeText} variant="caption">
                      Estres hidrico intencionado
                    </AppText>
                  </View>
                ) : null}
              </View>
              ) : null}

              <PreviousRecipeSummaryCard modulo="riego" receta={recetaAnterior} />
              {recetaAnterior?.existe ? (
                <ComplianceScoreCard
                  value={scoreValue}
                  onChange={handleScoreChange}
                  justificado={scoreJustificado}
                  onJustificadoChange={handleJustificadoChange}
                  categoriaJustificacion={categoriaJustificacion}
                  onCategoriaJustificacionChange={setCategoriaJustificacion}
                  motivoJustificacion={motivoJustificacion}
                  onMotivoJustificacionChange={setMotivoJustificacion}
                  observacion={stepObservation}
                  onObservacionChange={setStepObservation}
                />
              ) : (
                <StepObservationCard
                  value={stepObservation}
                  onChange={setStepObservation}
                />
              )}

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
                  disabled={isSaving}
                  onPress={() => {
                    void handleContinue();
                  }}
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed && !isSaving && styles.pressed,
                    isSaving && styles.disabledButton
                  ]}
                >
                  <Ionicons color="#d8f3dc" name="leaf" size={20} />
                  <AppText style={styles.continueButtonText} variant="label">
                    {isSaving ? "Guardando..." : "Continuar"}
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={() => goBackToStep3()}
                  style={({ pressed }) => [
                    styles.backOutlineButton,
                    pressed && !isSaving && styles.pressed,
                    isSaving && styles.disabledButton
                  ]}
                >
                  <AppText style={styles.backOutlineButtonText} variant="label">
                    Volver
                  </AppText>
                </Pressable>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <SueloLegendModal
        onClose={() => setLegendSuelo(false)}
        visible={legendSuelo}
      />
      <HumedadLegendModal
        onClose={() => setLegendHumedad(false)}
        visible={legendHumedad}
      />
    </ScreenContainer>
  );

  async function loadStep(id: string) {
    setIsLoading(true);
    setError(null);
    setSubmitError(null);

    try {
      let nextTiposRiego = await riegosService.getTiposRiego();

      if (nextTiposRiego.length === 0) {
        await downloadAllCatalogs();
        nextTiposRiego = await riegosService.getTiposRiego();
      }

      const existingRiego = await riegosService.getByVisitaId(id);
      const nextStepNote = await observacionesSanitariasService.getStepNote(
        id,
        STEP_NUMBER
      );

      setTiposRiego(nextTiposRiego.filter((tipoRiego) => tipoRiego.isActive));

      if (existingRiego) {
        setSelectedTipoRiegoId(existingRiego.tipoRiegoId);
        setFuenteAgua(existingRiego.fuenteAgua);
        setTipoSuelo(existingRiego.tipoSuelo);
        setHumedadSuelo(existingRiego.humedadSuelo);
        setEstresHidrico(
          existingRiego.humedadSuelo === "seco"
            ? (existingRiego.estresHidrico ?? false)
            : false
        );
      } else {
        loadDefaults();
      }

      const currentCalificacion = visitaCalificacionesService.getByModulo(
        id,
        "riego"
      );
      setScoreValue(currentCalificacion?.puntaje ?? null);
      setScoreJustificado(
        currentCalificacion && currentCalificacion.puntaje < 3
          ? (currentCalificacion.justificado ?? false)
          : null
      );
      setCategoriaJustificacion(currentCalificacion?.categoriaJustificacion ?? null);
      setMotivoJustificacion(currentCalificacion?.motivoJustificacion ?? null);
      setStepObservation(nextStepNote?.observation ?? "");
      try {
        setRecetaAnterior(await visitaCalificacionesService.fetchRecetaAnteriorForVisit(id));
      } catch {
        setRecetaAnterior({ existe: false });
      }
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo cargar riego.");
    } finally {
      setIsLoading(false);
    }
  }

  function loadDefaults() {
    try {
      const db = getDatabase();
      const row = db.getFirstSync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
        META_KEYS.fuenteAgua
      );
      if (row?.value && FUENTES_AGUA.includes(row.value as FuenteAgua)) {
        setFuenteAgua(row.value as FuenteAgua);
      }

      const sueloRow = db.getFirstSync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
        META_KEYS.tipoSuelo
      );
      if (sueloRow?.value && TIPOS_SUELO.includes(sueloRow.value as TipoSuelo)) {
        setTipoSuelo(sueloRow.value as TipoSuelo);
      }
    } catch {
      // defaults not available, user will pick manually
    }
  }

  function persistDefaults() {
    try {
      const db = getDatabase();
      if (fuenteAgua) {
        db.runSync(
          "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
          META_KEYS.fuenteAgua,
          fuenteAgua
        );
      }
      if (tipoSuelo) {
        db.runSync(
          "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
          META_KEYS.tipoSuelo,
          tipoSuelo
        );
      }
    } catch {
      // non-critical, ignore persistence errors
    }
  }

  function goBackToStep3() {
    if (!visitaId) {
      router.back();
      return;
    }

    router.replace({
      pathname: "/visitas-campo/[id]/nutricion",
      params: { id: visitaId }
    });
  }

  function handleScoreChange(value: number) {
    setSubmitError(null);
    setScoreValue(value);

    if (value === 3) {
      setScoreJustificado(null);
      setCategoriaJustificacion(null);
      setMotivoJustificacion(null);
      return;
    }

    setScoreJustificado((currentValue) => currentValue ?? false);
  }

  function handleJustificadoChange(value: boolean) {
    setSubmitError(null);
    setScoreJustificado(value);

    if (!value) {
      setCategoriaJustificacion(null);
      setMotivoJustificacion(null);
    }
  }

  async function handleContinue() {
    if (!visitaId) {
      setSubmitError("No se encontro una visita valida.");
      return;
    }

    if (!selectedTipoRiegoId) {
      setSubmitError("Selecciona un tipo de riego.");
      return;
    }

    if (!fuenteAgua) {
      setSubmitError("Selecciona una fuente de agua.");
      return;
    }

    if (!tipoSuelo) {
      setSubmitError("Selecciona un tipo de suelo.");
      return;
    }

    if (!humedadSuelo) {
      setSubmitError("Selecciona la humedad del suelo.");
      return;
    }

    const shouldScore = recetaAnterior?.existe === true;

    if (shouldScore && scoreValue === null) {
      setSubmitError("Selecciona un puntaje de cumplimiento para riego.");
      return;
    }

    if (
      shouldScore &&
      scoreValue !== null &&
      scoreValue < 3 &&
      scoreJustificado === true &&
      (!categoriaJustificacion || !motivoJustificacion)
    ) {
      setSubmitError("Selecciona categoria y motivo de justificacion.");
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      persistDefaults();
      await riegosService.saveSelection(visitaId, {
        tipoRiegoId: selectedTipoRiegoId,
        fuenteAgua,
        tipoSuelo,
        humedadSuelo,
        estresHidrico: humedadSuelo === "seco" ? estresHidrico : false
      });
      if (shouldScore) {
        await visitaCalificacionesService.upsert(visitaId, {
          modulo: "riego",
          puntaje: scoreValue ?? 3,
          observacion: stepObservation.trim() || null,
          justificado: resolveJustificado(scoreValue ?? 3, scoreJustificado),
          categoriaJustificacion:
            scoreJustificado === true ? categoriaJustificacion : null,
          motivoJustificacion: scoreJustificado === true ? motivoJustificacion : null
        });
      }
      await observacionesSanitariasService.upsertStepNote(visitaId, STEP_NUMBER, {
        observation: stepObservation.trim() || null
      });
      router.replace({
        pathname: "/visitas-campo/[id]/labores-culturales",
        params: { id: visitaId }
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 5.");
    } finally {
      setIsSaving(false);
    }
  }
}

function OptionListItem({
  description,
  isSelected,
  label,
  onPress
}: {
  description?: string | null;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        isSelected && styles.optionRowSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={[styles.radioIndicator, isSelected && styles.radioIndicatorSelected]}>
        {isSelected ? <View style={styles.radioIndicatorDot} /> : null}
      </View>
      <View style={styles.optionRowCopy}>
        <AppText
          style={[styles.optionRowTitle, isSelected && styles.optionRowTitleSelected]}
          variant="label"
        >
          {label}
        </AppText>
        {description ? (
          <AppText style={styles.optionRowDescription} variant="muted">
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

function WizardProgress() {
  return (
    <View style={styles.progressCard}>
      <AppText style={styles.progressLabel} variant="label">
        Paso {STEP_NUMBER} de {WIZARD_STEPS.length}
      </AppText>
      <View style={styles.progressSteps}>
        {WIZARD_STEPS.map((step) => {
          const isActive = step === STEP_NUMBER;
          const isComplete = step < STEP_NUMBER;

          return (
            <View key={step} style={styles.progressStepItem}>
              <View
                style={[
                  styles.progressCircle,
                  isActive && styles.progressCircleActive,
                  isComplete && styles.progressCircleComplete
                ]}
              >
                {isComplete ? (
                  <Ionicons color="#ffffff" name="checkmark" size={15} />
                ) : (
                  <AppText
                    style={[
                      styles.progressCircleText,
                      isActive && styles.progressCircleTextActive
                    ]}
                    variant="caption"
                  >
                    {step}
                  </AppText>
                )}
              </View>
              {isActive ? <View style={styles.progressActiveBar} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function SueloLegendModal({
  onClose,
  visible
}: {
  onClose: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.legendModalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              Tipos de suelo
            </AppText>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons color={theme.colors.primaryDark} name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView style={styles.legendScroll}>
            {TIPOS_SUELO.map((opt) => (
              <View key={opt} style={styles.legendItem}>
                <AppText style={styles.legendItemTitle} variant="label">
                  {TIPO_SUELO_LABELS[opt]}
                </AppText>
                <AppText variant="muted">{TIPO_SUELO_DESCRIPTIONS[opt]}</AppText>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function HumedadLegendModal({
  onClose,
  visible
}: {
  onClose: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.legendModalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              Humedad del suelo
            </AppText>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons color={theme.colors.primaryDark} name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView style={styles.legendScroll}>
            {HUMEDADES_SUELO.map((opt) => (
              <View key={opt} style={styles.legendItem}>
                <AppText style={styles.legendItemTitle} variant="label">
                  {HUMEDAD_SUELO_LABELS[opt]}
                </AppText>
                <AppText variant="muted">{HUMEDAD_SUELO_DESCRIPTIONS[opt]}</AppText>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function resolveJustificado(score: number, justificado: boolean | null) {
  return score === 3 ? null : (justificado ?? false);
}

const styles = StyleSheet.create({
  actions: {
    gap: 10
  },
  backIconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  backOutlineButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50
  },
  backOutlineButtonText: {
    color: theme.colors.primaryDark,
    fontSize: 17
  },
  body: {
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54
  },
  continueButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18
  },
  disabledButton: {
    opacity: 0.55
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: 12
  },
  hero: {
    minHeight: 300
  },
  heroContent: {
    gap: 10,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 40
  },
  heroImage: {
    opacity: 0.82
  },
  heroSubtitle: {
    color: "#173f2d",
    maxWidth: 320
  },
  heroTitle: {
    color: theme.colors.primaryDark,
    fontSize: 40,
    lineHeight: 46,
    maxWidth: 300
  },
  legendButton: {
    alignItems: "center",
    borderColor: theme.colors.info,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  legendItem: {
    borderBottomColor: theme.colors.borderLight,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: 14,
    paddingTop: 14
  },
  legendItemTitle: {
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  legendModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 12,
    maxHeight: "70%",
    padding: 18,
    width: "90%"
  },
  legendScroll: {
    maxHeight: 400
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8, 31, 20, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  modalCloseButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  modalTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 21
  },
  optionList: {
    gap: 10
  },
  optionRow: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  optionRowCopy: {
    flex: 1,
    gap: 2
  },
  optionRowDescription: {
    fontSize: 12,
    lineHeight: 17
  },
  optionRowSelected: {
    backgroundColor: "#f0fdf4",
    borderColor: theme.colors.primaryDark,
    borderWidth: 1.5,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3
  },
  optionRowTitle: {
    color: theme.colors.textMuted,
    fontSize: 15
  },
  optionRowTitleSelected: {
    color: theme.colors.primaryDark
  },
  radioIndicator: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  radioIndicatorDot: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full,
    height: 10,
    width: 10
  },
  radioIndicatorSelected: {
    borderColor: theme.colors.primaryDark
  },
  pressed: {
    opacity: 0.72
  },
  progressActiveBar: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    height: 5,
    marginTop: 8,
    width: 48
  },
  progressCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    ...theme.shadow.md
  },
  progressCircle: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  progressCircleActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  progressCircleComplete: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primaryLight
  },
  progressCircleText: {
    color: theme.colors.textMuted,
    fontSize: 15
  },
  progressCircleTextActive: {
    color: theme.colors.textInverse
  },
  progressLabel: {
    color: theme.colors.primaryDark,
    fontSize: 17
  },
  progressStepItem: {
    alignItems: "center",
    minWidth: 38
  },
  progressSteps: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  scrollContent: {
    paddingBottom: 24
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  sectionHeaderText: {
    flex: 1,
    gap: 3
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: theme.radius.full,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  sectionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 21
  },
  selectionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 18,
    padding: 16,
    ...theme.shadow.sm
  },
  stressBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  stressBadgeText: {
    color: theme.colors.warning
  },
  submitErrorText: {
    color: theme.colors.error
  },
  switchCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: 16,
    ...theme.shadow.sm
  },
  switchContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between"
  },
  switchTextArea: {
    flex: 1,
    gap: 3
  },
  switchTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  topBarTitle: {
    color: theme.colors.textInverse,
    fontSize: 22
  }
});
