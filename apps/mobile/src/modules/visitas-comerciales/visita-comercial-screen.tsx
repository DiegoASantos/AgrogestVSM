import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../shared/components";
import { theme } from "../../shared/constants/theme";
import { captureCurrentDeviceLocation } from "../../shared/location/device-location";
import {
  visitasComercialesService,
  type TipoSujetoComercial
} from "./visitas-comerciales.service";

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
  { value: "ASOCIATIVA", label: "Asociativa" },
  { value: "RECORREDOR", label: "Recorredor" }
];

export function VisitaComercialScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoSujetoComercial>("PERSONA");
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const fecha = fechaLima();
  const persona = tipo === "PERSONA" || tipo === "RECORREDOR";

  const guardar = async () => {
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
      visitasComercialesService.create({
        tipoSujeto: tipo,
        nombres,
        apellidos: persona ? apellidos : null,
        descripcion,
        fechaVisita: fechaLima(),
        ubicacionVisita: ubicacion
      });
      Alert.alert(
        "Visita guardada",
        sinUbicacion
          ? "Se guardó sin ubicación porque no fue posible obtenerla. Se sincronizará cuando haya conexión."
          : "Se guardó en el dispositivo y se sincronizará cuando haya conexión.",
        [
          {
            text: "Ver historial",
            onPress: () => router.replace("/visitas-campo/historial-comercial")
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        "No se pudo guardar",
        error instanceof Error ? error.message : "Inténtalo de nuevo."
      );
    } finally {
      setGuardando(false);
    }
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
          <AppSelectField
            label="Tipo de productor"
            placeholder="Selecciona el tipo"
            options={opciones}
            selectedLabel={opciones.find((item) => item.value === tipo)?.label}
            isOpen={selectorAbierto}
            onToggle={() => setSelectorAbierto(!selectorAbierto)}
            onSelect={(value) => {
              setTipo(value as TipoSujetoComercial);
              setSelectorAbierto(false);
            }}
          />
          <AppInput
            label={persona ? "Nombres" : "Nombre"}
            value={nombres}
            onChangeText={setNombres}
            maxLength={150}
          />
          {persona ? (
            <AppInput
              label="Apellidos"
              value={apellidos}
              onChangeText={setApellidos}
              maxLength={150}
            />
          ) : null}
          <AppInput label="Fecha de visita" value={fecha} editable={false} />
          <AppInput
            label="Descripción"
            value={descripcion}
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
          <AppButton
            label="Guardar visita comercial"
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
  }
});
