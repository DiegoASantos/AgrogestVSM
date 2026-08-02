import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import * as Location from "expo-location";

import {
  AppButton,
  AppCard,
  AppInput,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { getNowIsoString } from "../../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../../shared/database/sync-outbox";
import { getDatabase } from "../../../../shared/database/connection";
import { sectoresRepository } from "../../../sectores/repositories/sectores.repository";
import { subsectoresRepository } from "../../../subsectores/repositories/subsectores.repository";
import { parcelasRepository } from "../../../parcelas/repositories/parcelas.repository";
import type { GeoJsonPointGeometry } from "../../../../shared/maps/geo";
import { generatePublicId } from "../../../../shared/utils/local-id";

type Step = "distrito" | "sector" | "subsector" | "parcela";

type DistritoRow = {
  id: string;
  name: string;
};

export function AgregarParcelaScreen() {
  const router = useRouter();
  const { productorId } = useLocalSearchParams<{ productorId: string }>();
  const [step, setStep] = useState<Step>("distrito");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [distritoId, setDistritoId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [subsectorId, setSubsectorId] = useState("");
  const [isCreatingSector, setIsCreatingSector] = useState(false);
  const [isCreatingSubsector, setIsCreatingSubsector] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [newSubsectorName, setNewSubsectorName] = useState("");

  const [parcelaName, setParcelaName] = useState("");
  const [parcelaArea, setParcelaArea] = useState("");
  const [parcelaDescription, setParcelaDescription] = useState("");
  const [referencePoint, setReferencePoint] = useState<GeoJsonPointGeometry | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

  const [distritos, setDistritos] = useState<DistritoRow[]>([]);
  const [sectorOptions, setSectorOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [subsectorOptions, setSubsectorOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    loadDistritos();
  }, []);

  useEffect(() => {
    if (step === "sector" && distritoId) {
      loadSectores();
    }
  }, [step, distritoId]);

  useEffect(() => {
    if (step === "subsector" && sectorId) {
      loadSubsectores();
    }
  }, [step, sectorId]);

  function loadDistritos() {
    const db = getDatabase();
    const rows = db.getAllSync<DistritoRow>(
      "SELECT id, name FROM distritos ORDER BY name ASC"
    );
    setDistritos(rows);
    if (rows.length === 1) {
      setDistritoId(rows[0].id);
      setStep("sector");
    }
  }

  function loadSectores() {
    const sectors = sectoresRepository.getByDistritoId(distritoId);
    setSectorOptions(
      sectors.map((s) => ({ value: s.id, label: s.name }))
    );
    if (sectors.length === 1 && !isCreatingSector) {
      setSectorId(sectors[0].id);
      setStep("subsector");
    }
  }

  function loadSubsectores() {
    const subsectors = subsectoresRepository.getBySectorId(sectorId);
    setSubsectorOptions(
      subsectors.map((s) => ({ value: s.id, label: s.name }))
    );
    if (subsectors.length === 1 && !isCreatingSubsector) {
      setSubsectorId(subsectors[0].id);
      setStep("parcela");
    }
  }

  async function handleCreateSector() {
    if (!newSectorName.trim()) {
      setError("El nombre del sector es obligatorio.");
      return;
    }
    setError(null);
    const id = generatePublicId();
    const now = getNowIsoString();
    const db = getDatabase();
    db.withTransactionSync(() => {
      sectoresRepository.insert({
        id,
        publicId: generatePublicId(),
        distritoId,
        name: newSectorName.trim(),
        description: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        serverId: null,
        syncStatus: "pending",
        syncErrorMessage: null
      });
      insertSyncOutboxEntry(db, {
        entityType: "sectores",
        entityLocalId: id,
        operation: "create",
        createdAt: now
      });
    });
    setSectorId(id);
    setIsCreatingSector(false);
    setStep("subsector");
  }

  async function handleCreateSubsector() {
    if (!newSubsectorName.trim()) {
      setError("El nombre del subsector es obligatorio.");
      return;
    }
    setError(null);
    const id = generatePublicId();
    const now = getNowIsoString();
    const db = getDatabase();
    db.withTransactionSync(() => {
      subsectoresRepository.insert({
        id,
        publicId: generatePublicId(),
        sectorId,
        name: newSubsectorName.trim(),
        description: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        serverId: null,
        syncStatus: "pending",
        syncErrorMessage: null
      });
      insertSyncOutboxEntry(db, {
        entityType: "subsectores",
        entityLocalId: id,
        operation: "create",
        createdAt: now
      });
    });
    setSubsectorId(id);
    setIsCreatingSubsector(false);
    setStep("parcela");
  }

  async function handleCaptureLocation() {
    setCapturingLocation(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("No se pudo acceder a la ubicacion. Verifica los permisos del dispositivo.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const point: GeoJsonPointGeometry = {
        type: "Point",
        coordinates: [location.coords.longitude, location.coords.latitude]
      };
      setReferencePoint(point);
    } catch {
      setError("Error al obtener la ubicacion GPS.");
    } finally {
      setCapturingLocation(false);
    }
  }

  async function handleSaveParcela() {
    if (!referencePoint) {
      Alert.alert(
        "Punto de referencia",
        "La parcela no tiene punto de referencia. Se recomienda capturarlo en la entrada del predio.",
        [
          { text: "Volver", style: "cancel" },
          { text: "Guardar sin punto", onPress: () => saveParcela() }
        ]
      );
      return;
    }
    await saveParcela();
  }

  async function saveParcela() {
    if (!productorId) {
      setError("No se encontro el productor asociado.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const id = generatePublicId();
      const publicId = generatePublicId();
      const now = getNowIsoString();
      const code = generatePublicId();

      const normalizedArea = parcelaArea.trim();
      if (normalizedArea && (!Number.isFinite(Number(normalizedArea)) || Number(normalizedArea) <= 0)) {
        setError("El area debe ser un numero mayor que cero.");
        return;
      }

      const db = getDatabase();
      db.withTransactionSync(() => {
        parcelasRepository.insert({
          id,
          publicId,
          productorId,
          subsectorId,
          code,
          name: parcelaName.trim(),
          areaHectares: normalizedArea || null,
          description: parcelaDescription.trim() || null,
          referencePoint,
          geometry: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          serverId: null,
          syncStatus: "pending",
          syncErrorMessage: null,
          sectorId: "" // not stored, derived from subsector
        });

        insertSyncOutboxEntry(db, {
          entityType: "parcelas",
          entityLocalId: id,
          operation: "create",
          createdAt: now
        });
      });

      router.replace({
        pathname: "/visitas-campo/nueva",
        params: {
          nuevoProductorId: productorId,
          nuevaParcelaId: id
        }
      });
    } catch {
      setError("Error al guardar la parcela.");
    } finally {
      setIsSaving(false);
    }
  }

  function distritoOptions() {
    return distritos.map((d) => ({ value: d.id, label: d.name }));
  }

  function renderStepContent() {
    switch (step) {
      case "distrito":
        return (
          <AppCard style={styles.fieldsCard}>
            <AppText variant="label">Paso 1 de 4</AppText>
            <AppSelectField
              label="Distrito"
              placeholder="Selecciona un distrito"
              icon="map-outline"
              options={distritoOptions()}
              isOpen={true}
              isLoading={distritos.length === 0}
              onSelect={(value) => {
                setDistritoId(value);
                setStep("sector");
              }}
              onToggle={() => {}}
              onClose={() => {}}
              selectedLabel={distritos.find((d) => d.id === distritoId)?.name}
              emptyMessage="No hay distritos disponibles."
            />
            <View style={styles.divider} />
            <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
              El distrito es la division geografica base del sector.
            </AppText>
          </AppCard>
        );

      case "sector":
        return (
          <AppCard style={styles.fieldsCard}>
            <AppText variant="label">Paso 2 de 4</AppText>
            {isCreatingSector ? (
              <>
                <AppInput
                  label="Nombre del nuevo sector"
                  placeholder="Ej: Sector Norte"
                  value={newSectorName}
                  onChangeText={setNewSectorName}
                />
                <View style={styles.rowActions}>
                  <AppButton
                    label="Crear sector"
                    onPress={handleCreateSector}
                    disabled={!newSectorName.trim()}
                    size="small"
                  />
                  <AppButton
                    label="Cancelar"
                    onPress={() => setIsCreatingSector(false)}
                    variant="outline"
                    size="small"
                  />
                </View>
              </>
            ) : (
              <>
                <AppSelectField
                  label="Sector"
                  placeholder="Selecciona un sector"
                  icon="leaf-outline"
                  options={sectorOptions}
                  isOpen={true}
                  isLoading={false}
                  onSelect={(value) => {
                    setSectorId(value);
                    setStep("subsector");
                  }}
                  onToggle={() => {}}
                  onClose={() => {}}
                  selectedLabel={sectorOptions.find((s) => s.value === sectorId)?.label}
                  emptyMessage="No hay sectores en este distrito."
                />
                <View style={styles.divider} />
                <AppButton
                  label="Crear nuevo sector"
                  onPress={() => setIsCreatingSector(true)}
                  variant="outline"
                  size="small"
                  icon="add-outline"
                />
              </>
            )}
          </AppCard>
        );

      case "subsector":
        return (
          <AppCard style={styles.fieldsCard}>
            <AppText variant="label">Paso 3 de 4</AppText>
            {isCreatingSubsector ? (
              <>
                <AppInput
                  label="Nombre del nuevo subsector"
                  placeholder="Ej: Subsector A"
                  value={newSubsectorName}
                  onChangeText={setNewSubsectorName}
                />
                <View style={styles.rowActions}>
                  <AppButton
                    label="Crear subsector"
                    onPress={handleCreateSubsector}
                    disabled={!newSubsectorName.trim()}
                    size="small"
                  />
                  <AppButton
                    label="Cancelar"
                    onPress={() => setIsCreatingSubsector(false)}
                    variant="outline"
                    size="small"
                  />
                </View>
              </>
            ) : (
              <>
                <AppSelectField
                  label="Subsector"
                  placeholder="Selecciona un subsector"
                  icon="layers-outline"
                  options={subsectorOptions}
                  isOpen={true}
                  isLoading={false}
                  onSelect={(value) => {
                    setSubsectorId(value);
                    setStep("parcela");
                  }}
                  onToggle={() => {}}
                  onClose={() => {}}
                  selectedLabel={subsectorOptions.find((s) => s.value === subsectorId)?.label}
                  emptyMessage="No hay subsectores en este sector."
                />
                <View style={styles.divider} />
                <AppButton
                  label="Crear nuevo subsector"
                  onPress={() => setIsCreatingSubsector(true)}
                  variant="outline"
                  size="small"
                  icon="add-outline"
                />
              </>
            )}
          </AppCard>
        );

      case "parcela":
        return (
          <AppCard style={styles.fieldsCard}>
            <AppText variant="label">Paso 4 de 4</AppText>
            <AppInput
              label="Nombre de la parcela (opcional)"
              placeholder="Ej: Parcela Norte"
              value={parcelaName}
              onChangeText={setParcelaName}
            />
            <AppInput
              label="Area en hectareas (opcional)"
              placeholder="Ej: 5.5"
              value={parcelaArea}
              onChangeText={setParcelaArea}
              keyboardType="decimal-pad"
            />
            <AppInput
              label="Descripcion (opcional)"
              placeholder="Notas adicionales"
              value={parcelaDescription}
              onChangeText={setParcelaDescription}
              multiline
            />
            <View style={styles.divider} />
            <AppText variant="label">Punto de referencia GPS</AppText>
            <AppText variant="caption" style={{ color: theme.colors.textMuted, marginBottom: 4 }}>
              Capture el punto GPS en la entrada del predio.
            </AppText>
            {referencePoint ? (
              <AppCard style={styles.gpsCard}>
                <AppText variant="body">
                  Lat: {referencePoint.coordinates[1].toFixed(6)} | Lon: {referencePoint.coordinates[0].toFixed(6)}
                </AppText>
                <AppButton
                  label="Volver a capturar"
                  onPress={handleCaptureLocation}
                  variant="outline"
                  size="small"
                  icon="location-outline"
                  loading={capturingLocation}
                />
              </AppCard>
            ) : (
              <AppButton
                label="Capturar ubicacion (entrada del predio)"
                onPress={handleCaptureLocation}
                variant="outline"
                icon="location-outline"
                loading={capturingLocation}
              />
            )}
          </AppCard>
        );
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppText variant="title" style={styles.pageTitle}>
          Agregar parcela
        </AppText>
        <AppText variant="body" style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
          Selecciona la ubicacion de la parcela y completa sus datos.
        </AppText>

        {renderStepContent()}

        {error ? (
          <View style={styles.errorBanner}>
            <AppText variant="caption" style={styles.errorText}>{error}</AppText>
          </View>
        ) : null}

        {step === "parcela" ? (
          <View style={styles.actions}>
            <AppButton
              label="Guardar parcela"
              onPress={handleSaveParcela}
              loading={isSaving}
              icon="save-outline"
            />
            <AppButton
              label="Cancelar"
              onPress={() => router.back()}
              variant="outline"
            />
          </View>
        ) : null}

        {step !== "parcela" ? (
          <View style={styles.actions}>
            <AppButton
              label="Cancelar"
              onPress={() => router.back()}
              variant="outline"
            />
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 0 },
  scrollContent: { padding: 18, gap: 14 },
  pageTitle: { color: theme.colors.primaryDark, marginBottom: 4 },
  fieldsCard: { padding: 16, gap: 14, backgroundColor: theme.colors.surface },
  gpsCard: { padding: 12, gap: 8, backgroundColor: theme.colors.surfaceElevated },
  divider: { height: 1, backgroundColor: theme.colors.borderLight },
  errorBanner: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  errorText: { color: theme.colors.error },
  actions: { gap: 10 },
  rowActions: { flexDirection: "row", gap: 8 }
});
