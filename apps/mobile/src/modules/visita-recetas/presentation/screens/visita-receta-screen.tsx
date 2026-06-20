import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { AppSelectField } from "../../../../shared/components/app-select-field";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { requestSync } from "../../../../shared/sync";
import { parcelasRepository } from "../../../parcelas/repositories/parcelas.repository";
import { visitasCampoRepository } from "../../../visitas-campo/repositories/visitas-campo.repository";
import { visitaRecetasService, type SaveRecetaData } from "../../services";
import type {
  ConsolidacionHallazgo,
  CoadyuvanteCatalogItem,
  ModoAccionCatalogItem,
  TipoControlCatalogItem,
  TipoProductoFitosanitarioCatalogItem,
  FertilizanteCatalogItem,
  VisitaRecetaCompleta
} from "../../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const COADYUVANTE_ORDER: Record<string, number> = {
  "Corrector de pH": 2,
  Adherente: 4,
  Tensoactivo: 3,
  Antideriva: 5,
  "Aceite penetrante": 5,
  Antiespumante: 6
};

function parsePositiveDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveCalculationAreaHectares(
  parcelaArea: string | number | null | undefined,
  visitaArea: string | number | null | undefined
) {
  return parsePositiveDecimal(parcelaArea) ?? parsePositiveDecimal(visitaArea);
}

function getEffectiveCalculationArea(areaHectares: number | null) {
  return areaHectares ?? 1;
}

function calculateTotalIa(
  dosisIa: string | number | null | undefined,
  volumenAplicacion: string | number | null | undefined,
  areaHectares: number | null
) {
  const dosis = parsePositiveDecimal(dosisIa);
  const volumen = parsePositiveDecimal(volumenAplicacion);

  return dosis && volumen ? dosis * volumen * getEffectiveCalculationArea(areaHectares) : 0;
}

function calculateTotalProducto(
  cantidadTotalIa: string | number | null | undefined,
  concentracionProducto: string | number | null | undefined
) {
  const totalIa = parsePositiveDecimal(cantidadTotalIa);
  const concentracion = parsePositiveDecimal(concentracionProducto);

  return totalIa && concentracion ? totalIa / concentracion : 0;
}

function formatCompactDecimal(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatCalculatedField(value: string | number | null | undefined) {
  const parsed = parsePositiveDecimal(value);
  return parsed ? parsed.toFixed(2) : "";
}

function toSingleParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function generateOrdenMezcla(coadyuvanteNombres: string[]): string[] {
  const orden: string[] = ["Agua"];
  const sortedAdyuvantes = [...coadyuvanteNombres].sort(
    (a, b) => (COADYUVANTE_ORDER[a] ?? 99) - (COADYUVANTE_ORDER[b] ?? 99)
  );
  const pHItem = sortedAdyuvantes.find((n) => n === "Corrector de pH");
  if (pHItem) orden.push(pHItem);
  orden.push("Producto agroquimico");
  for (const name of sortedAdyuvantes) {
    if (name !== "Corrector de pH") {
      orden.push(name);
    }
  }
  return orden;
}

export function VisitaRecetaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const visitaId = toSingleParam(params.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consolidacion, setConsolidacion] = useState<ConsolidacionHallazgo | null>(null);
  const [recetaData, setRecetaData] = useState<VisitaRecetaCompleta | null>(null);
  const [calculationAreaHectares, setCalculationAreaHectares] = useState<number | null>(
    null
  );

  const [coadyuvantes, setCoadyuvantes] = useState<CoadyuvanteCatalogItem[]>([]);
  const [modosAccion, setModosAccion] = useState<ModoAccionCatalogItem[]>([]);
  const [tiposControl, setTiposControl] = useState<TipoControlCatalogItem[]>([]);
  const [tiposProducto, setTiposProducto] = useState<
    TipoProductoFitosanitarioCatalogItem[]
  >([]);
  const [fertilizantes, setFertilizantes] = useState<FertilizanteCatalogItem[]>([]);

  const [fitosanidadApps, setFitosanidadApps] = useState<AppFitosanidad[]>([]);
  const [fertilizacion, setFertilizacion] = useState<AppFertilizacion>({
    viaAplicacion: "edafica",
    fertilizanteNombre: "",
    tipoProducto: "solido",
    dosis: "",
    cantidadTotalPlantas: "",
    volumenAplicacion: "",
    cantidadTotalFertilizante: ""
  });
  const [riegoSelection, setRiegoSelection] = useState<string | null>(null);
  const [laborSelections, setLaborSelections] = useState<Set<string>>(() => new Set());

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const loadRequestRef = useRef(0);

  useEffect(() => {
    if (!visitaId) {
      setIsLoading(false);
      setError("No se recibio una visita valida.");
      return;
    }
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    loadAll(visitaId, requestId);

    return () => {
      if (loadRequestRef.current === requestId) {
        loadRequestRef.current += 1;
      }
    };
  }, [visitaId]);

  function isActiveLoad(requestId: number) {
    return loadRequestRef.current === requestId;
  }

  function loadAll(vId: string, requestId: number) {
    setIsLoading(true);
    setError(null);
    try {
      const catalogos = visitaRecetasService.getCatalogos();
      setCoadyuvantes(catalogos.coadyuvantes);
      setModosAccion(catalogos.modosAccion);
      setTiposControl(catalogos.tiposControl);
      setTiposProducto(catalogos.tiposProducto);
      setFertilizantes(catalogos.fertilizantes);

      const visita = visitasCampoRepository.getById(vId);
      const parcela = visita ? parcelasRepository.getById(visita.parcelaId) : null;
      setCalculationAreaHectares(
        resolveCalculationAreaHectares(parcela?.areaHectares, visita?.areaHectares)
      );

      const localConsData = visitaRecetasService.getConsolidacionLocal(vId);
      const recetaData = visitaRecetasService.getByVisitaId(vId);

      if (!isActiveLoad(requestId)) {
        return;
      }

      setConsolidacion(localConsData);

      if (recetaData) {
        setRecetaData(recetaData);
        restoreFromReceta(recetaData);
      } else {
        setRecetaData(null);
        initFitosanidadFromConsolidacion(localConsData);
      }

      setIsLoading(false);
      void refreshConsolidacionFromRemote(vId, localConsData, Boolean(recetaData), requestId);
    } catch (err) {
      if (!isActiveLoad(requestId)) {
        return;
      }
      setError(toApiError(err).message || "No se pudo cargar la receta.");
      setIsLoading(false);
    }
  }

  async function refreshConsolidacionFromRemote(
    vId: string,
    localConsData: ConsolidacionHallazgo,
    hasSavedReceta: boolean,
    requestId: number
  ) {
    try {
      const remoteConsData = await visitaRecetasService.fetchConsolidacionFromRemote(vId);

      if (!isActiveLoad(requestId)) {
        return;
      }

      const resolvedConsData = hasFitosanidadFindings(remoteConsData)
        ? remoteConsData
        : hasFitosanidadFindings(localConsData)
          ? mergeFitosanidadConsolidacion(remoteConsData, localConsData)
          : remoteConsData;

      setConsolidacion(resolvedConsData);

      if (!hasSavedReceta && hasFitosanidadFindings(resolvedConsData)) {
        setFitosanidadApps((prev) =>
          prev.length > 0 ? prev : buildFitosanidadFromConsolidacion(resolvedConsData)
        );
      }
    } catch {
      // La receta ya funciona con datos locales; la red no debe bloquear esta vista.
    }
  }

  function hasFitosanidadFindings(cons: ConsolidacionHallazgo | null) {
    return Boolean(cons && (cons.plagas.length > 0 || cons.enfermedades.length > 0));
  }

  function mergeFitosanidadConsolidacion(
    remoteCons: ConsolidacionHallazgo | null,
    localCons: ConsolidacionHallazgo
  ): ConsolidacionHallazgo {
    return {
      ...(remoteCons ?? localCons),
      plagas: localCons.plagas,
      enfermedades: localCons.enfermedades
    };
  }

  function restoreFromReceta(receta: VisitaRecetaCompleta) {
    setFitosanidadApps(
      receta.fitosanidad.map((f) => ({
        localId: f.id,
        numero: f.numero,
        objetivo: f.objetivo,
        objetivoNombre: f.objetivoNombre,
        tipoControlId: f.tipoControlId ?? "",
        tipoProductoId: f.tipoProductoId ?? "",
        disolvente: f.disolvente,
        modoAccionId: f.modoAccionId ?? "",
        ingredienteActivoNombre: f.ingredienteActivoNombre ?? "",
        dosisIa: f.dosisIa?.toString() ?? "",
        volumenAplicacion: f.volumenAplicacion?.toString() ?? "",
        cantidadTotalIa: formatCalculatedField(f.cantidadTotalIa),
        marcaProductoNombre: f.marcaProductoNombre ?? "",
        concentracionProducto: f.concentracionProducto?.toString() ?? "",
        cantidadTotalProducto: formatCalculatedField(f.cantidadTotalProducto),
        coadyuvantesIds: parseJsonArray(f.coadyuvantesIds),
        ordenMezcla: parseJsonArray(f.ordenMezcla)
      }))
    );

    if (receta.fertilizacion.length > 0) {
      const first = receta.fertilizacion[0];
      setFertilizacion({
        viaAplicacion: first.viaAplicacion,
        fertilizanteNombre: first.fertilizanteNombre ?? "",
        tipoProducto: first.tipoProducto ?? "solido",
        dosis: first.dosis?.toString() ?? "",
        cantidadTotalPlantas: first.cantidadTotalPlantas?.toString() ?? "",
        volumenAplicacion: first.volumenAplicacion?.toString() ?? "",
        cantidadTotalFertilizante: first.cantidadTotalFertilizante?.toString() ?? ""
      });
    }

    if (receta.riego) {
      setRiegoSelection(receta.riego.tipoRecomendacion);
    }

    setLaborSelections(new Set(receta.labores.map((l) => l.labor)));
  }

  function initFitosanidadFromConsolidacion(cons: ConsolidacionHallazgo) {
    setFitosanidadApps(buildFitosanidadFromConsolidacion(cons));
  }

  function buildFitosanidadFromConsolidacion(cons: ConsolidacionHallazgo) {
    const apps: AppFitosanidad[] = [];
    let num = 1;

    for (const plaga of cons.plagas) {
      apps.push(createEmptyFitosanidad(num++, "plaga", plaga.nombre));
    }
    for (const enfermedad of cons.enfermedades) {
      apps.push(createEmptyFitosanidad(num++, "enfermedad", enfermedad.nombre));
    }

    return apps;
  }

  function createEmptyFitosanidad(
    numero: number,
    objetivo: "plaga" | "enfermedad",
    objetivoNombre: string
  ): AppFitosanidad {
    return {
      localId: `new_${numero}_${Date.now()}`,
      numero,
      objetivo,
      objetivoNombre,
      tipoControlId: "",
      tipoProductoId: "",
      disolvente: "Agua",
      modoAccionId: "",
      ingredienteActivoNombre: "",
      dosisIa: "",
      volumenAplicacion: "",
      cantidadTotalIa: "",
      marcaProductoNombre: "",
      concentracionProducto: "",
      cantidadTotalProducto: "",
      coadyuvantesIds: [],
      ordenMezcla: []
    };
  }

  function updateFitosanidadApp(index: number, patch: Partial<AppFitosanidad>) {
    setFitosanidadApps((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], ...patch };

      if (patch.dosisIa !== undefined || patch.volumenAplicacion !== undefined) {
        const totalIa = calculateTotalIa(
          current.dosisIa,
          current.volumenAplicacion,
          calculationAreaHectares
        );
        current.cantidadTotalIa = totalIa ? totalIa.toFixed(2) : "";
      }

      if (
        patch.cantidadTotalIa !== undefined ||
        patch.concentracionProducto !== undefined ||
        patch.dosisIa !== undefined ||
        patch.volumenAplicacion !== undefined
      ) {
        const totalProducto = calculateTotalProducto(
          current.cantidadTotalIa,
          current.concentracionProducto
        );
        current.cantidadTotalProducto = totalProducto ? totalProducto.toFixed(2) : "";
      }

      if (patch.coadyuvantesIds !== undefined) {
        const nombres = current.coadyuvantesIds
          .map((id) => coadyuvantes.find((c) => c.id === id)?.name ?? "")
          .filter(Boolean);
        current.ordenMezcla = generateOrdenMezcla(nombres);
      }

      updated[index] = current;
      return updated;
    });
  }

  function updateFertilizacionCalculos(patch: Partial<AppFertilizacion>) {
    setFertilizacion((prev) => {
      const current = { ...prev, ...patch };

      if (current.viaAplicacion === "edafica") {
        const dosis = parseFloat(current.dosis) || 0;
        const plantas = parseFloat(current.cantidadTotalPlantas) || 0;
        current.cantidadTotalFertilizante =
          dosis && plantas ? (dosis * plantas).toFixed(4) : "";
      } else {
        const dosis = parseFloat(current.dosis) || 0;
        const vol = parseFloat(current.volumenAplicacion) || 0;
        current.cantidadTotalFertilizante = dosis && vol ? (dosis * vol).toFixed(4) : "";
      }

      return current;
    });
  }

  async function handleSave() {
    if (!visitaId) return;
    setIsSaving(true);
    setSubmitError(null);

    try {
      const data: SaveRecetaData = {
        etapaFenologica: consolidacion?.etapaFenologica ?? null,
        fitosanidad: fitosanidadApps.map((app) => {
          const computedIa = calculateTotalIa(
            app.dosisIa,
            app.volumenAplicacion,
            calculationAreaHectares
          );
          const totalIa = computedIa || 0;
          const totalProducto = calculateTotalProducto(
            totalIa,
            app.concentracionProducto
          );

          return {
            numero: app.numero,
            objetivo: app.objetivo,
            objetivoNombre: app.objetivoNombre,
            tipoControlId: app.tipoControlId || null,
            tipoProductoId: app.tipoProductoId || null,
            disolvente: app.disolvente,
            modoAccionId: app.modoAccionId || null,
            ingredienteActivoNombre: app.ingredienteActivoNombre || null,
            dosisIa: parseFloat(app.dosisIa) || null,
            volumenAplicacion: parseFloat(app.volumenAplicacion) || null,
            cantidadTotalIa: totalIa || null,
            marcaProductoNombre: app.marcaProductoNombre || null,
            concentracionProducto: parseFloat(app.concentracionProducto) || null,
            cantidadTotalProducto: totalProducto || null,
            coadyuvantesIds:
              app.coadyuvantesIds.length > 0 ? JSON.stringify(app.coadyuvantesIds) : null,
            ordenMezcla:
              app.ordenMezcla.length > 0 ? JSON.stringify(app.ordenMezcla) : null
          };
        }),
        fertilizacion: [
          {
            viaAplicacion: fertilizacion.viaAplicacion,
            fertilizanteNombre: fertilizacion.fertilizanteNombre || null,
            tipoProducto: fertilizacion.tipoProducto,
            dosis: parseFloat(fertilizacion.dosis) || null,
            unidadDosis: getUnidadDosis(),
            cantidadTotalPlantas:
              parseInt(fertilizacion.cantidadTotalPlantas, 10) || null,
            volumenAplicacion: parseFloat(fertilizacion.volumenAplicacion) || null,
            cantidadTotalFertilizante:
              parseFloat(fertilizacion.cantidadTotalFertilizante) || null
          }
        ],
        riego: riegoSelection ? { tipoRecomendacion: riegoSelection } : null,
        labores: Array.from(laborSelections)
      };

      visitaRecetasService.save(visitaId, data);

      try {
        await requestSync({ forceRefresh: true, immediate: true });
      } catch (syncError) {
        console.warn("No se pudo sincronizar la receta despues de guardarla.", syncError);
      }

      const updated = visitaRecetasService.getByVisitaId(visitaId);
      setRecetaData(updated);

      if (updated?.syncStatus !== "error") {
        router.replace("/visitas-campo/historial");
      }
    } catch (err) {
      setSubmitError(toApiError(err).message || "No se pudo guardar la receta.");
    } finally {
      setIsSaving(false);
    }
  }

  function getUnidadDosis(): string {
    if (fertilizacion.viaAplicacion === "edafica") {
      return fertilizacion.tipoProducto === "liquido" ? "L/planta" : "Kg/planta";
    }
    return fertilizacion.tipoProducto === "liquido" ? "L/cilindro" : "Kg/cilindro";
  }

  function goBackToSteps() {
    if (!visitaId) {
      router.back();
      return;
    }
    router.replace({
      pathname: "/visitas-campo/[id]/labores-culturales",
      params: { id: visitaId }
    });
  }

  function toggleDropdown(key: string) {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.centeredContainer}>
          <AppText variant="muted">Cargando receta...</AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.centeredContainer}>
          <AppText variant="heading">Error</AppText>
          <AppText variant="muted">{error}</AppText>
          <AppButton label="Volver" onPress={() => goBackToSteps()} />
        </View>
      </ScreenContainer>
    );
  }

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
                onPress={goBackToSteps}
                style={styles.backIconButton}
              >
                <Ionicons color="#ffffff" name="arrow-back" size={24} />
              </Pressable>
              <AppText style={styles.topBarTitle} variant="heading">
                Receta
              </AppText>
            </View>
          </SafeAreaView>

          <View style={styles.heroContent}>
            <AppText style={styles.heroTitle} variant="title">
              Recomendaciones tecnicas
            </AppText>
            <AppText style={styles.heroSubtitle} variant="body">
              {consolidacion?.etapaFenologica ?? "Etapa fenologica"}
            </AppText>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {consolidacion ? <ConsolidacionPanel data={consolidacion} /> : null}

          <SectionHeader
            icon="flask"
            label="Fitosanidad"
            subtitle="Aplicaciones fitosanitarias"
          />

          {fitosanidadApps.length === 0 ? (
            <AppCard>
              <AppText variant="muted">
                No se detectaron plagas ni enfermedades en los pasos previos.
              </AppText>
            </AppCard>
          ) : (
            fitosanidadApps.map((app, index) => (
              <FitosanidadCard
                coadyuvantes={coadyuvantes}
                calculationAreaHectares={calculationAreaHectares}
                index={index}
                key={app.localId}
                modosAccion={modosAccion}
                onChange={(patch) => updateFitosanidadApp(index, patch)}
                openDropdown={openDropdown}
                tiposControl={tiposControl}
                tiposProducto={tiposProducto}
                toggleDropdown={toggleDropdown}
                value={app}
              />
            ))
          )}

          <SectionHeader
            icon="nutrition"
            label="Fertilizacion"
            subtitle="Recomendacion de fertilizantes"
          />

          <FertilizacionCard
            fertilizantes={fertilizantes}
            onChange={updateFertilizacionCalculos}
            openDropdown={openDropdown}
            toggleDropdown={toggleDropdown}
            value={fertilizacion}
          />

          <SectionHeader icon="water" label="Riego" subtitle="Recomendacion de riego" />

          <RiegoSection onSelect={setRiegoSelection} selected={riegoSelection} />

          <SectionHeader
            icon="construct"
            label="Labores"
            subtitle="Recomendacion de labores culturales"
          />

          <LaboresSection
            onToggle={(labor) => {
              setLaborSelections((prev) => {
                const next = new Set(prev);
                if (next.has(labor)) {
                  next.delete(labor);
                } else {
                  next.add(labor);
                }
                return next;
              });
            }}
            selected={laborSelections}
          />

          {submitError ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.submitErrorText} variant="label">
                {submitError}
              </AppText>
            </View>
          ) : null}

          {recetaData?.syncStatus === "error" && recetaData.syncErrorMessage ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.submitErrorText} variant="label">
                Error de sincronizacion: {recetaData.syncErrorMessage}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void handleSave()}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.pressedButton
              ]}
            >
              <AppText style={styles.continueButtonText} variant="heading">
                {isSaving ? "Guardando..." : "Finalizar receta"}
              </AppText>
              <Ionicons color="#ffffff" name="checkmark-circle" size={22} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionHeader({
  icon,
  label,
  subtitle
}: {
  icon: IoniconName;
  label: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons color={theme.colors.primaryDark} name={icon} size={22} />
      </View>
      <View style={styles.sectionHeaderText}>
        <AppText style={styles.sectionTitle} variant="heading">
          {label}
        </AppText>
        <AppText variant="muted">{subtitle}</AppText>
      </View>
    </View>
  );
}

function ConsolidacionPanel({ data }: { data: ConsolidacionHallazgo }) {
  return (
    <View style={styles.consolidacionCard}>
      <AppText style={styles.consolidacionTitle} variant="heading">
        Hallazgos consolidados
      </AppText>

      {data.etapaFenologica ? (
        <AppText variant="muted" style={styles.consolidacionLine}>
          Etapa fenologica: {data.etapaFenologica}
        </AppText>
      ) : null}

      {data.plagas.length > 0 ? (
        <View style={styles.consolidacionGroup}>
          <AppText variant="label">Plagas detectadas</AppText>
          {data.plagas.map((p, i) => (
            <AppText key={i} variant="muted">
              - {p.nombre}: Incidencia {p.incidencia}, Severidad {p.severidad}
              {p.organos.length > 0 ? ` (${p.organos.join(", ")})` : ""}
            </AppText>
          ))}
        </View>
      ) : null}

      {data.enfermedades.length > 0 ? (
        <View style={styles.consolidacionGroup}>
          <AppText variant="label">Enfermedades detectadas</AppText>
          {data.enfermedades.map((e, i) => (
            <AppText key={i} variant="muted">
              - {e.nombre}: Incidencia {e.incidencia}, Severidad {e.severidad}
              {e.organos.length > 0 ? ` (${e.organos.join(", ")})` : ""}
            </AppText>
          ))}
        </View>
      ) : null}

      {data.nutricion.length > 0 ? (
        <View style={styles.consolidacionGroup}>
          <AppText variant="label">Elementos deficitarios</AppText>
          {data.nutricion.map((n, i) => (
            <AppText key={i} variant="muted">
              - {n.elemento}: Incidencia {n.incidencia}, Severidad {n.severidad}
            </AppText>
          ))}
        </View>
      ) : null}

      {data.riego.humedadSuelo ? (
        <View style={styles.consolidacionGroup}>
          <AppText variant="label">Riego</AppText>
          <AppText variant="muted">
            Humedad del suelo: {data.riego.humedadSuelo}
            {data.riego.estresHidrico ? " (estres hidrico)" : ""}
          </AppText>
        </View>
      ) : null}

      {data.labores.length > 0 ? (
        <View style={styles.consolidacionGroup}>
          <AppText variant="label">Labores detectadas</AppText>
          {data.labores.map((l, i) => (
            <AppText key={i} variant="muted">
              - {l.nombre} ({l.categoria})
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type AppFitosanidad = {
  localId: string;
  numero: number;
  objetivo: "plaga" | "enfermedad";
  objetivoNombre: string;
  tipoControlId: string;
  tipoProductoId: string;
  disolvente: string;
  modoAccionId: string;
  ingredienteActivoNombre: string;
  dosisIa: string;
  volumenAplicacion: string;
  cantidadTotalIa: string;
  marcaProductoNombre: string;
  concentracionProducto: string;
  cantidadTotalProducto: string;
  coadyuvantesIds: string[];
  ordenMezcla: string[];
};

function FitosanidadCard({
  value,
  index,
  coadyuvantes,
  calculationAreaHectares,
  tiposControl,
  tiposProducto,
  modosAccion,
  openDropdown,
  onChange,
  toggleDropdown
}: {
  value: AppFitosanidad;
  index: number;
  coadyuvantes: CoadyuvanteCatalogItem[];
  calculationAreaHectares: number | null;
  tiposControl: TipoControlCatalogItem[];
  tiposProducto: TipoProductoFitosanitarioCatalogItem[];
  modosAccion: ModoAccionCatalogItem[];
  openDropdown: string | null;
  onChange: (patch: Partial<AppFitosanidad>) => void;
  toggleDropdown: (key: string) => void;
}) {
  const prefix = `fito_${index}`;

  return (
    <View style={styles.fitosanidadCard}>
      <View style={styles.fitoHeader}>
        <View style={styles.fitoBadge}>
          <AppText style={styles.fitoBadgeText} variant="eyebrow">
            {String(value.numero).padStart(2, "0")}
          </AppText>
        </View>
        <View style={styles.fitoHeaderText}>
          <AppText variant="heading">
            {value.objetivoNombre} ({value.objetivo === "plaga" ? "Plaga" : "Enfermedad"})
          </AppText>
        </View>
      </View>

      <AppSelectField
        icon="shield-checkmark"
        label="Tipo de control"
        options={tiposControl.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Seleccionar tipo"
        selectedLabel={tiposControl.find((c) => c.id === value.tipoControlId)?.name}
        isOpen={openDropdown === `${prefix}_control`}
        onToggle={() => toggleDropdown(`${prefix}_control`)}
        onSelect={(v) => onChange({ tipoControlId: v })}
      />

      <AppSelectField
        icon="flask"
        label="Tipo de producto"
        options={tiposProducto.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Seleccionar producto"
        selectedLabel={tiposProducto.find((c) => c.id === value.tipoProductoId)?.name}
        isOpen={openDropdown === `${prefix}_producto`}
        onToggle={() => toggleDropdown(`${prefix}_producto`)}
        onSelect={(v) => onChange({ tipoProductoId: v })}
      />

      <LabeledTextInput
        label="Disolvente"
        value={value.disolvente}
        onChangeText={(v) => onChange({ disolvente: v })}
      />

      <AppSelectField
        icon="move"
        label="Modo de accion"
        options={modosAccion.map((c) => ({ value: c.id, label: c.name }))}
        placeholder="Seleccionar modo"
        selectedLabel={modosAccion.find((c) => c.id === value.modoAccionId)?.name}
        isOpen={openDropdown === `${prefix}_modo`}
        onToggle={() => toggleDropdown(`${prefix}_modo`)}
        onSelect={(v) => onChange({ modoAccionId: v })}
      />

      <LabeledTextInput
        label="Ingrediente activo (i.a.)"
        value={value.ingredienteActivoNombre}
        onChangeText={(v) => onChange({ ingredienteActivoNombre: v })}
        placeholder="Ej: Abamectina"
      />

      <LabeledNumericInput
        label="Dosis (mg o mL/cilindro i.a.)"
        value={value.dosisIa}
        onChangeText={(v) => onChange({ dosisIa: v })}
      />

      <LabeledNumericInput
        label="Volumen de aplicacion (cilindros/ha)"
        value={value.volumenAplicacion}
        onChangeText={(v) => onChange({ volumenAplicacion: v })}
      />

      {calculationAreaHectares !== null ? (
        <AppText style={styles.calculationAreaHint} variant="caption">
          Area usada para el calculo: {formatCompactDecimal(calculationAreaHectares)} ha
        </AppText>
      ) : null}

      <ReadonlyField
        label="Cantidad total de i.a. (mg o mL)"
        value={value.cantidadTotalIa}
      />

      <LabeledTextInput
        label="Marca de producto"
        value={value.marcaProductoNombre}
        onChangeText={(v) => onChange({ marcaProductoNombre: v })}
        placeholder="Ej: Agrimec"
      />

      <LabeledNumericInput
        label="Concentracion en producto (mg o mL i.a./L)"
        value={value.concentracionProducto}
        onChangeText={(v) => onChange({ concentracionProducto: v })}
      />

      <ReadonlyField
        label="Cantidad total de producto (L)"
        value={value.cantidadTotalProducto}
      />

      <AppText variant="label" style={styles.fieldLabel}>
        Coadyuvantes
      </AppText>
      <View style={styles.chipContainer}>
        {coadyuvantes.map((c) => {
          const selected = value.coadyuvantesIds.includes(c.id);
          return (
            <Pressable
              key={c.id}
              onPress={() => {
                const next = selected
                  ? value.coadyuvantesIds.filter((id) => id !== c.id)
                  : [...value.coadyuvantesIds, c.id];
                onChange({ coadyuvantesIds: next });
              }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <AppText
                style={[styles.chipText, selected && styles.chipTextSelected]}
                variant="caption"
              >
                {selected ? "✓ " : ""}
                {c.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {value.ordenMezcla.length > 0 ? (
        <View style={styles.ordenContainer}>
          <AppText variant="label">Orden de mezcla</AppText>
          {value.ordenMezcla.map((item, i) => (
            <AppText key={i} variant="muted">
              {i + 1}°: {item}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type AppFertilizacion = {
  viaAplicacion: "edafica" | "foliar";
  fertilizanteNombre: string;
  tipoProducto: "solido" | "liquido";
  dosis: string;
  cantidadTotalPlantas: string;
  volumenAplicacion: string;
  cantidadTotalFertilizante: string;
};

function FertilizacionCard({
  value,
  fertilizantes,
  openDropdown,
  onChange,
  toggleDropdown
}: {
  value: AppFertilizacion;
  fertilizantes: FertilizanteCatalogItem[];
  openDropdown: string | null;
  onChange: (patch: Partial<AppFertilizacion>) => void;
  toggleDropdown: (key: string) => void;
}) {
  const unidadDosis =
    value.viaAplicacion === "edafica"
      ? value.tipoProducto === "liquido"
        ? "L/planta"
        : "Kg/planta"
      : value.tipoProducto === "liquido"
        ? "L/cilindro"
        : "Kg/cilindro";

  return (
    <View style={styles.fertilizacionCard}>
      <AppSelectField
        icon="leaf"
        label="Via de aplicacion"
        options={[
          { value: "edafica", label: "Edafica" },
          { value: "foliar", label: "Foliar" }
        ]}
        placeholder="Seleccionar via"
        selectedLabel={value.viaAplicacion === "edafica" ? "Edafica" : "Foliar"}
        isOpen={openDropdown === "fert_via"}
        onToggle={() => toggleDropdown("fert_via")}
        onSelect={(v) => onChange({ viaAplicacion: v as "edafica" | "foliar" })}
      />

      <AppSelectField
        icon="nutrition"
        label="Fertilizante"
        options={fertilizantes.map((f) => ({
          value: f.name,
          label: f.name,
          helper: f.type === "solido" ? "Solido" : "Liquido"
        }))}
        placeholder="Seleccionar fertilizante"
        selectedLabel={value.fertilizanteNombre || undefined}
        isOpen={openDropdown === "fert_fertilizante"}
        onToggle={() => toggleDropdown("fert_fertilizante")}
        onSelect={(v) => {
          const fert = fertilizantes.find((f) => f.name === v);
          onChange({
            fertilizanteNombre: v,
            tipoProducto: fert?.type ?? value.tipoProducto
          });
        }}
      />

      <AppSelectField
        icon="cube"
        label="Tipo de producto"
        options={[
          { value: "solido", label: "Solido" },
          { value: "liquido", label: "Liquido" }
        ]}
        placeholder="Seleccionar tipo"
        selectedLabel={value.tipoProducto === "solido" ? "Solido" : "Liquido"}
        isOpen={openDropdown === "fert_tipo"}
        onToggle={() => toggleDropdown("fert_tipo")}
        onSelect={(v) => onChange({ tipoProducto: v as "solido" | "liquido" })}
      />

      <LabeledNumericInput
        label={`Dosis (${unidadDosis})`}
        value={value.dosis}
        onChangeText={(v) => onChange({ dosis: v })}
      />

      {value.viaAplicacion === "edafica" ? (
        <LabeledNumericInput
          label="Cantidad total de plantas (unidades)"
          value={value.cantidadTotalPlantas}
          onChangeText={(v) => onChange({ cantidadTotalPlantas: v })}
        />
      ) : (
        <LabeledNumericInput
          label="Volumen de aplicacion (cilindros/ha x ha totales)"
          value={value.volumenAplicacion}
          onChangeText={(v) => onChange({ volumenAplicacion: v })}
        />
      )}

      <ReadonlyField
        label={`Cantidad total de fertilizante (${
          value.viaAplicacion === "edafica"
            ? value.tipoProducto === "liquido"
              ? "L"
              : "Kg"
            : value.tipoProducto === "liquido"
              ? "L"
              : "Kg"
        })`}
        value={value.cantidadTotalFertilizante}
      />
    </View>
  );
}

function RiegoSection({
  selected,
  onSelect
}: {
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  const options: Array<{
    key: string;
    label: string;
    description: string;
    icon: IoniconName;
  }> = [
    {
      key: "riego_pesado",
      label: "Riego pesado",
      description: "Aplicar grandes volumenes de agua sobre la superficie del terreno.",
      icon: "water-outline"
    },
    {
      key: "riego_ligero",
      label: "Riego ligero",
      description:
        "Aplicar una lamina de agua de bajo volumen para humedecer superficialmente.",
      icon: "water"
    },
    {
      key: "inicio_agoste",
      label: "Agoste",
      description:
        "Suspension o restriccion controlada del riego para inducir el manejo fenologico del cultivo.",
      icon: "pause-circle-outline"
    }
  ];

  return (
    <View style={styles.riegoCard}>
      {options.map((opt) => {
        const isSel = selected === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={[styles.riegoOption, isSel && styles.riegoOptionSelected]}
          >
            <Ionicons
              color={isSel ? theme.colors.primary : theme.colors.textMuted}
              name={opt.icon}
              size={28}
            />
            <View style={styles.riegoOptionText}>
              <AppText variant="label" style={isSel && { color: theme.colors.primary }}>
                {opt.label}
              </AppText>
              <AppText variant="muted">{opt.description}</AppText>
            </View>
            {isSel ? (
              <Ionicons color={theme.colors.primary} name="checkmark-circle" size={24} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function LaboresSection({
  selected,
  onToggle
}: {
  selected: Set<string>;
  onToggle: (labor: string) => void;
}) {
  const options: Array<{
    key: string;
    label: string;
    description: string;
    icon: IoniconName;
  }> = [
    {
      key: "limpieza_maleza_pala",
      label: "Limpieza de maleza con pala",
      description: "Eliminacion de hierbas con herramienta de campo.",
      icon: "cut-outline"
    },
    {
      key: "limpieza_maleza_motoguadana",
      label: "Limpieza con motoguadana",
      description: "Eliminacion de hierbas con herramienta mecanizada de rapido avance.",
      icon: "hardware-chip-outline"
    },
    {
      key: "horqueteo",
      label: "Horqueteo",
      description:
        "Colocar horquetas de madera bajo ramas principales para sostener peso de fruta.",
      icon: "git-branch-outline"
    },
    {
      key: "enzunchado",
      label: "Enzunchado",
      description:
        "Amarrar y asegurar ramas principales hacia el centro para evitar quiebres.",
      icon: "link-outline"
    },
    {
      key: "recoleccion_frutos",
      label: "Recoleccion de frutos caidos",
      description: "Evitar que plagas completen su ciclo biologico en el suelo.",
      icon: "trash-outline"
    },
    {
      key: "trampas_mosca",
      label: "Trampas de mosca",
      description: "Monitoreo y captura masiva de mosca de la fruta.",
      icon: "bug-outline"
    }
  ];

  return (
    <View style={styles.laboresCard}>
      {options.map((opt) => {
        const isSel = selected.has(opt.key);
        return (
          <Pressable
            key={opt.key}
            onPress={() => onToggle(opt.key)}
            style={[styles.laborOption, isSel && styles.laborOptionSelected]}
          >
            <Ionicons
              color={isSel ? theme.colors.primary : theme.colors.textMuted}
              name={opt.icon}
              size={26}
            />
            <View style={styles.laborOptionText}>
              <AppText variant="label" style={isSel && { color: theme.colors.primary }}>
                {opt.label}
              </AppText>
              <AppText variant="muted">{opt.description}</AppText>
            </View>
            <Ionicons
              color={isSel ? theme.colors.primary : theme.colors.border}
              name={isSel ? "checkbox" : "square-outline"}
              size={24}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function LabeledTextInput({
  label,
  value,
  onChangeText,
  placeholder
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <AppText variant="label" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function LabeledNumericInput({
  label,
  value,
  onChangeText
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <AppText variant="label" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        inputMode="decimal"
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={theme.colors.textMuted}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldWrapper}>
      <AppText variant="label" style={styles.fieldLabel}>
        {label}
      </AppText>
      <View style={styles.readonlyField}>
        <AppText
          style={value ? styles.readonlyValue : styles.readonlyPlaceholder}
          variant="body"
        >
          {value || "Calculado automaticamente"}
        </AppText>
      </View>
    </View>
  );
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    paddingBottom: 24
  },
  centeredContainer: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  hero: {
    minHeight: 320,
    overflow: "hidden",
    paddingHorizontal: 0,
    paddingTop: 0
  },
  heroImage: {
    opacity: 0.82
  },
  heroContent: {
    gap: 10,
    paddingBottom: 34,
    paddingHorizontal: 24,
    paddingTop: 34
  },
  heroTitle: {
    color: theme.colors.primaryDark,
    fontSize: 40,
    lineHeight: 45,
    maxWidth: 300
  },
  heroSubtitle: {
    color: "#173f2d",
    maxWidth: 320
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  topBarTitle: {
    color: theme.colors.textInverse,
    fontSize: 22
  },
  backIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: theme.radius.full,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  body: {
    gap: 20,
    padding: theme.spacing.md,
    paddingTop: 24
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: "#eaf3dc",
    borderRadius: theme.radius.full,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  sectionHeaderText: {
    flex: 1,
    gap: 3
  },
  sectionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 18
  },
  consolidacionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    ...theme.shadow.sm
  },
  consolidacionTitle: {
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  consolidacionLine: {
    paddingLeft: 4
  },
  consolidacionGroup: {
    gap: 4
  },
  fitosanidadCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...theme.shadow.sm
  },
  fitoHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 4
  },
  fitoBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  fitoBadgeText: {
    color: theme.colors.textInverse
  },
  fitoHeaderText: {
    flex: 1
  },
  fieldWrapper: {
    gap: 6
  },
  fieldLabel: {
    fontSize: 13
  },
  textInput: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  readonlyField: {
    backgroundColor: theme.colors.infoMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  readonlyValue: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  readonlyPlaceholder: {
    color: theme.colors.textMuted,
    fontStyle: "italic"
  },
  calculationAreaHint: {
    color: theme.colors.textMuted,
    marginTop: -8,
    paddingHorizontal: 2
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary
  },
  chipText: {
    color: theme.colors.textMuted
  },
  chipTextSelected: {
    color: theme.colors.primary
  },
  ordenContainer: {
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.sm,
    gap: 4,
    padding: 12
  },
  fertilizacionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 16,
    ...theme.shadow.sm
  },
  riegoCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...theme.shadow.sm
  },
  riegoOption: {
    alignItems: "center",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14
  },
  riegoOptionSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary
  },
  riegoOptionText: {
    flex: 1
  },
  laboresCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    ...theme.shadow.sm
  },
  laborOption: {
    alignItems: "center",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14
  },
  laborOptionSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary
  },
  laborOptionText: {
    flex: 1
  },
  errorBanner: {
    backgroundColor: theme.colors.errorMuted,
    borderRadius: theme.radius.md,
    padding: 12
  },
  submitErrorText: {
    color: theme.colors.error,
    textAlign: "center"
  },
  actions: {
    paddingVertical: 16
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingVertical: 16
  },
  pressedButton: {
    opacity: 0.8
  },
  continueButtonText: {
    color: theme.colors.textInverse,
    fontSize: 18
  }
});
