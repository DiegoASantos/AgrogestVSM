import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import {
  AppButton,
  AppCard,
  AppInput,
  AppSelectField,
  type AppSelectOption,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { getNowIsoString } from "../../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../../shared/database/sync-outbox";
import { getDatabase } from "../../../../shared/database/connection";
import { productoresRepository } from "../../repositories/productores.repository";
import { tiposDocumentoRepository } from "../../../tipos-documento/repositories/tipos-documento.repository";
import { generatePublicId } from "../../../../shared/utils/local-id";

const OPCIONES_TIPO_ENTIDAD: AppSelectOption[] = [
  { value: "persona", label: "Persona" },
  { value: "fundo", label: "Fundo" },
  { value: "cooperativa", label: "Cooperativa" }
];

export function NuevoProductorScreen() {
  const router = useRouter();
  const [tipoEntidad, setTipoEntidad] = useState<"persona" | "fundo" | "cooperativa">("persona");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [tipoDocumentoId, setTipoDocumentoId] = useState<string>("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [abrirTipoEntidad, setAbrirTipoEntidad] = useState(false);
  const [abrirTipoDocumento, setAbrirTipoDocumento] = useState(false);

  const [opcionesTipoDocumento, setOpcionesTipoDocumento] = useState<AppSelectOption[]>([]);

  useEffect(() => {
    cargarTiposDocumento();
  }, []);

  function cargarTiposDocumento() {
    const documentos = tiposDocumentoRepository.obtenerTodos();
    setOpcionesTipoDocumento(
      documentos.map((doc) => ({
        value: String(doc.id),
        label: `${doc.code} — ${doc.name}`
      }))
    );
  }

  function validar(): string | null {
    const nombresNormalizados = nombres.trim();
    const apellidosNormalizados = apellidos.trim();
    const documentoNormalizado = numeroDocumento.trim();
    const telefonoNormalizado = telefono.trim();
    const emailNormalizado = email.trim();

    if (!nombresNormalizados) {
      return "El nombre es obligatorio.";
    }
    if (nombresNormalizados.length > 100) {
      return "El nombre no puede superar 100 caracteres.";
    }
    if (tipoEntidad === "persona" && !apellidosNormalizados) {
      return "Los apellidos son obligatorios para personas.";
    }
    if (apellidosNormalizados.length > 100) {
      return "Los apellidos no pueden superar 100 caracteres.";
    }
    const tieneTipo = tipoDocumentoId !== "";
    const tieneNumero = documentoNormalizado !== "";
    if (tipoEntidad === "persona" && tieneTipo !== tieneNumero) {
      return "Tipo y numero de documento deben registrarse juntos.";
    }
    if (tieneTipo && (!Number.isInteger(Number(tipoDocumentoId)) || Number(tipoDocumentoId) < 1)) {
      return "El tipo de documento no es valido.";
    }
    if (tipoEntidad === "persona" && tieneTipo && tieneNumero) {
      const tipoDoc = tiposDocumentoRepository.obtenerPorId(Number(tipoDocumentoId));

      if (tipoDoc) {
        const errorDocumento = validarPorTipoDocumento(tipoDoc.code, documentoNormalizado);
        if (errorDocumento) {
          return errorDocumento;
        }
      }
    }
    if (telefonoNormalizado.length > 20) {
      return "El telefono no puede superar 20 caracteres.";
    }
    if (
      emailNormalizado &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado) ||
        emailNormalizado.length > 150)
    ) {
      return "Ingresa un email valido de hasta 150 caracteres.";
    }
    return null;
  }

  async function guardarProductor() {
    const errorValidacion = validar();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setGuardando(true);
    setError(null);

    try {
      const id = generatePublicId();
      const idPublico = generatePublicId();
      const ahora = getNowIsoString();

      const db = getDatabase();
      db.withTransactionSync(() => {
        productoresRepository.insert({
          id,
          publicId: idPublico,
          entityType: tipoEntidad,
          documentTypeId:
            tipoEntidad === "persona" && tipoDocumentoId
              ? Number(tipoDocumentoId)
              : null,
          documentNumber:
            tipoEntidad === "persona" ? numeroDocumento.trim() || null : null,
          firstName: nombres.trim(),
          lastName: tipoEntidad === "persona" ? apellidos.trim() || null : null,
          phone: telefono.trim() || null,
          email: email.trim().toLowerCase() || null,
          address: direccion.trim() || null,
          isActive: true,
          createdAt: ahora,
          updatedAt: ahora,
          serverId: null,
          syncStatus: "pending" as const,
          syncErrorMessage: null
        });

        insertSyncOutboxEntry(db, {
          entityType: "productores",
          entityLocalId: id,
          operation: "create",
          createdAt: ahora
        });
      });

      router.replace({
        pathname: "/visitas-campo/nueva",
        params: {
          nuevoProductorId: id,
          nuevoProductorLabel: construirEtiqueta()
        }
      });
    } catch {
      setError("Error al guardar el productor.");
    } finally {
      setGuardando(false);
    }
  }

  function construirEtiqueta() {
    const nombreCompleto = [nombres.trim(), apellidos.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    return nombreCompleto || numeroDocumento || "Nuevo productor";
  }

  const esPersona = tipoEntidad === "persona";
  const etiquetaTipoEntidad =
    OPCIONES_TIPO_ENTIDAD.find((o) => o.value === tipoEntidad)?.label ?? "Persona";
  const etiquetaTipoDocumento =
    opcionesTipoDocumento.find((o) => o.value === tipoDocumentoId)?.label;

  return (
    <ScreenContainer contentStyle={estilos.contenedor}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={estilos.scroll}>
        <AppText variant="title" style={estilos.titulo}>
          Nuevo productor
        </AppText>
        <AppText variant="body" style={estilos.subtitulo}>
          Completa los datos obligatorios y, si lo deseas, los opcionales. La parcela puede agregarse despues.
        </AppText>

        <AppCard style={estilos.tarjetaObligatoria}>
          <View style={estilos.encabezadoSeccion}>
            <View style={estilos.badgeObligatorio} />
            <AppText variant="eyebrow" style={estilos.tituloSeccionObligatoria}>
              Datos obligatorios
            </AppText>
          </View>

          <AppSelectField
            label="Tipo de entidad"
            placeholder="Selecciona el tipo"
            icon="people-outline"
            options={OPCIONES_TIPO_ENTIDAD}
            isOpen={abrirTipoEntidad}
            isLoading={false}
            onSelect={(valor) => {
              setTipoEntidad(valor as typeof tipoEntidad);
              setAbrirTipoEntidad(false);
              if (valor !== "persona") {
                setTipoDocumentoId("");
                setNumeroDocumento("");
                setApellidos("");
              }
            }}
            onToggle={() => setAbrirTipoEntidad((prev) => !prev)}
            onClose={() => setAbrirTipoEntidad(false)}
            selectedLabel={etiquetaTipoEntidad}
          />

          <View style={estilos.separador} />

          <AppInput
            label={esPersona ? "Nombres *" : "Nombre de la entidad *"}
            placeholder={esPersona ? "Ej: Juan Carlos" : "Ej: Fundo San Pedro"}
            value={nombres}
            onChangeText={setNombres}
          />

          {esPersona ? (
            <AppInput
              label="Apellidos *"
              placeholder="Ej: Perez Lopez"
              value={apellidos}
              onChangeText={setApellidos}
            />
          ) : null}
        </AppCard>

        <AppCard style={estilos.tarjetaOpcional}>
          <View style={estilos.encabezadoSeccion}>
            <AppText variant="eyebrow" style={estilos.tituloSeccionOpcional}>
              Datos opcionales
            </AppText>
          </View>

          {esPersona ? (
            <>
              <AppText variant="label" style={estilos.subtituloSeccion}>
                Documento
              </AppText>
              <AppSelectField
                label="Tipo de documento"
                placeholder="Selecciona el tipo"
                icon="card-outline"
                options={opcionesTipoDocumento}
                isOpen={abrirTipoDocumento}
                isLoading={false}
                emptyMessage="No hay tipos de documento. Sincroniza los catalogos."
                onSelect={(valor) => {
                  setTipoDocumentoId(valor);
                  setAbrirTipoDocumento(false);
                }}
                onToggle={() => setAbrirTipoDocumento((prev) => !prev)}
                onClose={() => setAbrirTipoDocumento(false)}
                selectedLabel={etiquetaTipoDocumento}
              />
              <AppInput
                label="Numero de documento"
                placeholder="Ej: 12345678"
                value={numeroDocumento}
                onChangeText={setNumeroDocumento}
              />

              <View style={estilos.separador} />
            </>
          ) : null}

          <AppText variant="label" style={estilos.subtituloSeccion}>
            Contacto
          </AppText>
          <AppInput
            label="Telefono"
            placeholder="Ej: 987654321"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Email"
            placeholder="Ej: productor@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppInput
            label="Direccion"
            placeholder="Ej: Av. Principal 123"
            value={direccion}
            onChangeText={setDireccion}
          />
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
            label="Guardar productor"
            onPress={guardarProductor}
            disabled={!nombres.trim() || guardando}
            loading={guardando}
            icon="save-outline"
          />
          <AppButton
            label="Cancelar"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>

        <AppText style={estilos.notaOffline} variant="caption">
          El productor se guarda localmente y se sincroniza cuando haya conexion.
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
}

const estilos = StyleSheet.create({
  contenedor: { paddingHorizontal: 0, paddingVertical: 0 },
  scroll: { padding: 18, gap: 14 },
  titulo: { color: theme.colors.primaryDark, marginBottom: 4 },
  subtitulo: { color: theme.colors.textMuted, marginBottom: 4 },

  tarjetaObligatoria: {
    padding: 16,
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary
  },
  tarjetaOpcional: {
    padding: 16,
    gap: 14,
    backgroundColor: theme.colors.surfaceElevated
  },

  encabezadoSeccion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  badgeObligatorio: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: theme.colors.primary
  },
  tituloSeccionObligatoria: {
    color: theme.colors.primaryDark,
    letterSpacing: 1.5
  },
  tituloSeccionOpcional: {
    color: theme.colors.textMuted,
    letterSpacing: 1.5
  },
  subtituloSeccion: {
    color: theme.colors.text,
    marginBottom: -6
  },

  separador: { height: 1, backgroundColor: theme.colors.borderLight },

  bannerError: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  textoError: { color: theme.colors.error },

  acciones: { gap: 10 },
  notaOffline: { textAlign: "center" }
});

const REGLAS_DOCUMENTO: Record<string, { digitos: number; etiqueta: string }> = {
  DNI: { digitos: 8, etiqueta: "DNI" },
  RUC: { digitos: 11, etiqueta: "RUC" },
  CE: { digitos: 9, etiqueta: "CE" }
};

function validarPorTipoDocumento(codigo: string, numero: string): string | null {
  const regla = REGLAS_DOCUMENTO[codigo];

  if (regla) {
    if (!/^\d+$/.test(numero)) {
      return `El numero de ${regla.etiqueta} debe contener solo digitos.`;
    }
    if (numero.length !== regla.digitos) {
      return `El ${regla.etiqueta} debe tener exactamente ${regla.digitos} digitos.`;
    }
    return null;
  }

  if (numero.length > 20) {
    return "El numero de documento no puede superar 20 caracteres.";
  }

  return null;
}
