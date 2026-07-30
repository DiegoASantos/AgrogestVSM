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

import { AppText } from "../../../../shared/components";
import { climaCacheRepository } from "../../repositories/clima-cache.repository";
import { climaService } from "../../services/clima.service";
import {
  climateDistricts,
  type ClimateDistrictCode,
  type ClimateLoadResult
} from "../../types/clima.types";

export function ClimateDashboard({ isOnline }: { isOnline: boolean }) {
  const [selectedDistrictCode, setSelectedDistrictCode] =
    useState<ClimateDistrictCode | null>(null);
  const [isSelectorVisible, setIsSelectorVisible] = useState(false);
  const [result, setResult] = useState<ClimateLoadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedDistrict =
    climateDistricts.find((district) => district.code === selectedDistrictCode) ?? null;

  useEffect(() => {
    const saved = climaCacheRepository.getSelectedDistrictCode();
    if (isClimateDistrictCode(saved)) setSelectedDistrictCode(saved);
  }, []);

  useEffect(() => {
    if (!selectedDistrictCode) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    void climaService
      .getForDistrict(selectedDistrictCode, isOnline)
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((reason: unknown) => {
        if (active) {
          setResult(null);
          setError(
            reason instanceof Error ? reason.message : "No se pudo cargar el clima."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOnline, selectedDistrictCode]);

  function selectDistrict(districtCode: ClimateDistrictCode) {
    climaCacheRepository.saveSelectedDistrictCode(districtCode);
    setSelectedDistrictCode(districtCode);
    setIsSelectorVisible(false);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <Ionicons color="#08643f" name="partly-sunny-outline" size={22} />
          </View>
          <View>
            <AppText style={styles.title} variant="heading">
              Clima del campo
            </AppText>
            <AppText style={styles.subtitle} variant="caption">
              Estimación meteorológica general para apoyar la operación.
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Elegir distrito climático"
          accessibilityRole="button"
          onPress={() => setIsSelectorVisible(true)}
          style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
        >
          <AppText numberOfLines={1} style={styles.selectorText} variant="label">
            {selectedDistrict?.name ?? "Seleccionar distrito"}
          </AppText>
          <Ionicons color="#08643f" name="chevron-down" size={18} />
        </Pressable>
      </View>

      {!selectedDistrict ? (
        <EmptyClimate message="Selecciona un distrito para ver el clima general." />
      ) : null}
      {selectedDistrict && isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#08643f" />
          <AppText style={styles.muted} variant="caption">
            Actualizando estimación...
          </AppText>
        </View>
      ) : null}
      {selectedDistrict && !isLoading && error ? <EmptyClimate message={error} /> : null}
      {selectedDistrict && !isLoading && result ? (
        <ClimateContent result={result} />
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setIsSelectorVisible(false)}
        transparent
        visible={isSelectorVisible}
      >
        <Pressable
          onPress={() => setIsSelectorVisible(false)}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={styles.modalCard}
          >
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle} variant="heading">
                Distrito climático
              </AppText>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={() => setIsSelectorVisible(false)}
              >
                <Ionicons color="#315044" name="close" size={24} />
              </Pressable>
            </View>
            <ScrollView>
              {climateDistricts.map((district) => (
                <Pressable
                  key={district.code}
                  accessibilityRole="button"
                  onPress={() => selectDistrict(district.code)}
                  style={[
                    styles.option,
                    district.code === selectedDistrictCode && styles.optionSelected
                  ]}
                >
                  <AppText style={styles.optionTitle} variant="label">
                    {district.name}
                  </AppText>
                  {district.code === selectedDistrictCode ? (
                    <Ionicons color="#08643f" name="checkmark-circle" size={21} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ClimateContent({ result }: { result: ClimateLoadResult }) {
  const { climate } = result;
  return (
    <View style={styles.content}>
      <View style={styles.source}>
        <Ionicons
          color={result.isStale ? "#a95f00" : "#4a715f"}
          name={result.isCached ? "cloud-offline-outline" : "cloud-outline"}
          size={15}
        />
        <AppText
          style={[styles.sourceText, result.isStale && styles.staleText]}
          variant="caption"
        >
          {result.isStale
            ? "Estimación guardada; requiere actualización"
            : result.isCached
              ? "Estimación guardada para uso sin conexión"
              : `Open-Meteo · ${climate.district.name}`}
        </AppText>
      </View>
      <View style={styles.currentGrid}>
        <Metric
          icon="thermometer-outline"
          label="Temperatura"
          value={format(climate.current.temperatureC, "°C")}
        />
        <Metric
          icon="water-outline"
          label="Humedad"
          value={format(climate.current.relativeHumidityPercent, "%")}
        />
        <Metric
          icon="rainy-outline"
          label="Lluvia actual"
          value={format(climate.current.precipitationMm, " mm")}
        />
        <Metric
          icon="speedometer-outline"
          label="Viento"
          value={format(climate.current.windSpeedKmh, " km/h")}
        />
      </View>
      <AppText style={styles.fieldTitle} variant="label">
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
      <AppText style={styles.fieldTitle} variant="label">
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
            <Ionicons color="#2373a8" name={weatherIcon(day.weatherCode)} size={20} />
            <AppText style={styles.dayTemp} variant="caption">
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
        Estimación territorial, no lectura de estación ni dato específico de un predio.
        Actualizado: {formatDateTime(climate.source.fetchedAt)}.
      </AppText>
    </View>
  );
}

function isClimateDistrictCode(value: string | null): value is ClimateDistrictCode {
  return climateDistricts.some((district) => district.code === value);
}
function EmptyClimate({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons color="#7c887f" name="cloud-offline-outline" size={25} />
      <AppText style={styles.emptyText} variant="caption">
        {message}
      </AppText>
    </View>
  );
}
function Metric({
  icon,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons color="#2373a8" name={icon} size={19} />
      <AppText style={styles.metricValue} variant="label">
        {value}
      </AppText>
      <AppText style={styles.metricLabel} variant="caption">
        {label}
      </AppText>
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
function format(value: number | null, unit: string) {
  return value === null ? "—" : `${Math.round(value * 10) / 10}${unit}`;
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

const styles = StyleSheet.create({
  panel: {
    padding: 15,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    shadowColor: "#345245",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  header: { gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#e5f4eb"
  },
  title: { color: "#102e23", fontSize: 18 },
  subtitle: { color: "#68726e", marginTop: 1 },
  selector: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#b8d5c3",
    borderRadius: 12,
    backgroundColor: "#f6fbf7"
  },
  selectorText: { flex: 1, color: "#08643f" },
  loading: {
    minHeight: 105,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  muted: { color: "#68726e" },
  empty: {
    minHeight: 105,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22
  },
  emptyText: { color: "#68726e", textAlign: "center" },
  content: { marginTop: 14, gap: 12 },
  source: { flexDirection: "row", alignItems: "center", gap: 6 },
  sourceText: { color: "#4a715f" },
  staleText: { color: "#a95f00" },
  currentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    width: "48%",
    gap: 2,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f4f8f5"
  },
  metricValue: { color: "#123c2d", fontSize: 16 },
  metricLabel: { color: "#65736b" },
  fieldTitle: { color: "#294437", marginTop: 2 },
  fieldGrid: { flexDirection: "row", gap: 7 },
  fieldMetric: {
    minWidth: 0,
    flex: 1,
    gap: 2,
    padding: 9,
    borderLeftWidth: 3,
    borderLeftColor: "#b9d9a5",
    backgroundColor: "#fbfcf9"
  },
  fieldValue: { color: "#163b2c", fontSize: 13 },
  fieldLabel: { color: "#66736b", fontSize: 10 },
  forecastRow: { gap: 8, paddingRight: 10 },
  day: { width: 103, gap: 5, padding: 10, borderRadius: 12, backgroundColor: "#eef6fb" },
  dayDate: { color: "#26526d", textTransform: "capitalize" },
  dayTemp: { color: "#173d53" },
  dayMeta: { color: "#60737d", fontSize: 10 },
  disclaimer: { color: "#6b756f", lineHeight: 16 },
  pressed: { opacity: 0.75 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8, 24, 18, 0.5)"
  },
  modalCard: {
    maxHeight: "75%",
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#ffffff"
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  modalTitle: { color: "#102e23", fontSize: 18 },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e6ebe6"
  },
  optionSelected: { backgroundColor: "#f2f9f3" },
  optionTitle: { color: "#173b2d" }
});
