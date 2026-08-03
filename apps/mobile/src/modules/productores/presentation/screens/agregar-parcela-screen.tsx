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

type FilaDistrito = { id: string; name: string };

type CatalogoAbierto =
  | "distrito"
  | "sector"
  | "subsector"
  | "crear-sector"
  | "crear-subsector"
  | null;

export function AgregarParcelaScreen() {
  const router = useRouter();
  const { productorId } = useLocalSearchParams<{ productorId: string }>();

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [catalogoAbierto, setCatalogoAbierto] = useState<CatalogoAbierto>(null);

  const [distritoId, setDistritoId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [subsectorId, setSubsectorId] = useState("");

  const [nombreNuevoSector, setNombreNuevoSector] = useState("");
  const [nombreNuevoSubsector, setNombreNuevoSubsector] = useState("");

  const [nombreParcela, setNombreParcela] = useState("");
  const [areaHectareas, setAreaHectareas] = useState("");
  const [descripcionParcela, setDescripcionParcela] = useState("");
  const [puntoReferencia, setPuntoReferencia] = useState<GeoJsonPointGeometry | null>(null);
  const [capturandoUbicacion, setCapturandoUbicacion] = useState(false);

  const [opcionesDistrito, setOpcionesDistrito] = useState<Array<{ value: string; label: string }>>([]);
  const [opcionesSector, setOpcionesSector] = useState<Array<{ value: string; label: string }>>([]);
  const [opcionesSubsector, setOpcionesSubsector] = useState<Array<{ value: string; label: string }>>([]);

  const [mostrandoCrearSector, setMostrandoCrearSector] = useState(false);
  const [mostrandoCrearSubsector, setMostrandoCrearSubsector] = useState(false);

  useEffect(() => {
    cargarDistritos();
  }, []);

  function cargarDistritos() {
    const db = getDatabase();
    const filas = db.getAllSync<FilaDistrito>(
      "SELECT id, name FROM distritos ORDER BY name ASC"
    );
    const opciones = filas.map((f) => ({ value: f.id, label: f.name }));
    setOpcionesDistrito(opciones);
    if (filas.length === 1) {
      setDistritoId(filas[0].id);
      cargarSectores(filas[0].id);
    }
  }

  function cargarSectores(idDistrito: string) {
    const sectores = sectoresRepository.getByDistritoId(idDistrito);
    setOpcionesSector(sectores.map((s) => ({ value: s.id, label: s.name })));
    if (sectores.length === 1 && !mostrandoCrearSector) {
      setSectorId(sectores[0].id);
      cargarSubsectores(sectores[0].id);
    }
  }

  function cargarSubsectores(idSector: string) {
    const subsectores = subsectoresRepository.getBySectorId(idSector);
    setOpcionesSubsector(subsectores.map((s) => ({ value: s.id, label: s.name })));
    if (subsectores.length === 1 && !mostrandoCrearSubsector) {
      setSubsectorId(subsectores[0].id);
    }
  }

  function alternarCatalogo(catalogo: CatalogoAbierto) {
    setCatalogoAbierto((actual) => (actual === catalogo ? null : catalogo));
  }

  function manejarSeleccionDistrito(valor: string) {
    setDistritoId(valor);
    setSectorId("");
    setSubsectorId("");
    setOpcionesSector([]);
    setOpcionesSubsector([]);
    setCatalogoAbierto(null);
    cargarSectores(valor);
  }

  function manejarSeleccionSector(valor: string) {
    setSectorId(valor);
    setSubsectorId("");
    setOpcionesSubsector([]);
    setCatalogoAbierto(null);
    cargarSubsectores(valor);
  }

  function manejarSeleccionSubsector(valor: string) {
    setSubsectorId(valor);
    setCatalogoAbierto(null);
  }

  async function crearSector() {
    const nombre = nombreNuevoSector.trim();
    if (!nombre) {
      setError("El nombre del sector es obligatorio.");
      return;
    }
    setError(null);
    const id = generatePublicId();
    const ahora = getNowIsoString();
    const db = getDatabase();
    db.withTransactionSync(() => {
      sectoresRepository.insert({
        id,
        publicId: generatePublicId(),
        distritoId,
        name: nombre,
        description: null,
        isActive: true,
        createdAt: ahora,
        updatedAt: ahora,
        serverId: null,
        syncStatus: "pending",
        syncErrorMessage: null
      });
      insertSyncOutboxEntry(db, {
        entityType: "sectores",
        entityLocalId: id,
        operation: "create",
        createdAt: ahora
      });
    });
    setSectorId(id);
    setMostrandoCrearSector(false);
    setNombreNuevoSector("");
    cargarSectores(distritoId);
  }

  async function crearSubsector() {
    const nombre = nombreNuevoSubsector.trim();
    if (!nombre) {
      setError("El nombre del subsector es obligatorio.");
      return;
    }
    setError(null);
    const id = generatePublicId();
    const ahora = getNowIsoString();
    const db = getDatabase();
    db.withTransactionSync(() => {
      subsectoresRepository.insert({
        id,
        publicId: generatePublicId(),
        sectorId,
        name: nombre,
        description: null,
        isActive: true,
        createdAt: ahora,
        updatedAt: ahora,
        serverId: null,
        syncStatus: "pending",
        syncErrorMessage: null
      });
      insertSyncOutboxEntry(db, {
        entityType: "subsectores",
        entityLocalId: id,
        operation: "create",
        createdAt: ahora
      });
    });
    setSubsectorId(id);
    setMostrandoCrearSubsector(false);
    setNombreNuevoSubsector("");
    cargarSubsectores(sectorId);
  }

  async function capturarUbicacion() {
    setCapturandoUbicacion(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("No se pudo acceder a la ubicacion. Verifica los permisos del dispositivo.");
        return;
      }
      const ubicacion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const punto: GeoJsonPointGeometry = {
        type: "Point",
        coordinates: [ubicacion.coords.longitude, ubicacion.coords.latitude]
      };
      setPuntoReferencia(punto);
    } catch {
      setError("Error al obtener la ubicacion GPS.");
    } finally {
      setCapturandoUbicacion(false);
    }
  }

  function validar(): string | null {
    const nombre = nombreParcela.trim();
    if (!nombre) {
      return "El nombre de la parcela es obligatorio.";
    }
    if (!distritoId) {
      return "Debe seleccionar un distrito.";
    }
    if (!sectorId) {
      return "Debe seleccionar o crear un sector.";
    }
    if (!subsectorId) {
      return "Debe seleccionar o crear un subsector.";
    }
    const area = areaHectareas.trim();
    if (!area) {
      return "El area en hectareas es obligatoria.";
    }
    const areaNumerica = Number(area);
    if (!Number.isFinite(areaNumerica) || areaNumerica <= 0) {
      return "El area debe ser un numero mayor que cero.";
    }
    if (nombre.length > 150) {
      return "El nombre de la parcela no puede superar 150 caracteres.";
    }
    return null;
  }

  async function guardarParcela() {
    const errorValidacion = validar();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    if (!puntoReferencia) {
      Alert.alert(
        "Punto de referencia",
        "La parcela no tiene punto de referencia. Se recomienda capturarlo en la entrada del predio.",
        [
          { text: "Volver", style: "cancel" },
          { text: "Guardar sin punto", onPress: () => ejecutarGuardado() }
        ]
      );
      return;
    }
    await ejecutarGuardado();
  }

  async function ejecutarGuardado() {
    if (!productorId) {
      setError("No se encontro el productor asociado.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const id = generatePublicId();
      const idPublico = generatePublicId();
      const ahora = getNowIsoString();
      const codigoTemporal = generatePublicId();

      const db = getDatabase();
      db.withTransactionSync(() => {
        parcelasRepository.insert({
          id,
          publicId: idPublico,
          productorId,
          subsectorId,
          code: codigoTemporal,
          name: nombreParcela.trim(),
          areaHectares: areaHectareas.trim(),
          description: descripcionParcela.trim() || null,
          referencePoint: puntoReferencia,
          geometry: null,
          isActive: true,
          createdAt: ahora,
          updatedAt: ahora,
          serverId: null,
          syncStatus: "pending",
          syncErrorMessage: null,
          sectorId: sectorId
        });

        insertSyncOutboxEntry(db, {
          entityType: "parcelas",
          entityLocalId: id,
          operation: "create",
          createdAt: ahora
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
      setGuardando(false);
    }
  }

  const etiquetaDistrito = opcionesDistrito.find((o) => o.value === distritoId)?.label;
  const etiquetaSector = opcionesSector.find((o) => o.value === sectorId)?.label;
  const etiquetaSubsector = opcionesSubsector.find((o) => o.value === subsectorId)?.label;

  return (
    <ScreenContainer contentStyle={estilos.contenedor}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={estilos.scroll}>
        <AppText variant="title" style={estilos.titulo}>
          Agregar parcela
        </AppText>
        <AppText variant="body" style={estilos.subtitulo}>
          Completa la ubicacion y los datos de la parcela. Los campos marcados con * son obligatorios.
        </AppText>

        <AppCard style={estilos.tarjeta}>
          <AppText variant="label" style={estilos.tituloSeccion}>
            Ubicacion
          </AppText>

          <AppSelectField
            label="Distrito *"
            placeholder="Buscar distrito..."
            icon="map-outline"
            options={opcionesDistrito}
            isOpen={catalogoAbierto === "distrito"}
            isLoading={false}
            searchable
            searchPlaceholder="Escribe para buscar"
            emptyMessage="No hay distritos disponibles."
            selectedLabel={etiquetaDistrito}
            onSelect={manejarSeleccionDistrito}
            onToggle={() => alternarCatalogo("distrito")}
            onClose={() => setCatalogoAbierto(null)}
          />

          <View style={estilos.separador} />

          {mostrandoCrearSector ? (
            <View style={estilos.bloqueCreacion}>
              <AppInput
                label="Nombre del nuevo sector"
                placeholder="Ej: Sector Norte"
                value={nombreNuevoSector}
                onChangeText={setNombreNuevoSector}
              />
              <View style={estilos.filaAcciones}>
                <AppButton
                  label="Crear sector"
                  onPress={crearSector}
                  disabled={!nombreNuevoSector.trim()}
                  size="small"
                />
                <AppButton
                  label="Cancelar"
                  onPress={() => {
                    setMostrandoCrearSector(false);
                    setNombreNuevoSector("");
                  }}
                  variant="outline"
                  size="small"
                />
              </View>
            </View>
          ) : (
            <>
              <AppSelectField
                label="Sector *"
                placeholder="Buscar sector..."
                icon="leaf-outline"
                options={opcionesSector}
                isOpen={catalogoAbierto === "sector"}
                isLoading={false}
                disabled={!distritoId}
                searchable
                searchPlaceholder="Escribe para buscar"
                emptyMessage="No hay sectores en este distrito. Crea uno nuevo."
                selectedLabel={etiquetaSector}
                onSelect={manejarSeleccionSector}
                onToggle={() => alternarCatalogo("sector")}
                onClose={() => setCatalogoAbierto(null)}
              />
              {distritoId ? (
                <AppButton
                  label="Crear nuevo sector"
                  onPress={() => setMostrandoCrearSector(true)}
                  variant="outline"
                  size="small"
                  icon="add-outline"
                />
              ) : null}
            </>
          )}

          <View style={estilos.separador} />

          {mostrandoCrearSubsector ? (
            <View style={estilos.bloqueCreacion}>
              <AppInput
                label="Nombre del nuevo subsector"
                placeholder="Ej: Subsector A"
                value={nombreNuevoSubsector}
                onChangeText={setNombreNuevoSubsector}
              />
              <View style={estilos.filaAcciones}>
                <AppButton
                  label="Crear subsector"
                  onPress={crearSubsector}
                  disabled={!nombreNuevoSubsector.trim()}
                  size="small"
                />
                <AppButton
                  label="Cancelar"
                  onPress={() => {
                    setMostrandoCrearSubsector(false);
                    setNombreNuevoSubsector("");
                  }}
                  variant="outline"
                  size="small"
                />
              </View>
            </View>
          ) : (
            <>
              <AppSelectField
                label="Subsector *"
                placeholder="Buscar subsector..."
                icon="layers-outline"
                options={opcionesSubsector}
                isOpen={catalogoAbierto === "subsector"}
                isLoading={false}
                disabled={!sectorId}
                searchable
                searchPlaceholder="Escribe para buscar"
                emptyMessage="No hay subsectores en este sector. Crea uno nuevo."
                selectedLabel={etiquetaSubsector}
                onSelect={manejarSeleccionSubsector}
                onToggle={() => alternarCatalogo("subsector")}
                onClose={() => setCatalogoAbierto(null)}
              />
              {sectorId ? (
                <AppButton
                  label="Crear nuevo subsector"
                  onPress={() => setMostrandoCrearSubsector(true)}
                  variant="outline"
                  size="small"
                  icon="add-outline"
                />
              ) : null}
            </>
          )}
        </AppCard>

        <AppCard style={estilos.tarjeta}>
          <AppText variant="label" style={estilos.tituloSeccion}>
            Datos de la parcela
          </AppText>

          <AppInput
            label="Nombre de la parcela *"
            placeholder="Ej: Parcela Norte"
            value={nombreParcela}
            onChangeText={setNombreParcela}
          />

          <AppInput
            label="Area en hectareas *"
            placeholder="Ej: 5.5"
            value={areaHectareas}
            onChangeText={setAreaHectareas}
            keyboardType="decimal-pad"
          />

          <AppInput
            label="Descripcion (opcional)"
            placeholder="Notas adicionales"
            value={descripcionParcela}
            onChangeText={setDescripcionParcela}
            multiline
          />

          <View style={estilos.separador} />

          <AppText variant="label">Punto de referencia GPS</AppText>
          <AppText variant="caption" style={estilos.textoAyuda}>
            Capture el punto GPS en la entrada del predio.
          </AppText>

          {puntoReferencia ? (
            <AppCard style={estilos.tarjetaGps}>
              <AppText variant="body">
                Lat: {puntoReferencia.coordinates[1].toFixed(6)} | Lon: {puntoReferencia.coordinates[0].toFixed(6)}
              </AppText>
              <AppButton
                label="Volver a capturar"
                onPress={capturarUbicacion}
                variant="outline"
                size="small"
                icon="location-outline"
                loading={capturandoUbicacion}
              />
            </AppCard>
          ) : (
            <AppButton
              label="Capturar ubicacion (entrada del predio)"
              onPress={capturarUbicacion}
              variant="outline"
              icon="location-outline"
              loading={capturandoUbicacion}
            />
          )}
        </AppCard>

        {error ? (
          <View style={estilos.bannerError}>
            <AppText variant="caption" style={estilos.textoError}>
              {error}
            </AppText>
          </View>
        ) : null}

        <View style={estilos.acciones}>
          <AppButton
            label="Guardar parcela"
            onPress={guardarParcela}
            loading={guardando}
            icon="save-outline"
          />
          <AppButton
            label="Cancelar"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  contenedor: { paddingHorizontal: 0, paddingVertical: 0 },
  scroll: { padding: 18, gap: 14 },
  titulo: { color: theme.colors.primaryDark, marginBottom: 4 },
  subtitulo: { color: theme.colors.textMuted, marginBottom: 4 },

  tarjeta: {
    padding: 16,
    gap: 14,
    backgroundColor: theme.colors.surface
  },
  tituloSeccion: {
    color: theme.colors.primaryDark,
    marginBottom: 2
  },

  separador: { height: 1, backgroundColor: theme.colors.borderLight },

  bloqueCreacion: { gap: 10 },
  filaAcciones: { flexDirection: "row", gap: 8 },

  tarjetaGps: {
    padding: 12,
    gap: 8,
    backgroundColor: theme.colors.surfaceElevated
  },
  textoAyuda: {
    color: theme.colors.textMuted,
    marginBottom: 4
  },

  bannerError: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  textoError: { color: theme.colors.error },

  acciones: { gap: 10 }
});
