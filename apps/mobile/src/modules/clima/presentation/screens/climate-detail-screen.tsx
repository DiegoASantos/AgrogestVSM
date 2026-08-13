import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { useIsOnline } from "../../../../shared/connectivity/use-is-online";
import { climaCacheRepository } from "../../repositories/clima-cache.repository";
import { weatherLinkStationCacheRepository } from "../../repositories/weatherlink-station-cache.repository";
import { climaService } from "../../services/clima.service";
import {
  climateDistricts,
  type ClimateDistrictCode,
  type ClimateLoadResult,
  type WeatherLinkStation,
  type WeatherLinkStationsLoadResult
} from "../../types/clima.types";

type ClimateTab = "estimate" | "station";

export function ClimateDetailScreen() {
  const { isOnline } = useIsOnline();
  const [activeTab, setActiveTab] = useState<ClimateTab>("estimate");

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <AppText style={styles.title} variant="title">
            Clima del campo
          </AppText>
          <AppText style={styles.subtitle} variant="body">
            Consulta una estimación territorial o la última lectura observada por una
            estación Davis.
          </AppText>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          <TabButton
            active={activeTab === "estimate"}
            icon="partly-sunny-outline"
            label="Estimación"
            onPress={() => setActiveTab("estimate")}
          />
          <TabButton
            active={activeTab === "station"}
            icon="speedometer-outline"
            label="Estación Davis"
            onPress={() => setActiveTab("station")}
          />
        </View>

        {activeTab === "estimate" ? (
          <DistrictEstimateDetail isOnline={isOnline} />
        ) : (
          <WeatherLinkStationDetail isOnline={isOnline} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  icon,
  label,
  onPress
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        active && styles.tabActive,
        pressed && styles.pressed
      ]}
    >
      <Ionicons
        color={active ? theme.colors.primary : theme.colors.textMuted}
        name={icon}
        size={19}
      />
      <AppText style={[styles.tabText, active && styles.tabTextActive]} variant="label">
        {label}
      </AppText>
    </Pressable>
  );
}

function DistrictEstimateDetail({ isOnline }: { isOnline: boolean }) {
  const [districtCode, setDistrictCode] = useState<ClimateDistrictCode | null>(null);
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [result, setResult] = useState<ClimateLoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const district = climateDistricts.find((item) => item.code === districtCode) ?? null;

  useEffect(() => {
    const saved = climaCacheRepository.getSelectedDistrictCode();
    if (isClimateDistrictCode(saved)) setDistrictCode(saved);
  }, []);

  useEffect(() => {
    if (!districtCode) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    void climaService
      .getForDistrict(districtCode, isOnline)
      .then((next) => active && setResult(next))
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "No se pudo cargar la estimación."
          );
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [districtCode, isOnline]);

  function selectDistrict(next: ClimateDistrictCode) {
    climaCacheRepository.saveSelectedDistrictCode(next);
    setDistrictCode(next);
    setIsSelectorVisible(false);
  }

  return (
    <View style={styles.panel}>
      <SectionHeading
        icon="partly-sunny-outline"
        subtitle="Estimación territorial de Open-Meteo; no es una lectura de estación ni de predio."
        title="Estimación meteorológica"
      />
      <SelectButton
        accessibilityLabel="Elegir distrito climático"
        label={district?.name ?? "Seleccionar distrito"}
        onPress={() => setIsSelectorVisible(true)}
      />

      {!district ? (
        <EmptyState message="Selecciona uno de los cuatro distritos para consultar la estimación." />
      ) : null}
      {district && isLoading ? <LoadingState label="Actualizando estimación..." /> : null}
      {district && !isLoading && error ? <EmptyState message={error} /> : null}
      {district && !isLoading && result ? <EstimateContent result={result} /> : null}

      <SelectorModal
        onClose={() => setIsSelectorVisible(false)}
        title="Distrito climático"
        visible={isSelectorVisible}
      >
        {climateDistricts.map((item) => (
          <SelectorOption
            key={item.code}
            label={item.name}
            onPress={() => selectDistrict(item.code)}
            selected={item.code === districtCode}
          />
        ))}
      </SelectorModal>
    </View>
  );
}

function WeatherLinkStationDetail({ isOnline }: { isOnline: boolean }) {
  const [result, setResult] = useState<WeatherLinkStationsLoadResult | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedStation =
    result?.stations.find((station) => station.id === selectedStationId) ?? null;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    void climaService
      .getWeatherLinkStations(isOnline)
      .then((next) => {
        if (!active) return;
        setResult(next);
        const saved = weatherLinkStationCacheRepository.getSelectedStationId();
        const initial =
          next.stations.find((station) => station.id === saved) ?? next.stations[0];
        setSelectedStationId(initial?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las estaciones Davis."
          );
      })
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [isOnline]);

  function selectStation(station: WeatherLinkStation) {
    weatherLinkStationCacheRepository.saveSelectedStationId(station.id);
    setSelectedStationId(station.id);
    setIsSelectorVisible(false);
  }

  return (
    <View style={styles.panel}>
      <SectionHeading
        icon="speedometer-outline"
        subtitle="Observaciones persistidas por WeatherLink Davis; selecciona una estación, no un distrito."
        title="Estación Davis"
      />
      {isLoading ? <LoadingState label="Consultando estaciones Davis..." /> : null}
      {!isLoading && error ? <EmptyState message={error} /> : null}
      {!isLoading && result && result.stations.length === 0 ? (
        <EmptyState message="No hay estaciones Davis activas disponibles." />
      ) : null}
      {!isLoading && selectedStation && result ? (
        <>
          <SelectButton
            accessibilityLabel="Elegir estación Davis"
            label={selectedStation.name}
            onPress={() => setIsSelectorVisible(true)}
          />
          <StationContent result={result} station={selectedStation} />
        </>
      ) : null}

      <SelectorModal
        onClose={() => setIsSelectorVisible(false)}
        title="Estación Davis"
        visible={isSelectorVisible}
      >
        {(result?.stations ?? []).map((station) => (
          <SelectorOption
            key={station.id}
            label={station.name}
            onPress={() => selectStation(station)}
            selected={station.id === selectedStationId}
          />
        ))}
      </SelectorModal>
    </View>
  );
}

function SectionHeading({
  icon,
  subtitle,
  title
}: {
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}>
        <Ionicons color={theme.colors.primary} name={icon} size={23} />
      </View>
      <View style={styles.sectionCopy}>
        <AppText style={styles.sectionTitle} variant="heading">
          {title}
        </AppText>
        <AppText style={styles.sectionSubtitle} variant="caption">
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

function SelectButton({
  accessibilityLabel,
  label,
  onPress
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
    >
      <AppText numberOfLines={1} style={styles.selectorText} variant="label">
        {label}
      </AppText>
      <Ionicons color={theme.colors.primary} name="chevron-down" size={20} />
    </Pressable>
  );
}

function EstimateContent({ result }: { result: ClimateLoadResult }) {
  const { climate } = result;
  return (
    <View style={styles.detailContent}>
      <SourceStatus
        cached={result.isCached}
        stale={result.isStale}
        text={
          result.isStale
            ? "Estimación guardada; requiere actualización"
            : result.isCached
              ? "Estimación guardada para uso sin conexión"
              : `Open-Meteo · ${climate.district.name}`
        }
      />
      <MetricGrid
        items={[
          [
            "thermometer-outline",
            "Temperatura",
            format(climate.current.temperatureC, "°C")
          ],
          [
            "water-outline",
            "Humedad",
            format(climate.current.relativeHumidityPercent, "%")
          ],
          [
            "rainy-outline",
            "Lluvia actual",
            format(climate.current.precipitationMm, " mm")
          ],
          ["speedometer-outline", "Viento", format(climate.current.windSpeedKmh, " km/h")]
        ]}
      />
      <AppText style={styles.groupTitle} variant="label">
        Variables para campo
      </AppText>
      <View style={styles.fieldGrid}>
        <FieldMetric
          label="Lluvia 24 h"
          value={format(climate.field.rainfallLast24hMm, " mm")}
        />
        <FieldMetric label="ET₀ hoy" value={format(climate.field.et0TodayMm, " mm")} />
        <FieldMetric
          label="Humedad suelo 3–9 cm"
          value={formatPercent(climate.field.soilMoisture3To9cmM3M3)}
        />
      </View>
      <AppText style={styles.groupTitle} variant="label">
        Pronóstico de 7 días
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.forecastRow}
      >
        {climate.forecast.map((day) => (
          <View key={day.date} style={styles.day}>
            <AppText style={styles.dayDate} variant="label">
              {formatDay(day.date)}
            </AppText>
            <Ionicons
              color={theme.colors.info}
              name={weatherIcon(day.weatherCode)}
              size={22}
            />
            <AppText style={styles.dayTemperature} variant="label">
              {format(day.temperatureMaxC, "°")} / {format(day.temperatureMinC, "°")}
            </AppText>
            <AppText style={styles.dayMeta} variant="caption">
              {format(day.precipitationMm, " mm")}
            </AppText>
            <AppText style={styles.dayMeta} variant="caption">
              ET₀ {format(day.et0Mm, " mm")}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <AppText style={styles.disclaimer} variant="caption">
        Actualizado: {formatDateTime(climate.source.fetchedAt)}.
      </AppText>
    </View>
  );
}

function StationContent({
  result,
  station
}: {
  result: WeatherLinkStationsLoadResult;
  station: WeatherLinkStation;
}) {
  const latestAt = station.current.reduce<string | null>((latest, reading) => {
    if (!latest || new Date(reading.dataAt).getTime() > new Date(latest).getTime())
      return reading.dataAt;
    return latest;
  }, null);

  return (
    <View style={styles.detailContent}>
      <SourceStatus
        cached={result.isCached}
        stale={result.isStale}
        text={
          result.isStale
            ? "Lecturas guardadas; requieren actualización"
            : result.isCached
              ? "Última consulta guardada para uso sin conexión"
              : "WeatherLink Davis · lectura observada"
        }
      />
      <View style={styles.stationMetadata}>
        <MetadataRow
          icon="radio-outline"
          label="Estado"
          value={formatStationStatus(station.syncStatus)}
        />
        <MetadataRow
          icon="time-outline"
          label="Última lectura"
          value={latestAt ? formatDateTime(latestAt) : "Sin lecturas disponibles"}
        />
        {station.lastCommunicationAt ? (
          <MetadataRow
            icon="cellular-outline"
            label="Última comunicación"
            value={formatDateTime(station.lastCommunicationAt)}
          />
        ) : null}
      </View>
      {station.current.length === 0 ? (
        <EmptyState message="Esta estación aún no tiene lecturas disponibles." />
      ) : (
        <>
          <AppText style={styles.groupTitle} variant="label">
            Última lectura por variable
          </AppText>
          <MetricGrid
            items={station.current.map((reading) => [
              stationIcon(reading.variable),
              stationVariableLabel(reading.variable),
              `${round(reading.value)} ${reading.unit}`
            ])}
          />
        </>
      )}
    </View>
  );
}

function SourceStatus({
  cached,
  stale,
  text
}: {
  cached: boolean;
  stale: boolean;
  text: string;
}) {
  return (
    <View style={styles.sourceStatus}>
      <Ionicons
        color={stale ? theme.colors.warning : theme.colors.primary}
        name={cached ? "cloud-offline-outline" : "cloud-outline"}
        size={16}
      />
      <AppText style={[styles.sourceText, stale && styles.staleText]} variant="caption">
        {text}
      </AppText>
    </View>
  );
}

function MetricGrid({
  items
}: {
  items: Array<[keyof typeof Ionicons.glyphMap, string, string]>;
}) {
  return (
    <View style={styles.metricGrid}>
      {items.map(([icon, label, value]) => (
        <View key={label} style={styles.metric}>
          <Ionicons color={theme.colors.info} name={icon} size={20} />
          <AppText style={styles.metricValue} variant="label">
            {value}
          </AppText>
          <AppText style={styles.metricLabel} variant="caption">
            {label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function FieldMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldMetric}>
      <AppText style={styles.fieldValue} variant="label">
        {value}
      </AppText>
      <AppText style={styles.fieldLabel} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

function MetadataRow({
  icon,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metadataRow}>
      <Ionicons color={theme.colors.primary} name={icon} size={18} />
      <View style={styles.metadataCopy}>
        <AppText style={styles.metadataLabel} variant="caption">
          {label}
        </AppText>
        <AppText style={styles.metadataValue} variant="label">
          {value}
        </AppText>
      </View>
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={theme.colors.primary} />
      <AppText style={styles.loadingText} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons color={theme.colors.textMuted} name="cloud-offline-outline" size={26} />
      <AppText style={styles.emptyText} variant="caption">
        {message}
      </AppText>
    </View>
  );
}

function SelectorModal({
  children,
  onClose,
  title,
  visible
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              {title}
            </AppText>
            <Pressable
              accessibilityLabel="Cerrar selector"
              accessibilityRole="button"
              onPress={onClose}
            >
              <Ionicons color={theme.colors.textMuted} name="close" size={24} />
            </Pressable>
          </View>
          <ScrollView>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectorOption({
  label,
  onPress,
  selected
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed
      ]}
    >
      <AppText style={styles.optionText} variant="label">
        {label}
      </AppText>
      {selected ? (
        <Ionicons color={theme.colors.primary} name="checkmark-circle" size={21} />
      ) : null}
    </Pressable>
  );
}

function isClimateDistrictCode(value: string | null): value is ClimateDistrictCode {
  return climateDistricts.some((district) => district.code === value);
}

function format(value: number | null, unit: string) {
  return value === null ? "—" : `${round(value)}${unit}`;
}

function round(value: number) {
  return String(Math.round(value * 10) / 10);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)} %`;
}

function formatDay(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-PE", { weekday: "short", day: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("es-PE", {
        hour: "numeric",
        minute: "2-digit",
        day: "numeric",
        month: "short"
      });
}

function weatherIcon(code: number | null): keyof typeof Ionicons.glyphMap {
  if (code !== null && code >= 51) return "rainy-outline";
  if (code !== null && code <= 1) return "sunny-outline";
  return "partly-sunny-outline";
}

function stationIcon(variable: string): keyof typeof Ionicons.glyphMap {
  if (variable.includes("humidity") || variable.includes("moisture"))
    return "water-outline";
  if (variable.includes("rain") || variable.includes("precipitation"))
    return "rainy-outline";
  if (variable.includes("wind")) return "speedometer-outline";
  if (variable.includes("temperature") || variable.includes("dew"))
    return "thermometer-outline";
  if (variable.includes("radiation") || variable.includes("uv")) return "sunny-outline";
  return "analytics-outline";
}

function stationVariableLabel(variable: string) {
  const labels: Record<string, string> = {
    temperature_2m: "Temperatura",
    relative_humidity_2m: "Humedad",
    dew_point_2m: "Punto de rocío",
    precipitation: "Lluvia",
    precipitation_rate: "Intensidad de lluvia",
    wind_speed_10m: "Viento",
    wind_gusts_10m: "Ráfagas",
    wind_direction_10m: "Dirección de viento",
    surface_pressure: "Presión",
    shortwave_radiation: "Radiación solar",
    uv_index: "Índice UV",
    et0_fao_evapotranspiration: "Evapotranspiración"
  };
  if (variable.startsWith("soil_moisture_")) return "Humedad de suelo";
  if (variable.startsWith("soil_temperature_")) return "Temperatura de suelo";
  if (variable.startsWith("leaf_wetness_")) return "Humedad foliar";
  return labels[variable] ?? variable.replaceAll("_", " ");
}

function formatStationStatus(status: string | null) {
  if (status === "ERROR") return "Con incidencias";
  if (status === "SINCRONIZANDO") return "Actualizando";
  if (status === "COMPLETADA") return "Actualizada";
  return status ? status.replaceAll("_", " ") : "Sin estado";
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl
  },
  intro: { gap: theme.spacing.xs },
  title: { color: theme.colors.primaryDark },
  subtitle: { color: theme.colors.textMuted },
  tabs: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: 4,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated
  },
  tab: {
    minHeight: 44,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: theme.radius.sm
  },
  tabActive: { backgroundColor: theme.colors.primaryMuted },
  tabText: { color: theme.colors.textMuted, fontSize: 13 },
  tabTextActive: { color: theme.colors.primaryDark },
  panel: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.sm
  },
  sectionHeading: { flexDirection: "row", gap: theme.spacing.sm },
  sectionIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primaryMuted
  },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { color: theme.colors.primaryDark },
  sectionSubtitle: { color: theme.colors.textMuted },
  selector: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated
  },
  selectorText: { flex: 1, color: theme.colors.primaryDark },
  loading: {
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm
  },
  loadingText: { color: theme.colors.textMuted },
  empty: {
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg
  },
  emptyText: { color: theme.colors.textMuted, textAlign: "center" },
  detailContent: { gap: theme.spacing.md },
  sourceStatus: { flexDirection: "row", alignItems: "center", gap: 6 },
  sourceText: { flex: 1, color: theme.colors.primary },
  staleText: { color: "#a95f00" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  metric: {
    width: "48%",
    gap: 3,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.infoMuted
  },
  metricValue: { color: theme.colors.primaryDark },
  metricLabel: { color: theme.colors.textMuted },
  groupTitle: { color: theme.colors.primaryDark, marginTop: 2 },
  fieldGrid: { flexDirection: "row", gap: theme.spacing.sm },
  fieldMetric: {
    minWidth: 0,
    flex: 1,
    gap: 3,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primaryLight,
    backgroundColor: theme.colors.surfaceElevated
  },
  fieldValue: { color: theme.colors.primaryDark, fontSize: 13 },
  fieldLabel: { color: theme.colors.textMuted, fontSize: 10 },
  forecastRow: { gap: theme.spacing.sm, paddingRight: theme.spacing.sm },
  day: {
    width: 112,
    gap: 6,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.infoMuted
  },
  dayDate: { color: theme.colors.primaryDark, textTransform: "capitalize" },
  dayTemperature: { color: theme.colors.primaryDark },
  dayMeta: { color: theme.colors.textMuted, fontSize: 11 },
  disclaimer: { color: theme.colors.textMuted },
  stationMetadata: {
    gap: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceElevated
  },
  metadataRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm },
  metadataCopy: { flex: 1 },
  metadataLabel: { color: theme.colors.textMuted },
  metadataValue: { color: theme.colors.primaryDark },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 24, 18, 0.5)"
  },
  modalCard: {
    maxHeight: "75%",
    padding: theme.spacing.md,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm
  },
  modalTitle: { color: theme.colors.primaryDark },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight
  },
  optionSelected: { backgroundColor: theme.colors.primaryMuted },
  optionText: { color: theme.colors.primaryDark },
  pressed: { opacity: 0.72 }
});
