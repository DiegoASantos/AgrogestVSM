import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppPaginatedSelectField,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../shared/components";
import { theme } from "../../shared/constants/theme";
import { captureCurrentDeviceLocation } from "../../shared/location/device-location";
import {
  visitasComercialesService,
  type TipoSujetoComercial,
  type VisitaComercialLocal
} from "./visitas-comerciales.service";
import { productoresService } from "../productores/services/productores.service";
import type { Productor } from "../productores/types";
import { guardarFotoComercial } from "../comercial/services/fotos-comerciales.service";

function fechaLima() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
const opciones = [
  { value: "PERSONA", label: "Persona" },
  { value: "FUNDO", label: "Fundo" },
  { value: "ASOCIATIVA", label: "Asociación" },
  { value: "COOPERATIVA", label: "Cooperativa" },
  { value: "RECORREDOR", label: "Recorredor" }
];

export function VisitaComercialScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoSujetoComercial>("PERSONA");
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [productorId, setProductorId] = useState<string | null>(null);
  const [productorLabel, setProductorLabel] = useState<string>();
  const [buscarAbierto, setBuscarAbierto] = useState(false);
  const [crearProductor, setCrearProductor] = useState(false);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [fotos, setFotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [visitaGuardada, setVisitaGuardada] = useState<VisitaComercialLocal | null>(null);
  const fecha = fechaLima();
  const persona = tipo === "PERSONA" || tipo === "RECORREDOR";

  const guardar = async () => {
    if (visitaGuardada) {
      await guardarFotos(visitaGuardada, false);
      return;
    }
    if (!productorId && !crearProductor) {
      Alert.alert("Selecciona un productor", "Busca al productor o usa Crear productor.");
      return;
    }
    if (!nombres.trim() || !descripcion.trim() || (persona && !apellidos.trim())) {
      Alert.alert(
        "Completa los datos",
        "Ingresa el nombre, los apellidos requeridos y la descripción."
      );
      return;
    }
    setGuardando(true);
    let ubicacion = null;
    let sinUbicacion = false;
    try {
      ubicacion = (await captureCurrentDeviceLocation()).point;
    } catch {
      sinUbicacion = true;
    }
    try {
      const visit = visitasComercialesService.create({
        productorId,
        crearProductor,
        tipoSujeto: tipo,
        nombres,
        apellidos: persona ? apellidos : null,
        descripcion,
        fechaVisita: fechaLima(),
        ubicacionVisita: ubicacion
      });
      setVisitaGuardada(visit);
      await guardarFotos(visit, sinUbicacion);
    } catch (error) {
      Alert.alert(
        "No se pudo guardar",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    } finally {
      setGuardando(false);
    }
  };

  const guardarFotos = async (visit: VisitaComercialLocal, sinUbicacion: boolean) => {
    if (!visit.productorId) throw new Error("La visita no tiene productor asociado.");
    const fallidas: ImagePicker.ImagePickerAsset[] = [];
    for (const foto of fotos) {
      try { await guardarFotoComercial(visit.productorId, foto, visit.id); }
      catch { fallidas.push(foto); }
    }
    setFotos(fallidas);
    if (fallidas.length) {
      Alert.alert("Visita guardada", `${fallidas.length} foto(s) no se pudieron guardar. Puedes reintentarlo sin duplicar la visita.`);
      return;
    }
    Alert.alert("Visita guardada", sinUbicacion
      ? "Se guardó sin ubicación. Se sincronizará cuando haya conexión."
      : "Se guardó en el dispositivo y se sincronizará cuando haya conexión.",
    [{ text: "Ver historial", onPress: () => router.replace("/visitas-campo/historial-comercial") }]);
  };

  const elegirFotos = async (camera: boolean) => {
    if (fotos.length >= 10) return Alert.alert("Limite de fotos", "Puedes agregar hasta 10 fotos por visita.");
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert("Permiso de cámara", "Permite usar la cámara para tomar una foto.");
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1, exif: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 10 - fotos.length, quality: 1, exif: false });
    if (!result.canceled) setFotos((current) => [...current, ...result.assets].slice(0, 10));
  };

  return (
    <ScreenContainer>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppHeader
          eyebrow="Nueva visita"
          title="Visita comercial"
          subtitle="Registra a quién visitaste y el motivo de la visita."
        />
        <AppCard>
          <AppPaginatedSelectField
            label="Productor"
            disabled={!!visitaGuardada}
            placeholder="Buscar productor asignado o creado por ti"
            searchPlaceholder="Buscar por nombre o documento"
            selectedLabel={productorLabel}
            isOpen={buscarAbierto}
            onToggle={() => setBuscarAbierto((value) => !value)}
            onClose={() => setBuscarAbierto(false)}
            onSearch={async (query, page, pageSize) => {
              const offset = (page - 1) * pageSize;
              const [items, total] = await Promise.all([
                productoresService.searchByName(query, pageSize, offset),
                productoresService.countByName(query)
              ]);
              return {
                total,
                options: items.map((item) => ({
                  value: item.id,
                  label: [item.firstName, item.lastName].filter(Boolean).join(" ") || item.publicId,
                  helper: item.documentNumber ?? undefined
                }))
              };
            }}
            onSelect={(option) => {
              void productoresService.getById(option.value).then((item: Productor) => {
                const nextType = item.entityType === "asociacion"
                  ? "ASOCIATIVA"
                  : item.entityType.toUpperCase() as TipoSujetoComercial;
                setProductorId(item.id);
                setProductorLabel(option.label);
                setTipo(nextType);
                setNombres(item.firstName ?? "");
                setApellidos(item.lastName ?? "");
                setCrearProductor(false);
              });
            }}
          />
          <AppButton
            label="Crear productor"
            variant="outline"
            disabled={!!visitaGuardada}
            onPress={() => {
              setProductorId(null);
              setProductorLabel(undefined);
              setNombres("");
              setApellidos("");
              setCrearProductor(true);
            }}
          />
          <AppSelectField
            label="Tipo de productor"
            placeholder="Selecciona el tipo"
            options={opciones}
            selectedLabel={opciones.find((item) => item.value === tipo)?.label}
            isOpen={selectorAbierto}
            disabled={!crearProductor || !!visitaGuardada}
            onToggle={() => setSelectorAbierto(!selectorAbierto)}
            onSelect={(value) => {
              setTipo(value as TipoSujetoComercial);
              setSelectorAbierto(false);
            }}
          />
          <AppInput
            label={persona ? "Nombres" : "Nombre"}
            value={nombres}
            editable={crearProductor && !visitaGuardada}
            onChangeText={setNombres}
            maxLength={100}
          />
          {persona ? (
            <AppInput
              label="Apellidos"
              value={apellidos}
              editable={crearProductor && !visitaGuardada}
              onChangeText={setApellidos}
              maxLength={100}
            />
          ) : null}
          <AppInput label="Fecha de visita" value={fecha} editable={false} />
          <AppInput
            label="Descripción"
            value={descripcion}
            editable={!visitaGuardada}
            onChangeText={setDescripcion}
            maxLength={2000}
            multiline
            numberOfLines={5}
            style={styles.descripcion}
          />
          <AppText variant="caption">
            Se intentará guardar la ubicación actual. Puedes continuar si no está
            disponible.
          </AppText>
          <AppText variant="label">Evidencia fotográfica (opcional)</AppText>
          <View style={styles.photoActions}>
            <AppButton label="Tomar foto" variant="outline" onPress={() => void elegirFotos(true)} disabled={!!visitaGuardada || fotos.length >= 10} />
            <AppButton label="Galería" variant="outline" onPress={() => void elegirFotos(false)} disabled={!!visitaGuardada || fotos.length >= 10} />
          </View>
          {fotos.map((foto, index) => (
            <View key={`${foto.uri}-${index}`} style={styles.photoRow}>
              <Image source={{ uri: foto.uri }} style={styles.photoPreview} />
              <AppText variant="caption">Foto {index + 1}</AppText>
              <Pressable onPress={() => setFotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                <AppText variant="label">Quitar</AppText>
              </Pressable>
            </View>
          ))}
          <AppButton
            label={visitaGuardada ? "Reintentar fotos pendientes" : "Guardar visita comercial"}
            onPress={() => void guardar()}
            loading={guardando}
          />
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingBottom: 30 },
  descripcion: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 12,
    color: theme.colors.text
  },
  photoActions: { gap: 8 },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  photoPreview: { width: 58, height: 58, borderRadius: 8 }
});
