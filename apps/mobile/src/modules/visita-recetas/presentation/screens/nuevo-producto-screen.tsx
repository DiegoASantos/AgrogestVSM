import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
import { generatePublicId } from "../../../../shared/utils/local-id";
import { visitaRecetasRepository } from "../../repositories/visita-recetas.repository";
import { catalogoIngredientesActivosRepo, catalogoFertilizantesRepo, catalogoMarcasRepo } from "../../repositories/catalogo-repository-helpers";

type TipoProductoCatalog = { id: string; name: string };

type TipoProductoNuevo = "ingrediente" | "fertilizante" | "marca";

const OPCIONES_TIPO: AppSelectOption[] = [
  { value: "ingrediente", label: "Ingrediente activo" },
  { value: "fertilizante", label: "Fertilizante" },
  { value: "marca", label: "Marca comercial" }
];

export function NuevoProductoScreen() {
  const router = useRouter();
  const { tipoPredefinido } = useLocalSearchParams<{ tipoPredefinido?: string }>();

  const [tipo, setTipo] = useState<TipoProductoNuevo>(
    (tipoPredefinido as TipoProductoNuevo) || "ingrediente"
  );
  const [abrirTipo, setAbrirTipo] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [tipoFertilizante, setTipoFertilizante] = useState("solido");
  const [abrirTipoFertilizante, setAbrirTipoFertilizante] = useState(false);
  const [concentracion, setConcentracion] = useState("");
  const [unidadMedida, setUnidadMedida] = useState("");

  const [tiposProducto, setTiposProducto] = useState<TipoProductoCatalog[]>([]);
  const [tipoProductoId, setTipoProductoId] = useState("");
  const [abrirTipoProducto, setAbrirTipoProducto] = useState(false);
  const [ingredienteActivoId, setIngredienteActivoId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (tipo === "marca") cargarTiposProducto();
  }, [tipo]);

  function cargarTiposProducto() {
    const items = visitaRecetasRepository.getTiposProducto();
    setTiposProducto(items);
  }

  function validar(): string | null {
    if (!nombre.trim()) {
      return "El nombre es obligatorio.";
    }
    if (tipo === "fertilizante" && !tipoFertilizante) {
      return "El tipo de fertilizante es obligatorio.";
    }
    if (tipo === "marca" && !tipoProductoId) {
      return "El tipo de producto es obligatorio.";
    }
    return null;
  }

  async function guardar() {
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
        if (tipo === "ingrediente") {
          catalogoIngredientesActivosRepo.insertar({
            id, publicId: idPublico, name: nombre.trim(), description: descripcion.trim() || null,
            serverId: null, syncStatus: "pending", syncErrorMessage: null
          });
          insertSyncOutboxEntry(db, { entityType: "ingredientes_activos", entityLocalId: id, operation: "create", createdAt: ahora });
        } else if (tipo === "fertilizante") {
          catalogoFertilizantesRepo.insertar({
            id, publicId: idPublico, name: nombre.trim(), type: tipoFertilizante,
            concentracion: concentracion.trim() || null, unidadMedida: unidadMedida.trim() || null,
            serverId: null, syncStatus: "pending", syncErrorMessage: null
          });
          insertSyncOutboxEntry(db, { entityType: "fertilizantes", entityLocalId: id, operation: "create", createdAt: ahora });
        } else {
          catalogoMarcasRepo.insertar({
            id, publicId: idPublico, name: nombre.trim(), tipoProductoId: tipoProductoId,
            ingredienteActivoId: ingredienteActivoId || null, ingredienteActivoNombre: null,
            concentracion: concentracion.trim() || null, unidadMedida: unidadMedida.trim() || null,
            serverId: null, syncStatus: "pending", syncErrorMessage: null
          });
          insertSyncOutboxEntry(db, { entityType: "marcas_producto", entityLocalId: id, operation: "create", createdAt: ahora });
        }
      });

      router.back();
    } catch {
      setError("Error al guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  const etiquetaTipo = OPCIONES_TIPO.find((o) => o.value === tipo)?.label ?? "";
  const etiquetaTipoFert = tipoFertilizante === "solido" ? "Sólido" : "Líquido";
  const etiquetaTipoProducto = tiposProducto.find((t) => t.id === tipoProductoId)?.name;

  return (
    <ScreenContainer contentStyle={estilos.contenedor}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={estilos.scroll}>
        <AppText variant="title" style={estilos.titulo}>
          Nuevo producto
        </AppText>
        <AppText variant="body" style={estilos.subtitulo}>
          El producto se guarda localmente y se sincroniza cuando haya conexion.
        </AppText>

        <AppCard style={estilos.tarjeta}>
          <AppSelectField
            label="Tipo de producto"
            placeholder="Selecciona el tipo"
            icon="cube-outline"
            options={OPCIONES_TIPO}
            isOpen={abrirTipo}
            isLoading={false}
            selectedLabel={etiquetaTipo}
            onSelect={(valor) => {
              setTipo(valor as TipoProductoNuevo);
              setAbrirTipo(false);
              setNombre(""); setDescripcion(""); setConcentracion(""); setUnidadMedida("");
              setTipoProductoId(""); setIngredienteActivoId("");
              setError(null);
            }}
            onToggle={() => setAbrirTipo((p) => !p)}
            onClose={() => setAbrirTipo(false)}
          />

          <View style={estilos.separador} />

          <AppInput
            label={tipo === "marca" ? "Nombre comercial *" : "Nombre *"}
            placeholder={tipo === "ingrediente" ? "Ej: Azoxystrobin" : tipo === "fertilizante" ? "Ej: Nitrato de Potasio" : "Ej: Amistar Top"}
            value={nombre}
            onChangeText={setNombre}
          />

          {tipo === "ingrediente" ? (
            <AppInput
              label="Descripcion (opcional)"
              placeholder="Ej: Fungicida sistemico del grupo de las estrobilurinas"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
            />
          ) : null}

          {tipo === "fertilizante" ? (
            <>
              <AppSelectField
                label="Tipo *"
                icon="options-outline"
                placeholder="Seleccionar tipo"
                options={[{ value: "solido", label: "Sólido" }, { value: "liquido", label: "Líquido" }]}
                isOpen={abrirTipoFertilizante}
                isLoading={false}
                selectedLabel={etiquetaTipoFert}
                onSelect={(v) => { setTipoFertilizante(v); setAbrirTipoFertilizante(false); }}
                onToggle={() => setAbrirTipoFertilizante((p) => !p)}
                onClose={() => setAbrirTipoFertilizante(false)}
              />
              <AppInput label="Concentracion (opcional)" placeholder="Ej: 46" value={concentracion} onChangeText={setConcentracion} />
              <AppInput label="Unidad de medida (opcional)" placeholder="Ej: %" value={unidadMedida} onChangeText={setUnidadMedida} />
            </>
          ) : null}

          {tipo === "marca" ? (
            <>
              <AppSelectField
                label="Tipo de producto fitosanitario *"
                icon="pricetag-outline"
                placeholder="Seleccionar tipo de producto"
                options={tiposProducto.map((t) => ({ value: t.id, label: t.name }))}
                isOpen={abrirTipoProducto}
                isLoading={false}
                emptyMessage="No hay tipos de producto. Sincroniza los catalogos."
                selectedLabel={etiquetaTipoProducto}
                onSelect={(v) => { setTipoProductoId(v); setAbrirTipoProducto(false); }}
                onToggle={() => setAbrirTipoProducto((p) => !p)}
                onClose={() => setAbrirTipoProducto(false)}
              />
              <AppInput label="Concentracion (opcional)" placeholder="Ej: 325" value={concentracion} onChangeText={setConcentracion} />
              <AppInput label="Unidad de medida (opcional)" placeholder="Ej: g/L" value={unidadMedida} onChangeText={setUnidadMedida} />
            </>
          ) : null}
        </AppCard>

        {error ? (
          <View style={estilos.bannerError}>
            <AppText variant="caption" style={estilos.textoError}>{error}</AppText>
          </View>
        ) : null}

        <View style={estilos.acciones}>
          <AppButton
            label="Guardar producto"
            onPress={guardar}
            disabled={!nombre.trim() || guardando}
            loading={guardando}
            icon="save-outline"
          />
          <AppButton label="Cancelar" onPress={() => router.back()} variant="outline" />
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
  tarjeta: { padding: 16, gap: 14, backgroundColor: theme.colors.surface },
  separador: { height: 1, backgroundColor: theme.colors.borderLight },
  bannerError: {
    padding: 12, borderWidth: 1, borderColor: theme.colors.error,
    borderRadius: theme.radius.md, backgroundColor: theme.colors.errorMuted
  },
  textoError: { color: theme.colors.error },
  acciones: { gap: 10 }
});
