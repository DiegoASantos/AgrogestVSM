import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppButton,
  AppCard,
  AppText,
  FormScrollView,
  ScreenContainer
} from "../../../../shared/components";
import { AppSelectField } from "../../../../shared/components/app-select-field";
import { theme } from "../../../../shared/constants/theme";
import { useCatalogDownloadStatus } from "../../../../shared/database/catalog-download-state";
import { toApiError } from "../../../../shared/services";
import { scheduleSync } from "../../../../shared/sync";
import { parcelasRepository } from "../../../parcelas/repositories/parcelas.repository";
import { visitasCampoRepository } from "../../../visitas-campo/repositories/visitas-campo.repository";
import {
  construirMensajeAdvertencia,
  validarMezcla
} from "../../domain/validacion-mezclas";
import { visitaRecetasService, type SaveRecetaData } from "../../services";
import type {
  ConsolidacionHallazgo,
  CoadyuvanteCatalogItem,
  IngredienteActivoCatalogItem,
  ModoAccionCatalogItem,
  MarcaProductoCatalogItem,
  TipoControlCatalogItem,
  TipoProductoFitosanitarioCatalogItem,
  FertilizanteCatalogItem,
  VisitaRecetaCompleta
} from "../../types";
import {
  generateOrdenMezcla,
  isOrdenMezclaFixedItem,
  swapOrdenMezclaItems
} from "./visita-receta-order";
import {
  buildCommercialSelectionPatch,
  buildIngredientSelectionPatch,
  buildTypeSelectionPatch,
  getCommercialOptions,
  getIngredientOptions,
  resolveCommercialSelectionPatch
} from "./visita-receta-selection";
import {
  buildFertilizacionesForSave,
  buildMezclasForSave,
  calculateTotal,
  collectNomenclaturaPorMezcla,
  createEmptyMezcla,
  createEmptyFertilizacion,
  createEmptyIngrediente,
  getUnidadDosis,
  hasFertilizacionData,
  hasFitosanidadData,
  parsePositiveDecimal,
  deriveMezclaFactors,
  factorFromGrade,
  recalculateFertilizacion,
  recalculateIngrediente,
  restoreFertilizaciones,
  restoreFitosanidadApps,
  restoreMezclas,
  type AppFertilizacion,
  type AppFitosanidad,
  type AppIngrediente,
  type AppMezcla
} from "./visita-receta-multiple-products";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VISITA_HERO_IMAGE = require("../../../../../assets/images/parcelas.webp");

type IoniconName = ComponentProps<typeof Ionicons>["name"];

function formatCatalogConcentration(concentration: string, measurementUnit: string) {
  return [concentration.trim(), measurementUnit.trim()].filter(Boolean).join(" ");
}

function toSingleParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
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

  const [coadyuvantes, setCoadyuvantes] = useState<CoadyuvanteCatalogItem[]>([]);
  const [ingredientesActivos, setIngredientesActivos] = useState<
    IngredienteActivoCatalogItem[]
  >([]);
  const [marcasProducto, setMarcasProducto] = useState<MarcaProductoCatalogItem[]>([]);
  const [modosAccion, setModosAccion] = useState<ModoAccionCatalogItem[]>([]);
  const [tiposControl, setTiposControl] = useState<TipoControlCatalogItem[]>([]);
  const [tiposProducto, setTiposProducto] = useState<
    TipoProductoFitosanitarioCatalogItem[]
  >([]);
  const [fertilizantes, setFertilizantes] = useState<FertilizanteCatalogItem[]>([]);

  const [fitosanidadApps, setFitosanidadApps] = useState<AppFitosanidad[]>([]);
  const [mezclas, setMezclas] = useState<AppMezcla[]>([]);
  const [fertilizaciones, setFertilizaciones] = useState<AppFertilizacion[]>(() => [
    createEmptyFertilizacion()
  ]);
  const [riegoSelection, setRiegoSelection] = useState<string | null>(null);
  const [laborSelections, setLaborSelections] = useState<Set<string>>(() => new Set());

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [ordenExchangeResetToken, setOrdenExchangeResetToken] = useState(0);
  const loadRequestRef = useRef(0);
  const compatibilityAlertOpenRef = useRef(false);
  const catalogDownloadStatus = useCatalogDownloadStatus();
  const catalogDownloadWasActiveRef = useRef(catalogDownloadStatus.isDownloading);

  useFocusEffect(
    useCallback(() => {
      const catalogos = visitaRecetasService.getCatalogos();
      setIngredientesActivos(catalogos.ingredientesActivos);
      setMarcasProducto(catalogos.marcasProducto);
      setFertilizantes(catalogos.fertilizantes);
    }, [])
  );

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

  useEffect(() => {
    const downloadWasActive = catalogDownloadWasActiveRef.current;
    catalogDownloadWasActiveRef.current = catalogDownloadStatus.isDownloading;

    if (
      !downloadWasActive ||
      catalogDownloadStatus.isDownloading ||
      catalogDownloadStatus.error
    ) {
      return;
    }

    const catalogos = visitaRecetasService.getCatalogos();
    setCoadyuvantes(catalogos.coadyuvantes);
    setIngredientesActivos(catalogos.ingredientesActivos);
    setMarcasProducto(catalogos.marcasProducto);
    setModosAccion(catalogos.modosAccion);
    setTiposControl(catalogos.tiposControl);
    setTiposProducto(catalogos.tiposProducto);
    setFertilizantes(catalogos.fertilizantes);

    setFitosanidadApps((currentApps) =>
      currentApps.map((current) => {
        return {
          ...current,
          ingredientes: current.ingredientes.map((ingredient) => {
            const selectionPatch = resolveCommercialSelectionPatch(
              ingredient.marcaProductoNombre,
              catalogos.marcasProducto
            );

            if (!selectionPatch) return ingredient;

            return {
              ...ingredient,
              ...selectionPatch
            };
          })
        };
      })
    );

    setFertilizaciones((currentItems) =>
      currentItems.map((current) => {
        const selected = catalogos.fertilizantes.find(
          (fertilizante) =>
            fertilizante.name.trim().toLowerCase() ===
            current.fertilizanteNombre.trim().toLowerCase()
        );

        return selected
          ? {
              ...current,
              fertilizanteNombre: selected.name,
              tipoProducto: selected.type,
              concentracion: selected.concentracion ?? "",
              unidadMedida: selected.unidadMedida ?? ""
            }
          : current;
      })
    );
  }, [catalogDownloadStatus.error, catalogDownloadStatus.isDownloading]);

  function isActiveLoad(requestId: number) {
    return loadRequestRef.current === requestId;
  }

  function loadAll(vId: string, requestId: number) {
    setIsLoading(true);
    setError(null);
    try {
      const catalogos = visitaRecetasService.getCatalogos();
      setCoadyuvantes(catalogos.coadyuvantes);
      setIngredientesActivos(catalogos.ingredientesActivos);
      setMarcasProducto(catalogos.marcasProducto);
      setModosAccion(catalogos.modosAccion);
      setTiposControl(catalogos.tiposControl);
      setTiposProducto(catalogos.tiposProducto);
      setFertilizantes(catalogos.fertilizantes);

      const visita = visitasCampoRepository.getById(vId);
      const parcela = visita ? parcelasRepository.getById(visita.parcelaId) : null;
      const localConsData = visitaRecetasService.getConsolidacionLocal(vId);
      const recetaData = visitaRecetasService.getByVisitaId(vId);

      if (!isActiveLoad(requestId)) {
        return;
      }

      setConsolidacion(localConsData);

      let volumenPorDefecto = { fitosanidad: "", fertilizacion: "" };

      if (recetaData) {
        setRecetaData(recetaData);
        restoreFromReceta(
          recetaData,
          catalogos.ingredientesActivos,
          catalogos.marcasProducto,
          catalogos.fertilizantes
        );
      } else if (localConsData) {
        if (parcela) {
          volumenPorDefecto = visitaRecetasService.obtenerUltimoVolumenAplicacion(
            parcela.id
          );
        }
        initFitosanidadFromConsolidacion(localConsData, volumenPorDefecto.fitosanidad);
        setFertilizaciones((prev) =>
          prev.map((item, index) => {
            const grade = localConsData.nutricion[index]?.incidenceGrade ?? 0;
            return recalculateFertilizacion({
              ...item,
              volumenAplicacion:
                index === 0 && volumenPorDefecto.fertilizacion
                  ? volumenPorDefecto.fertilizacion
                  : item.volumenAplicacion,
              factor: factorFromGrade(grade).toString(),
              factorEditable: grade === 3
            });
          })
        );
      }

      setIsLoading(false);
      void refreshConsolidacionFromRemote(
        vId,
        localConsData,
        Boolean(recetaData),
        requestId
      );
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
        setFitosanidadApps((prev) => {
          if (prev.length > 0) return prev;
          const apps = buildFitosanidadFromConsolidacion(resolvedConsData);
          setMezclas(
            deriveMezclaFactors(
              apps,
              apps.map((_, index) => createEmptyMezcla(index + 1))
            )
          );
          return apps;
        });
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

  function restoreFromReceta(
    receta: VisitaRecetaCompleta,
    ingredientCatalog: IngredienteActivoCatalogItem[],
    commercialCatalog: MarcaProductoCatalogItem[],
    fertilizerCatalog: FertilizanteCatalogItem[]
  ) {
    setFitosanidadApps(
      restoreFitosanidadApps(receta.mezclas, ingredientCatalog, commercialCatalog)
    );
    setMezclas(restoreMezclas(receta.mezclas));
    setFertilizaciones(restoreFertilizaciones(receta.fertilizacion, fertilizerCatalog));

    if (receta.riego) {
      setRiegoSelection(receta.riego.tipoRecomendacion);
    }

    setLaborSelections(new Set(receta.labores.map((l) => l.labor)));
  }

  function initFitosanidadFromConsolidacion(
    cons: ConsolidacionHallazgo,
    volumenPorDefecto = ""
  ) {
    const apps = buildFitosanidadFromConsolidacion(cons);
    setFitosanidadApps(apps);
    setMezclas(
      deriveMezclaFactors(
        apps,
        apps.map((_, index) => createEmptyMezcla(index + 1, volumenPorDefecto))
      )
    );
  }

  function buildFitosanidadFromConsolidacion(cons: ConsolidacionHallazgo) {
    const apps: AppFitosanidad[] = [];
    let num = 1;

    for (const plaga of cons.plagas) {
      apps.push(
        createEmptyFitosanidad(num++, "plaga", plaga.nombre, plaga.incidenceGrade)
      );
    }
    for (const enfermedad of cons.enfermedades) {
      apps.push(
        createEmptyFitosanidad(
          num++,
          "enfermedad",
          enfermedad.nombre,
          enfermedad.incidenceGrade
        )
      );
    }

    return apps;
  }

  function createEmptyFitosanidad(
    numero: number,
    objetivo: "plaga" | "enfermedad",
    objetivoNombre: string,
    incidenceGrade: number
  ): AppFitosanidad {
    return {
      localId: `new_${numero}_${Date.now()}`,
      numero,
      objetivo,
      objetivoNombre,
      incidenceGrade,
      tipoControlId: "",
      disolvente: "Agua",
      ingredientes: [createEmptyIngrediente(0)]
    };
  }

  function updateFitosanidadApp(index: number, patch: Partial<AppFitosanidad>) {
    setFitosanidadApps((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], ...patch };

      updated[index] = current;
      return updated;
    });
  }

  function addIngrediente(applicationIndex: number) {
    closeDropdown();
    const projected = fitosanidadApps.map((application, index) =>
      index === applicationIndex
        ? {
            ...application,
            ingredientes: [
              ...application.ingredientes,
              createEmptyIngrediente(0)
            ]
          }
        : application
    );
    setFitosanidadApps(projected);
    setMezclas((current) => regenerateMezclas(current, projected));
  }

  function removeIngrediente(applicationIndex: number, ingredientIndex: number) {
    closeDropdown();
    const projected = fitosanidadApps.map((application, index) =>
      index === applicationIndex && application.ingredientes.length > 1
        ? {
            ...application,
            ingredientes: application.ingredientes.filter(
              (_, currentIndex) => currentIndex !== ingredientIndex
            )
          }
        : application
    );
    setFitosanidadApps(projected);
    setMezclas((current) => regenerateMezclas(current, projected));
  }

  function updateIngrediente(
    applicationIndex: number,
    ingredientIndex: number,
    patch: Partial<AppIngrediente>
  ) {
    const projected = fitosanidadApps.map((application, currentApplicationIndex) => {
      if (currentApplicationIndex !== applicationIndex) return application;

      return {
        ...application,
        ingredientes: application.ingredientes.map(
          (ingredient, currentIngredientIndex) =>
            currentIngredientIndex === ingredientIndex
              ? recalculateIngrediente(
                  { ...ingredient, ...patch },
                  mezclas.find(
                    (mezcla) =>
                      mezcla.numero === (patch.mezclaNumero ?? ingredient.mezclaNumero)
                  )
                )
              : ingredient
        )
      };
    });
    setFitosanidadApps(projected);
    setMezclas((current) => regenerateMezclas(current, projected));
  }

  function regenerateMezclas(current: AppMezcla[], applications: AppFitosanidad[]) {
    return deriveMezclaFactors(applications, current).map((mezcla) => {
      const coadyuvanteNames = mezcla.coadyuvantesIds
        .map((id) => coadyuvantes.find((item) => item.id === id)?.name ?? "")
        .filter(Boolean);
      const commercialNames = applications.flatMap((application) =>
        application.ingredientes
          .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
          .map((ingredient) => ingredient.marcaProductoNombre)
          .filter(Boolean)
      );
      const totalProductos = applications.reduce((sum, application) => {
        return sum + application.ingredientes
          .filter((ingredient) => ingredient.mezclaNumero === mezcla.numero)
          .reduce((acc, ing) => acc + (calculateTotal(ing.dosisProducto, mezcla.volumenAplicacion, mezcla.factor) || 0), 0);
      }, 0);
      return {
        ...mezcla,
        ordenMezcla: generateOrdenMezcla(coadyuvanteNames, commercialNames),
        cantidadTotalProducto: totalProductos ? totalProductos.toFixed(2) : ""
      };
    });
  }

  function updateMezcla(index: number, patch: Partial<AppMezcla>) {
    const next = mezclas.map((mezcla, currentIndex) =>
      currentIndex === index ? { ...mezcla, ...patch } : mezcla
    );
    const resolved =
      patch.coadyuvantesIds !== undefined
        ? regenerateMezclas(next, fitosanidadApps)
        : deriveMezclaFactors(fitosanidadApps, next);
    setMezclas(resolved);
    setFitosanidadApps((applications) =>
      applications.map((application) => ({
        ...application,
        ingredientes: application.ingredientes.map((ingredient) =>
          recalculateIngrediente(
            ingredient,
            resolved.find((mezcla) => mezcla.numero === ingredient.mezclaNumero)
          )
        )
      }))
    );
  }

  function asignarProductoMezcla(ingredientLocalId: string, mezclaNumero: number) {
    setFitosanidadApps((prev) => {
      const next = prev.map((app) => ({
        ...app,
        ingredientes: app.ingredientes.map((ing) => {
          if (ing.localId !== ingredientLocalId) return ing;
          const estaAsignado = ing.mezclaNumero === mezclaNumero;
          return { ...ing, mezclaNumero: estaAsignado ? 0 : mezclaNumero };
        })
      }));
      setMezclas((currentMezclas) => deriveMezclaFactors(next, currentMezclas));
      return next;
    });
  }

  function updateMezclaCount(value: string) {
    const parsed = Number.parseInt(value, 10);
    const count = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(20, parsed));
    if (count === 0) {
      setMezclas([]);
      return;
    }
    const next = Array.from(
      { length: count },
      (_, index) =>
        mezclas[index] ??
        createEmptyMezcla(index + 1, mezclas[0]?.volumenAplicacion ?? "")
    );
    const projected = fitosanidadApps.map((application) => ({
      ...application,
      ingredientes: application.ingredientes.map((ingredient) => ({
        ...ingredient,
        mezclaNumero: Math.min(ingredient.mezclaNumero, count)
      }))
    }));
    setFitosanidadApps(projected);
    setMezclas(regenerateMezclas(next, projected));
  }

  function addFertilizacion() {
    closeDropdown();
    setFertilizaciones((prev) => {
      const grade = consolidacion?.nutricion[prev.length]?.incidenceGrade ?? 0;
      return [
        ...prev,
        {
          ...createEmptyFertilizacion(prev[0]?.volumenAplicacion ?? ""),
          factor: factorFromGrade(grade).toString(),
          factorEditable: grade === 3
        }
      ];
    });
  }

  function removeFertilizacion(index: number) {
    closeDropdown();
    setFertilizaciones((prev) =>
      prev.length > 1 ? prev.filter((_, currentIndex) => currentIndex !== index) : prev
    );
  }

  function updateFertilizacion(index: number, patch: Partial<AppFertilizacion>) {
    setFertilizaciones((prev) =>
      prev.map((fertilizacion, currentIndex) => {
        if (currentIndex !== index) return fertilizacion;

        const current = { ...fertilizacion, ...patch };
        if (patch.viaAplicacion !== undefined || patch.tipoProducto !== undefined) {
          current.unidadDosis = getUnidadDosis(current);
        }

        return recalculateFertilizacion(current);
      })
    );
  }

  function handleSave() {
    if (!visitaId || isSaving || compatibilityAlertOpenRef.current) return;
    resetOrdenExchangeState();
    const recetaValidation = validateRequiredRecipe(
      fitosanidadApps,
      mezclas,
      fertilizaciones,
      riegoSelection,
      laborSelections
    );

    if (recetaValidation) {
      setSubmitError(recetaValidation);
      return;
    }

    const advertencias = collectNomenclaturaPorMezcla(
      fitosanidadApps,
      mezclas,
      coadyuvantes
    ).flatMap(({ numero, nombres }) =>
      validarMezcla(nombres).map((advertencia) => ({
        ...advertencia,
        mezclaNumero: numero
      }))
    );

    if (advertencias.length > 0) {
      compatibilityAlertOpenRef.current = true;
      Alert.alert(
        "Revisar compatibilidad de la mezcla",
        construirMensajeAdvertencia(advertencias),
        [
          {
            text: "Volver a editar",
            style: "cancel",
            onPress: () => {
              compatibilityAlertOpenRef.current = false;
            }
          },
          {
            text: "Continuar de todos modos",
            onPress: () => {
              compatibilityAlertOpenRef.current = false;
              void persistReceta(visitaId);
            }
          }
        ],
        {
          cancelable: true,
          onDismiss: () => {
            compatibilityAlertOpenRef.current = false;
          }
        }
      );
      return;
    }

    void persistReceta(visitaId);
  }

  async function persistReceta(vId: string) {
    setIsSaving(true);
    setSubmitError(null);

    try {
      const data: SaveRecetaData = {
        etapaFenologica: consolidacion?.etapaFenologica ?? null,
        mezclas: buildMezclasForSave(fitosanidadApps, mezclas),
        fertilizacion: buildFertilizacionesForSave(fertilizaciones),
        riego: riegoSelection ? { tipoRecomendacion: riegoSelection } : null,
        labores: Array.from(laborSelections)
      };

      visitaRecetasService.save(vId, data);

      const updated = visitaRecetasService.getByVisitaId(vId);
      setRecetaData(updated);

      Alert.alert("Finalizar receta", "Desea finalizar y enviar la receta?", [
        {
          text: "Seguir editando",
          style: "cancel"
        },
        {
          text: "Enviar",
          onPress: () => {
            void scheduleSync({ immediate: true });
            router.replace("/visitas-campo/historial");
          }
        }
      ]);
    } catch (err) {
      setSubmitError(toApiError(err).message || "No se pudo guardar la receta.");
    } finally {
      setIsSaving(false);
    }
  }

  function goBackToSteps() {
    resetOrdenExchangeState();
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
    resetOrdenExchangeState();
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  function closeDropdown() {
    setOpenDropdown(null);
  }

  function resetOrdenExchangeState() {
    setOrdenExchangeResetToken((value) => value + 1);
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
      <FormScrollView contentContainerStyle={styles.scrollContent}>
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
            subtitle={`${fitosanidadApps.reduce(
              (total, application) => total + application.ingredientes.length,
              0
            )} producto(s) en ${fitosanidadApps.length} aplicación(es)`}
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
                index={index}
                ingredientesActivos={ingredientesActivos}
                key={app.localId}
                marcasProducto={marcasProducto}
                mezclas={mezclas}
                modosAccion={modosAccion}
                onAddIngrediente={() => addIngrediente(index)}
                onChange={(patch) => updateFitosanidadApp(index, patch)}
                onChangeIngrediente={(ingredientIndex, patch) =>
                  updateIngrediente(index, ingredientIndex, patch)
                }
                onCloseDropdown={closeDropdown}
                onRemoveIngrediente={(ingredientIndex) =>
                  removeIngrediente(index, ingredientIndex)
                }
                openDropdown={openDropdown}
                tiposControl={tiposControl}
                tiposProducto={tiposProducto}
                toggleDropdown={toggleDropdown}
                onNavegarCatalogo={(tipo) =>
                  router.push(`/productos/nuevo?tipoPredefinido=${tipo}`)
                }
                value={app}
              />
            ))
          )}

          {fitosanidadApps.length > 0 ? (
            <>
              <SectionHeader
                icon="beaker"
                label="Mezclas"
                subtitle={`${mezclas.length} tanque(s) de preparación`}
              />
              <LabeledNumericInput
                label="¿Cuántas mezclas va a preparar?"
                value={String(mezclas.length)}
                onChangeText={updateMezclaCount}
              />
              {mezclas.map((mezcla, index) => (
                <MezclaCard
                  coadyuvantes={coadyuvantes}
                  fitosanidadApps={fitosanidadApps}
                  key={mezcla.localId}
                  onChange={(patch) => updateMezcla(index, patch)}
                  onAsignarProducto={asignarProductoMezcla}
                  resetToken={ordenExchangeResetToken}
                  value={mezcla}
                />
              ))}
            </>
          ) : null}

          <SectionHeader
            icon="nutrition"
            label="Fertilización"
            subtitle={`${fertilizaciones.length} fertilizante(s) recomendado(s)`}
          />

          {fertilizaciones.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <Ionicons
                color={theme.colors.textMuted}
                name="nutrition-outline"
                size={28}
              />
              <AppText style={styles.emptyProductsTitle} variant="label">
                Aún no agregaste fertilizantes
              </AppText>
              <AppText style={styles.emptyProductsText} variant="muted">
                Agrega el primer producto para completar esta recomendación.
              </AppText>
              <AddItemButton
                accessibilityLabel="Agregar primer fertilizante"
                label="Agregar fertilizante"
                onPress={addFertilizacion}
              />
            </View>
          ) : (
            fertilizaciones.map((fertilizacion, index) => (
              <FertilizacionCard
                canRemove={fertilizaciones.length > 1}
                fertilizantes={fertilizantes}
                index={index}
                key={fertilizacion.localId}
                onChange={(patch) => updateFertilizacion(index, patch)}
                onCloseDropdown={closeDropdown}
                onRemove={() => removeFertilizacion(index)}
                openDropdown={openDropdown}
                toggleDropdown={toggleDropdown}
                onNavegarCatalogo={(tipo) =>
                  router.push(`/productos/nuevo?tipoPredefinido=${tipo}`)
                }
                value={fertilizacion}
              />
            ))
          )}

          {fertilizaciones.length > 0 ? (
            <AddItemButton
              accessibilityLabel="Agregar otro fertilizante"
              label="Agregar otro fertilizante"
              onPress={addFertilizacion}
            />
          ) : null}

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
              accessibilityLabel="Finalizar receta"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={handleSave}
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
      </FormScrollView>
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

function FitosanidadCard({
  value,
  index,
  ingredientesActivos,
  marcasProducto,
  tiposControl,
  tiposProducto,
  modosAccion,
  mezclas,
  openDropdown,
  onAddIngrediente,
  onChange,
  onChangeIngrediente,
  onCloseDropdown,
  onRemoveIngrediente,
  toggleDropdown,
  onNavegarCatalogo
}: {
  value: AppFitosanidad;
  index: number;
  ingredientesActivos: IngredienteActivoCatalogItem[];
  marcasProducto: MarcaProductoCatalogItem[];
  tiposControl: TipoControlCatalogItem[];
  tiposProducto: TipoProductoFitosanitarioCatalogItem[];
  modosAccion: ModoAccionCatalogItem[];
  mezclas: AppMezcla[];
  openDropdown: string | null;
  onAddIngrediente: () => void;
  onChange: (patch: Partial<AppFitosanidad>) => void;
  onChangeIngrediente: (index: number, patch: Partial<AppIngrediente>) => void;
  onCloseDropdown: () => void;
  onRemoveIngrediente: (index: number) => void;
  toggleDropdown: (key: string) => void;
  onNavegarCatalogo: (tipo: string) => void;
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
          <AppText variant="caption">
            {value.ingredientes.length} ingrediente(s) activo(s)
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
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_control`)}
        onSelect={(v) => onChange({ tipoControlId: v })}
      />

      <LabeledTextInput
        label="Disolvente"
        value={value.disolvente}
        onChangeText={(v) => onChange({ disolvente: v })}
      />

      <View style={styles.ingredientList}>
        {value.ingredientes.map((ingredient, ingredientIndex) => (
            <IngredienteCard
              canRemove={value.ingredientes.length > 1}
              index={ingredientIndex}
              ingredientesActivos={ingredientesActivos}
              key={ingredient.localId}
              marcasProducto={marcasProducto}
              mezclas={mezclas}
              modosAccion={modosAccion}
              onChange={(patch) => onChangeIngrediente(ingredientIndex, patch)}
              onCloseDropdown={onCloseDropdown}
            onRemove={() => onRemoveIngrediente(ingredientIndex)}
            openDropdown={openDropdown}
            prefix={`${prefix}_ingrediente_${ingredientIndex}`}
            tiposProducto={tiposProducto}
            toggleDropdown={toggleDropdown}
            onNavegarCatalogo={onNavegarCatalogo}
            total={value.ingredientes.length}
            value={ingredient}
          />
        ))}
      </View>

      <AddItemButton
        accessibilityLabel={`Agregar otro producto para ${value.objetivoNombre}`}
        label="Agregar otro producto"
        onPress={onAddIngrediente}
      />
    </View>
  );
}

function IngredienteCard({
  value,
  index,
  total,
  prefix,
  canRemove,
  ingredientesActivos,
  marcasProducto,
  modosAccion,
  mezclas,
  tiposProducto,
  openDropdown,
  onChange,
  onCloseDropdown,
  onRemove,
  toggleDropdown,
  onNavegarCatalogo
}: {
  value: AppIngrediente;
  index: number;
  total: number;
  prefix: string;
  canRemove: boolean;
  ingredientesActivos: IngredienteActivoCatalogItem[];
  marcasProducto: MarcaProductoCatalogItem[];
  modosAccion: ModoAccionCatalogItem[];
  mezclas: AppMezcla[];
  tiposProducto: TipoProductoFitosanitarioCatalogItem[];
  openDropdown: string | null;
  onChange: (patch: Partial<AppIngrediente>) => void;
  onCloseDropdown: () => void;
  onRemove: () => void;
  toggleDropdown: (key: string) => void;
  onNavegarCatalogo: (tipo: string) => void;
}) {
  const ingredienteActivoOptions = getIngredientOptions(
    value.tipoProductoId,
    ingredientesActivos,
    marcasProducto
  );
  const nombreComercialOptions = getCommercialOptions(
    value.tipoProductoId,
    value.ingredienteActivoId,
    marcasProducto
  );

  function handleNombreComercialSelect(marcaProductoId: string) {
    const selected = nombreComercialOptions.find(
      (option) => option.id === marcaProductoId
    );
    if (selected) onChange(buildCommercialSelectionPatch(selected));
  }

  return (
    <View style={styles.ingredientCard}>
      <View style={styles.itemCardHeader}>
        <View style={styles.itemCardTitle}>
          <Ionicons color={theme.colors.primary} name="leaf-outline" size={20} />
          <AppText variant="label">
            Ingrediente activo {index + 1} de {total}
          </AppText>
        </View>
        {canRemove ? (
          <RemoveItemButton
            accessibilityLabel={`Quitar ingrediente activo ${index + 1}`}
            label="Quitar"
            onPress={onRemove}
          />
        ) : null}
      </View>

      <AppSelectField
        icon="beaker"
        label="Mezcla"
        options={[
          { value: "0", label: "Sin asignar" },
          ...mezclas.map((m) => ({ value: String(m.numero), label: `Mezcla ${m.numero}` }))
        ]}
        placeholder="Asignar a una mezcla"
        selectedLabel={
          value.mezclaNumero === 0
            ? "Sin asignar"
            : `Mezcla ${value.mezclaNumero}`
        }
        isOpen={openDropdown === `${prefix}_mezcla`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_mezcla`)}
        onSelect={(v) => onChange({ mezclaNumero: Number(v) })}
      />

      <AppSelectField
        icon="flask"
        label="Tipo de producto"
        options={tiposProducto.map((item) => ({ value: item.id, label: item.name }))}
        placeholder="Seleccionar producto"
        selectedLabel={
          tiposProducto.find((item) => item.id === value.tipoProductoId)?.name
        }
        isOpen={openDropdown === `${prefix}_producto`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_producto`)}
        onSelect={(tipoProductoId) =>
          onChange(
            buildTypeSelectionPatch(tipoProductoId, ingredientesActivos, marcasProducto)
          )
        }
      />

      <AppSelectField
        icon="move"
        label="Modo de accion"
        options={modosAccion.map((item) => ({ value: item.id, label: item.name }))}
        placeholder="Seleccionar modo"
        selectedLabel={modosAccion.find((item) => item.id === value.modoAccionId)?.name}
        isOpen={openDropdown === `${prefix}_modo`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_modo`)}
        onSelect={(modoAccionId) => onChange({ modoAccionId })}
      />

      <AppSelectField
        disabled={!value.tipoProductoId}
        emptyMessage="No hay ingredientes activos para el tipo seleccionado."
        icon="leaf-outline"
        label="Ingrediente activo (i.a.)"
        options={ingredienteActivoOptions.map((item) => ({
          value: item.id,
          label: item.name
        }))}
        placeholder={
          value.tipoProductoId
            ? "Seleccionar ingrediente activo"
            : "Selecciona primero tipo de producto"
        }
        selectedLabel={value.ingredienteActivoNombre || undefined}
        isOpen={openDropdown === `${prefix}_ingrediente_activo`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_ingrediente_activo`)}
        onSelect={(ingredienteActivoId) =>
          onChange(
            buildIngredientSelectionPatch(
              value.tipoProductoId,
              ingredienteActivoId,
              ingredientesActivos,
              marcasProducto
            )
          )
        }
      />

      <AppButton
        icon="add-circle-outline"
        label="Nuevo ingrediente"
        onPress={() => onNavegarCatalogo("ingrediente")}
        size="small"
        variant="outline"
      />

      <AppSelectField
        disabled={!value.ingredienteActivoId}
        emptyMessage="No hay nombres comerciales para el ingrediente seleccionado."
        icon="pricetag-outline"
        label="Nombre comercial"
        options={nombreComercialOptions.map((item) => ({
          value: item.id,
          label: item.name
        }))}
        placeholder={
          value.ingredienteActivoId
            ? "Seleccionar nombre comercial"
            : "Selecciona primero ingrediente activo"
        }
        selectedLabel={value.marcaProductoNombre || undefined}
        isOpen={openDropdown === `${prefix}_nombre_comercial`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_nombre_comercial`)}
        onSelect={handleNombreComercialSelect}
      />

      <AppButton
        icon="add-circle-outline"
        label="Nueva marca"
        onPress={() => onNavegarCatalogo("marca")}
        size="small"
        variant="outline"
      />

      <LabeledNumericInput
        label="Dosis de producto comercial (mg o mL/cilindro)"
        value={value.dosisProducto}
        onChangeText={(dosisProducto) => onChange({ dosisProducto })}
      />
    </View>
  );
}

function renderProductosMezcla(
  mezcla: AppMezcla,
  applications: AppFitosanidad[],
  onAsignarProducto: (ingredientLocalId: string, mezclaNumero: number) => void
) {
  const todos = applications.flatMap((application) =>
    application.ingredientes
      .filter((ingredient) => ingredient.ingredienteActivoNombre || ingredient.marcaProductoNombre)
      .map((ingredient) => ({
        localId: ingredient.localId,
        nombre: ingredient.marcaProductoNombre || ingredient.ingredienteActivoNombre || "Sin nombre",
        objetivo: application.objetivoNombre || application.objetivo,
        asignado: ingredient.mezclaNumero === mezcla.numero,
        sinAsignar: ingredient.mezclaNumero === 0
      }))
  );

  if (todos.length === 0) return null;

  const asignados = todos.filter((p) => p.asignado);
  const sinAsignar = todos.filter((p) => p.sinAsignar);

  return (
    <View style={styles.totalRow}>
      <AppText variant="label">Productos en esta mezcla</AppText>
      {todos.map((producto) => (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: producto.asignado }}
          key={producto.localId}
          onPress={() => onAsignarProducto(producto.localId, mezcla.numero)}
          style={[
            styles.productoCheckRow,
            producto.asignado && styles.productoCheckRowSelected,
            producto.sinAsignar && styles.productoCheckRowUnassigned
          ]}
        >
          <Ionicons
            color={producto.asignado ? theme.colors.primary : producto.sinAsignar ? theme.colors.warning : theme.colors.textMuted}
            name={producto.asignado ? "checkbox" : "square-outline"}
            size={20}
          />
          <View style={{ flex: 1 }}>
            <AppText
              style={producto.asignado ? { color: theme.colors.primary } : producto.sinAsignar ? { color: theme.colors.warning } : undefined}
              variant="caption"
            >
              {producto.nombre}
            </AppText>
            <AppText variant="muted" style={{ fontSize: 11 }}>
              {producto.objetivo}
              {producto.sinAsignar ? " — Sin mezcla asignada" : ""}
            </AppText>
          </View>
        </Pressable>
      ))}
      {asignados.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
            {asignados.length} producto(s) asignado(s)
          </AppText>
        </View>
      ) : null}
      {sinAsignar.length > 0 ? (
        <View style={{ marginTop: 4 }}>
          <AppText variant="caption" style={{ color: theme.colors.warning }}>
            {sinAsignar.length} producto(s) sin asignar
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function MezclaCard({
  value,
  coadyuvantes,
  resetToken,
  fitosanidadApps,
  onChange,
  onAsignarProducto
}: {
  value: AppMezcla;
  coadyuvantes: CoadyuvanteCatalogItem[];
  resetToken: number;
  fitosanidadApps: AppFitosanidad[];
  onChange: (patch: Partial<AppMezcla>) => void;
  onAsignarProducto: (ingredientLocalId: string, mezclaNumero: number) => void;
}) {
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsExchangeMode(false);
    setSelectedIndex(null);
  }, [resetToken, value.coadyuvantesIds]);

  const movableCount = value.ordenMezcla.filter(
    (item) => !isOrdenMezclaFixedItem(item)
  ).length;

  function exchange(index: number) {
    if (!isExchangeMode || isOrdenMezclaFixedItem(value.ordenMezcla[index] ?? "")) {
      return;
    }
    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }
    onChange({
      ordenMezcla: swapOrdenMezclaItems(value.ordenMezcla, selectedIndex, index)
    });
    setSelectedIndex(null);
  }

  return (
    <View style={styles.fitosanidadCard}>
      <AppText variant="heading">Mezcla {value.numero}</AppText>
      <LabeledNumericInput
        label="Volumen de aplicación (cilindros/ha)"
        value={value.volumenAplicacion}
        onChangeText={(volumenAplicacion) => onChange({ volumenAplicacion })}
      />
      <LabeledNumericInput
        editable={value.factorEditable}
        label="Factor de incidencia"
        value={value.factor}
        onChangeText={(factor) => onChange({ factor })}
      />
      <AppText variant="caption">
        {value.factorEditable
          ? "Incidencia grado 3: puede ajustar el factor."
          : "Factor calculado automáticamente según la mayor incidencia de la mezcla."}
      </AppText>

      {renderProductosMezcla(value, fitosanidadApps, onAsignarProducto)}

      <AppText variant="label" style={styles.fieldLabel}>
        Coadyuvantes
      </AppText>
      <View style={styles.chipContainer}>
        {coadyuvantes.map((coadyuvante) => {
          const selected = value.coadyuvantesIds.includes(coadyuvante.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={coadyuvante.id}
              onPress={() =>
                onChange({
                  coadyuvantesIds: selected
                    ? value.coadyuvantesIds.filter((id) => id !== coadyuvante.id)
                    : [...value.coadyuvantesIds, coadyuvante.id]
                })
              }
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <AppText
                style={[styles.chipText, selected && styles.chipTextSelected]}
                variant="caption"
              >
                {selected ? "✓ " : ""}
                {coadyuvante.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {value.ordenMezcla.length > 0 ? (
        <View style={styles.ordenContainer}>
          <View style={styles.ordenHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons color={theme.colors.warning} name="swap-vertical-outline" size={18} />
              <AppText variant="label">Orden de mezcla</AppText>
            </View>
            {movableCount >= 2 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setIsExchangeMode((current) => !current);
                  setSelectedIndex(null);
                }}
                style={[
                  styles.ordenExchangeButton,
                  isExchangeMode && styles.ordenExchangeButtonActive
                ]}
              >
                <Ionicons
                  color={isExchangeMode ? theme.colors.textInverse : theme.colors.primary}
                  name="swap-horizontal"
                  size={16}
                />
                <AppText
                  style={
                    isExchangeMode
                      ? styles.ordenExchangeButtonTextActive
                      : styles.ordenExchangeButtonText
                  }
                  variant="caption"
                >
                  {isExchangeMode ? "Listo" : "Reordenar"}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {movableCount >= 2 && !isExchangeMode ? (
            <AppText variant="muted" style={{ fontSize: 12, marginTop: -4 }}>
              Toca "Reordenar" para intercambiar posiciones
            </AppText>
          ) : null}
          {isExchangeMode && selectedIndex !== null ? (
            <AppText variant="caption" style={{ color: theme.colors.primary, fontStyle: "italic" }}>
              Ahora toca el item con el que quieres intercambiar
            </AppText>
          ) : null}
          {value.ordenMezcla.map((item, index) => {
            const isFixed = isOrdenMezclaFixedItem(item);
            return (
              <Pressable
                accessibilityRole="button"
                disabled={!isExchangeMode || isFixed}
                key={`${item}_${index}`}
                onPress={() => exchange(index)}
                style={[
                  styles.ordenItem,
                  isExchangeMode && !isFixed && styles.ordenItemSelectable,
                  selectedIndex === index && styles.ordenItemSelected,
                  isFixed && styles.ordenItemFixed
                ]}
              >
                <View style={styles.ordenItemNumberBadge}>
                  <AppText
                    style={[
                      { color: isFixed ? theme.colors.textMuted : theme.colors.primary, fontSize: 12, fontWeight: "700" },
                      selectedIndex === index && { color: theme.colors.primaryDark }
                    ]}
                  >
                    {index + 1}°
                  </AppText>
                </View>
                <AppText
                  style={[
                    styles.ordenItemText,
                    isFixed && { color: theme.colors.textMuted },
                    !isFixed && { fontWeight: "500" },
                    selectedIndex === index && styles.ordenItemTextSelected
                  ]}
                  variant="muted"
                >
                  {item}
                </AppText>
                {isFixed ? (
                  <Ionicons color={theme.colors.textMuted} name="lock-closed-outline" size={14} />
                ) : isExchangeMode ? (
                  <View style={styles.ordenSwapIndicator}>
                    <Ionicons
                      color={selectedIndex === index ? theme.colors.primary : theme.colors.textMuted}
                      name="swap-horizontal"
                      size={18}
                    />
                  </View>
                ) : (
                  <Ionicons
                    color={theme.colors.borderLight}
                    name="reorder-three-outline"
                    size={16}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function validateRequiredRecipe(
  fitosanidadApps: AppFitosanidad[],
  mezclas: AppMezcla[],
  fertilizaciones: AppFertilizacion[],
  riegoSelection: string | null,
  laborSelections: Set<string>
) {
  const hasFitosanidad = hasFitosanidadData(fitosanidadApps);
  const hasFertilizacion = hasFertilizacionData(fertilizaciones);
  const hasRiego = Boolean(riegoSelection);
  const hasLabores = laborSelections.size > 0;

  if (!hasFitosanidad && !hasFertilizacion && !hasRiego && !hasLabores) {
    return "La receta es obligatoria. Registra al menos una recomendacion tecnica antes de finalizar.";
  }

  if (hasFitosanidad) {
    const hasUnassigned = fitosanidadApps.some((application) =>
      application.ingredientes.some(
        (ingredient) =>
          (ingredient.ingredienteActivoNombre || ingredient.marcaProductoNombre) &&
          ingredient.mezclaNumero === 0
      )
    );
    if (hasUnassigned) return "Asigna todos los productos con nombre a una mezcla.";

    const assigned = new Set(
      fitosanidadApps.flatMap((application) =>
        application.ingredientes.map((ingredient) => ingredient.mezclaNumero)
      )
    );
    const empty = mezclas.find((mezcla) => !assigned.has(mezcla.numero));
    if (empty) return `Asigna al menos un producto a la mezcla ${empty.numero}.`;
    const missingVolume = mezclas.find(
      (mezcla) => !parsePositiveDecimal(mezcla.volumenAplicacion)
    );
    if (missingVolume) {
      return `Ingresa el volumen de aplicación de la mezcla ${missingVolume.numero}.`;
    }
  }

  return null;
}

function FertilizacionCard({
  value,
  index,
  canRemove,
  fertilizantes,
  openDropdown,
  onChange,
  onCloseDropdown,
  onRemove,
  toggleDropdown,
  onNavegarCatalogo
}: {
  value: AppFertilizacion;
  index: number;
  canRemove: boolean;
  fertilizantes: FertilizanteCatalogItem[];
  openDropdown: string | null;
  onChange: (patch: Partial<AppFertilizacion>) => void;
  onCloseDropdown: () => void;
  onRemove: () => void;
  toggleDropdown: (key: string) => void;
  onNavegarCatalogo: (tipo: string) => void;
}) {
  const prefix = `fert_${index}`;
  const unidadDosis = getUnidadDosis(value);

  return (
    <View style={styles.fertilizacionCard}>
      <View style={styles.itemCardHeader}>
        <View style={styles.itemCardTitle}>
          <View style={styles.itemNumberBadge}>
            <AppText style={styles.itemNumberText} variant="eyebrow">
              {index + 1}
            </AppText>
          </View>
          <AppText variant="heading">Fertilizante {index + 1}</AppText>
        </View>
        {canRemove ? (
          <RemoveItemButton
            accessibilityLabel={`Quitar fertilizante ${index + 1}`}
            label="Quitar"
            onPress={onRemove}
          />
        ) : null}
      </View>

      <AppSelectField
        icon="leaf"
        label="Via de aplicacion"
        options={[
          { value: "edafica", label: "Edafica" },
          { value: "foliar", label: "Foliar" }
        ]}
        placeholder="Seleccionar via"
        selectedLabel={value.viaAplicacion === "edafica" ? "Edafica" : "Foliar"}
        isOpen={openDropdown === `${prefix}_via`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_via`)}
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
        isOpen={openDropdown === `${prefix}_fertilizante`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_fertilizante`)}
        onSelect={(v) => {
          const fert = fertilizantes.find((f) => f.name === v);
          onChange({
            fertilizanteNombre: v,
            tipoProducto: fert?.type ?? value.tipoProducto,
            concentracion: fert?.concentracion ?? "",
            unidadMedida: fert?.unidadMedida ?? ""
          });
        }}
      />

      <AppButton
        icon="add-circle-outline"
        label="Nuevo fertilizante"
        onPress={() => onNavegarCatalogo("fertilizante")}
        size="small"
        variant="outline"
      />

      <LabeledNumericInput
        editable={false}
        label="Concentracion comercial"
        placeholder={
          value.fertilizanteNombre
            ? "Concentracion no disponible. Actualiza los catalogos."
            : "Selecciona un fertilizante"
        }
        value={formatCatalogConcentration(value.concentracion, value.unidadMedida)}
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
        isOpen={openDropdown === `${prefix}_tipo`}
        onClose={onCloseDropdown}
        onToggle={() => toggleDropdown(`${prefix}_tipo`)}
        onSelect={(v) => onChange({ tipoProducto: v as "solido" | "liquido" })}
      />

      <LabeledNumericInput
        label={`Dosis (${unidadDosis})`}
        value={value.dosis}
        onChangeText={(v) => onChange({ dosis: v })}
      />

      <LabeledNumericInput
        editable={value.factorEditable}
        label="Factor de incidencia"
        value={value.factor}
        onChangeText={(factor) => onChange({ factor })}
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

function AddItemButton({
  label,
  accessibilityLabel,
  onPress
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.addItemButton, pressed && styles.pressedButton]}
    >
      <Ionicons color={theme.colors.primary} name="add-circle-outline" size={22} />
      <AppText style={styles.addItemButtonText} variant="label">
        {label}
      </AppText>
    </Pressable>
  );
}

function RemoveItemButton({
  label,
  accessibilityLabel,
  onPress
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.removeItemButton, pressed && styles.pressedButton]}
    >
      <Ionicons color={theme.colors.error} name="trash-outline" size={18} />
      <AppText style={styles.removeItemButtonText} variant="caption">
        {label}
      </AppText>
    </Pressable>
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
        accessibilityLabel={label}
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
  onChangeText,
  editable = true,
  placeholder = "0"
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <AppText variant="label" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        inputMode="decimal"
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={styles.textInput}
        value={value}
      />
    </View>
  );
}

function ReadonlyField({
  label,
  placeholder = "Calculado automaticamente",
  value
}: {
  label: string;
  placeholder?: string;
  value: string;
}) {
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
          {value || placeholder}
        </AppText>
      </View>
    </View>
  );
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
    height: 44,
    justifyContent: "center",
    width: 44
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
    flex: 1,
    gap: 2
  },
  ingredientList: {
    gap: 12
  },
  ingredientCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  itemCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  itemCardTitle: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8
  },
  itemNumberBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  itemNumberText: {
    color: theme.colors.primaryDark
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
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
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
    gap: 8,
    padding: 12
  },
  ordenHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  ordenExchangeButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  ordenExchangeButtonActive: {
    backgroundColor: theme.colors.primary
  },
  ordenExchangeButtonText: {
    color: theme.colors.primary,
    fontWeight: "600"
  },
  ordenExchangeButtonTextActive: {
    color: theme.colors.textInverse
  },
  ordenItem: {
    alignItems: "center",
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface
  },
  ordenItemSelectable: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    borderStyle: "dashed",
    borderWidth: 1.5
  },
  ordenItemSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderStyle: "solid",
    borderColor: theme.colors.primary,
    borderWidth: 2
  },
  ordenItemFixed: {
    opacity: 0.65
  },
  ordenSwapIndicator: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  ordenItemNumberBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.full,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  totalRow: {
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.md,
    marginTop: 10,
    padding: 14
  },
  productoTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6
  },
  productoCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight
  },
  productoCheckRowSelected: {
    backgroundColor: theme.colors.primaryMuted
  },
  productoCheckRowUnassigned: {
    backgroundColor: theme.colors.warningMuted
  },
  ordenItemText: {
    flex: 1
  },
  ordenItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600"
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
  addItemButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  addItemButtonText: {
    color: theme.colors.primaryDark
  },
  removeItemButton: {
    alignItems: "center",
    borderColor: theme.colors.error,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  removeItemButtonText: {
    color: theme.colors.error,
    fontWeight: "600"
  },
  emptyProductsCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    padding: 20
  },
  emptyProductsTitle: {
    color: theme.colors.text
  },
  emptyProductsText: {
    marginBottom: 4,
    textAlign: "center"
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
