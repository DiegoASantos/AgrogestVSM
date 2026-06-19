import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  useWindowDimensions,
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

const STEP_NUMBER = 4;
const WIZARD_STEPS = [1, 2, 3, 4, 5] as const;

const META_KEYS = {
  fuenteAgua: "riego_fuente_agua_default",
  tipoSuelo: "riego_tipo_suelo_default"
} as const;

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export function VisitaRiegoScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);
  const isCompactLayout = width < 460;

  const [tiposRiego, setTiposRiego] = useState<TipoRiegoCatalogItem[]>([]);
  const [selectedTipoRiegoId, setSelectedTipoRiegoId] = useState<string | null>(null);
  const [fuenteAgua, setFuenteAgua] = useState<FuenteAgua | null>(null);
  const [tipoSuelo, setTipoSuelo] = useState<TipoSuelo | null>(null);
  const [humedadSuelo, setHumedadSuelo] = useState<HumedadSuelo | null>(null);
  const [estresHidrico, setEstresHidrico] = useState(false);

  const [helpItem, setHelpItem] = useState<TipoRiegoCatalogItem | null>(null);
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
              <AppText variant="heading">No se pudo cargar el paso 4</AppText>
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
                      Labor de riego
                    </AppText>
                    <AppText variant="muted">
                      Selecciona el tipo de riego aplicado.
                    </AppText>
                  </View>
                </View>

                <View style={styles.optionGrid}>
                  {tiposRiego.map((tipoRiego) => (
                    <CatalogOptionCard
                      iconName={getRiegoIcon(tipoRiego.name)}
                      isCompactLayout={isCompactLayout}
                      isSelected={selectedTipoRiegoId === tipoRiego.id}
                      item={tipoRiego}
                      key={tipoRiego.id}
                      onHelpPress={setHelpItem}
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

                <View style={styles.radioRow}>
                  {FUENTES_AGUA.map((opcion) => {
                    const isSelected = fuenteAgua === opcion;
                    return (
                      <Pressable
                        accessibilityLabel={FUENTE_AGUA_LABELS[opcion]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        key={opcion}
                        onPress={() => {
                          setSubmitError(null);
                          setFuenteAgua(opcion);
                        }}
                        style={({ pressed }) => [
                          styles.radioCard,
                          isSelected && styles.radioCardSelected,
                          pressed && styles.pressed
                        ]}
                      >
                        <Ionicons
                          color={isSelected ? theme.colors.primaryDark : theme.colors.textMuted}
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={20}
                        />
                        <AppText
                          style={[
                            styles.radioLabel,
                            isSelected && styles.radioLabelSelected
                          ]}
                          variant="label"
                        >
                          {FUENTE_AGUA_LABELS[opcion]}
                        </AppText>
                      </Pressable>
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

                <View style={styles.optionGrid}>
                  {TIPOS_SUELO.map((opcion) => {
                    const isSelected = tipoSuelo === opcion;
                    return (
                      <Pressable
                        accessibilityLabel={TIPO_SUELO_LABELS[opcion]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        key={opcion}
                        onPress={() => {
                          setSubmitError(null);
                          setTipoSuelo(opcion);
                        }}
                        style={({ pressed }) => [
                          styles.selectCard,
                          isCompactLayout && styles.selectCardCompact,
                          isSelected && styles.selectCardSelected,
                          pressed && styles.pressed
                        ]}
                      >
                        <AppText
                          style={[
                            styles.selectCardLabel,
                            isSelected && styles.selectCardLabelSelected
                          ]}
                          variant="label"
                        >
                          {TIPO_SUELO_LABELS[opcion]}
                        </AppText>
                      </Pressable>
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

                <View style={styles.optionGrid}>
                  {HUMEDADES_SUELO.map((opcion) => {
                    const isSelected = humedadSuelo === opcion;
                    return (
                      <Pressable
                        accessibilityLabel={HUMEDAD_SUELO_LABELS[opcion]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        key={opcion}
                        onPress={() => {
                          setSubmitError(null);
                          setHumedadSuelo(opcion);
                        }}
                        style={({ pressed }) => [
                          styles.selectCard,
                          isCompactLayout && styles.selectCardCompact,
                          isSelected && styles.selectCardSelected,
                          pressed && styles.pressed
                        ]}
                      >
                        <AppText
                          style={[
                            styles.selectCardLabel,
                            isSelected && styles.selectCardLabelSelected
                          ]}
                          variant="label"
                        >
                          {HUMEDAD_SUELO_LABELS[opcion]}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.switchCard}>
                <View style={styles.switchContent}>
                  <View style={styles.switchTextArea}>
                    <AppText style={styles.switchTitle} variant="heading">
                      Estres hidrico
                    </AppText>
                    <AppText variant="muted">
                      Indica si el cultivo presenta signos de estres por falta de agua.
                    </AppText>
                  </View>
                  <Switch
                    accessibilityLabel="Estres hidrico"
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
                      Estres hidrico presente
                    </AppText>
                  </View>
                ) : null}
              </View>

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

      <HelpModal item={helpItem} onClose={() => setHelpItem(null)} />
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

      setTiposRiego(nextTiposRiego.filter((tipoRiego) => tipoRiego.isActive));

      if (existingRiego) {
        setSelectedTipoRiegoId(existingRiego.tipoRiegoId);
        setFuenteAgua(existingRiego.fuenteAgua);
        setTipoSuelo(existingRiego.tipoSuelo);
        setHumedadSuelo(existingRiego.humedadSuelo);
        setEstresHidrico(existingRiego.estresHidrico ?? false);
      } else {
        loadDefaults();
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

    setIsSaving(true);
    setSubmitError(null);

    try {
      persistDefaults();
      await riegosService.saveSelection(visitaId, {
        tipoRiegoId: selectedTipoRiegoId,
        fuenteAgua,
        tipoSuelo,
        humedadSuelo,
        estresHidrico
      });
      router.replace({
        pathname: "/visitas-campo/[id]/labores-culturales",
        params: { id: visitaId }
      });
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setSubmitError(apiError.message || "No se pudo guardar el paso 4.");
    } finally {
      setIsSaving(false);
    }
  }
}

function CatalogOptionCard({
  iconName,
  isCompactLayout,
  isSelected,
  item,
  onHelpPress,
  onPress
}: {
  iconName: IoniconName;
  isCompactLayout: boolean;
  isSelected: boolean;
  item: TipoRiegoCatalogItem;
  onHelpPress: (item: TipoRiegoCatalogItem) => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={item.name}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionCard,
        isCompactLayout && styles.optionCardCompact,
        isSelected && styles.optionCardSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.iconTile}>
        <Ionicons color="#008ce3" name={iconName} size={38} />
      </View>
      <AppText style={styles.optionTitle} variant="label">
        {item.name}
      </AppText>
      <Pressable
        accessibilityLabel={`Ver descripcion de ${item.name}`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onHelpPress(item)}
        style={styles.helpButton}
      >
        <Ionicons color={theme.colors.primaryDark} name="help" size={22} />
      </Pressable>
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

function HelpModal({
  item,
  onClose
}: {
  item: TipoRiegoCatalogItem | null;
  onClose: () => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.helpModalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              {item.name}
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
          <AppText variant="muted">
            {item.description || "Sin descripcion registrada."}
          </AppText>
        </View>
      </View>
    </Modal>
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

function getRiegoIcon(name: string): IoniconName {
  const normalizedName = normalizeCatalogName(name);

  if (normalizedName.includes("inundacion")) return "water";
  if (normalizedName.includes("goteo")) return "ellipsis-horizontal-circle";
  if (normalizedName.includes("aspersion")) return "rainy";
  if (normalizedName.includes("micro")) return "water-outline";
  if (normalizedName.includes("agoste")) return "calendar-outline";
  if (normalizedName.includes("ruptura")) return "leaf-outline";

  return "water-outline";
}

function normalizeCatalogName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
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
  helpButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 16,
    width: 40
  },
  helpModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 12,
    padding: 18,
    width: "88%"
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
  iconTile: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: 14,
    height: 70,
    justifyContent: "center",
    width: 70
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
  optionCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexBasis: "48%",
    gap: 14,
    justifyContent: "center",
    minHeight: 190,
    padding: 18,
    position: "relative"
  },
  optionCardCompact: {
    flexBasis: "100%"
  },
  optionCardSelected: {
    backgroundColor: "#fbfdf7",
    borderColor: theme.colors.primaryDark,
    borderWidth: 2
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  optionTitle: {
    color: "#0d1739",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center"
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
  radioCard: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10
  },
  radioCardSelected: {
    backgroundColor: "#fbfdf7",
    borderColor: theme.colors.primaryDark,
    borderWidth: 2
  },
  radioLabel: {
    color: theme.colors.textMuted,
    fontSize: 13
  },
  radioLabelSelected: {
    color: theme.colors.primaryDark
  },
  radioRow: {
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
  selectCard: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexBasis: "48%",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  selectCardCompact: {
    flexBasis: "100%"
  },
  selectCardLabel: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center"
  },
  selectCardLabelSelected: {
    color: theme.colors.primaryDark
  },
  selectCardSelected: {
    backgroundColor: "#fbfdf7",
    borderColor: theme.colors.primaryDark,
    borderWidth: 2
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
