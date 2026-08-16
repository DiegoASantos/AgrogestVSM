import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ImageBackground, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppPaginatedSelectField,
  type AppPaginatedSelectOption,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { getDatabase } from "../../../../shared/database/connection";
import { getCatalogSessionUserId } from "../../../../shared/database/catalog-session";
import { downloadAllCatalogs } from "../../../../shared/database/seed-catalogs";
import { toApiError } from "../../../../shared/services";
import { parcelasService } from "../../../parcelas/services";
import type { Parcela } from "../../../parcelas/types";
import { productoresService } from "../../../productores/services";
import type { Productor } from "../../../productores/types";
import { sectoresService } from "../../../sectores/services";
import type { Sector } from "../../../sectores/types";
import { subsectoresService } from "../../../subsectores/services";
import type { Subsector } from "../../../subsectores/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PARCELAS_BACKGROUND = require("../../../../../assets/images/parcelas.webp");

type OpenCatalog = "productor" | "sector" | "subsector" | "parcela" | null;
type LoadingCatalog = Exclude<OpenCatalog, null>;

export function NewVisitaSelectorScreen() {
  const router = useRouter();
  const { nuevoProductorId, nuevoProductorLabel, nuevaParcelaId } = useLocalSearchParams<{
    nuevoProductorId?: string;
    nuevoProductorLabel?: string;
    nuevaParcelaId?: string;
  }>();
  const [openCatalog, setOpenCatalog] = useState<OpenCatalog>(null);
  const [loadingCatalog, setLoadingCatalog] =
    useState<LoadingCatalog | null>("productor");
  const [error, setError] = useState<string | null>(null);
  const [productorId, setProductorId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [subsectorId, setSubsectorId] = useState("");
  const [parcelaId, setParcelaId] = useState("");
  const [selectedProductorLabel, setSelectedProductorLabel] = useState<string>();
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [subsectores, setSubsectores] = useState<Subsector[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  useEffect(() => {
    if (nuevoProductorId && nuevaParcelaId) {
      void restoreCreatedParcelaSelection(nuevoProductorId, nuevaParcelaId);
    } else if (nuevoProductorId) {
      setProductorId(nuevoProductorId);
      setSelectedProductorLabel(nuevoProductorLabel ?? "Nuevo productor");
      setTimeout(() => {
        Alert.alert(
          "Productor creado",
          "Desea agregar una parcela ahora?",
          [
            { text: "Ahora no", style: "cancel", onPress: clearSelection },
            {
              text: "Agregar parcela",
              onPress: () => {
                router.push({
                  pathname: "/productores/agregar-parcela",
                  params: { productorId: nuevoProductorId }
                });
              }
            }
          ]
        );
      }, 500);
    } else {
      void ensureProductoresAvailable();
    }
  }, [nuevoProductorId, nuevaParcelaId]);

  const sectorOptions = sectores.map((sector) => ({
    value: sector.id,
    label: sector.name
  }));
  const subsectorOptions = subsectores.map((subsector) => ({
    value: subsector.id,
    label: subsector.name
  }));
  const parcelaOptions = parcelas.map((parcela) => ({
    value: parcela.id,
    label: `${parcela.name || parcela.code}${parcela.isActive ? "" : " (Inactiva)"}`,
    helper: parcela.isActive ? parcela.code : `${parcela.code} · Requiere activacion`
  }));
  const selectedParcela = parcelas.find((parcela) => parcela.id === parcelaId);

  const loadProductorOptions = useCallback(
    async (query: string, page: number, pageSize: number) => {
      const offset = (page - 1) * pageSize;
      const [nextProductores, total] = await Promise.all([
        productoresService.searchByName(query, pageSize, offset),
        productoresService.countByName(query)
      ]);

      const options = nextProductores.map((productor) => {
        const hasParcela = parcelasService.getByProductorId(productor.id);

        return hasParcela.then((parcelasDelProductor) =>
          parcelasDelProductor.length > 0
          ? toProductorOption(productor)
          : {
              ...toProductorOption(productor),
              label: `[Sin parcela] ${buildProductorLabel(productor)}`,
              helper: "Toca para agregar una parcela",
              muted: true
            }
        );
      });

      return { options: await Promise.all(options), total };
    },
    []
  );

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
          source={PARCELAS_BACKGROUND}
          style={styles.hero}
        >
          <AppText style={styles.eyebrow} variant="eyebrow">
            Nueva visita
          </AppText>
          <AppText style={styles.title} variant="title">
            Selecciona la parcela
          </AppText>
          <AppText style={styles.subtitle} variant="body">
            Elige productor, sector, subsector y finalmente la parcela.
          </AppText>
        </ImageBackground>

        <View style={styles.accionNuevoProductor}>
          <AppButton
            label="Nuevo productor"
            onPress={handleNewProductorPress}
            variant="outline"
            size="small"
            icon="person-add-outline"
          />
          <AppText variant="caption" style={styles.accionNuevoProductorTexto}>
            Si el productor no aparece en la lista, crealo primero.
          </AppText>
        </View>

        <View style={styles.body}>
          <AppCard style={styles.fieldsCard}>
            <AppPaginatedSelectField
              emptyMessage="No hay productores descargados. Sincroniza los catalogos cuando tengas internet."
              icon="person-outline"
              isLoading={loadingCatalog === "productor"}
              isOpen={openCatalog === "productor"}
              label="Productor"
              onSearch={loadProductorOptions}
              onSelect={(option) => {
                setSelectedProductorLabel(option.label);
                void handleProductorSelection(option.value);
              }}
              onToggle={() => toggleCatalog("productor")}
              placeholder="Selecciona un productor"
              searchPlaceholder="Buscar por nombre o documento"
              selectedLabel={selectedProductorLabel}
            />
            <View style={styles.divider} />
            <AppSelectField
              disabled={!productorId}
              emptyMessage="Este productor no tiene sectores con parcelas registradas."
              icon="leaf-outline"
              isLoading={loadingCatalog === "sector"}
              isOpen={openCatalog === "sector"}
              label="Sector"
              onSelect={(value) => {
                void handleSectorSelection(value);
              }}
              onToggle={() => toggleCatalog("sector")}
              options={sectorOptions}
              placeholder="Selecciona primero un productor"
              selectedLabel={findSelectedLabel(sectorOptions, sectorId)}
            />
            <View style={styles.divider} />
            <AppSelectField
              disabled={!sectorId}
              emptyMessage="Este sector no tiene subsectores para el productor seleccionado."
              icon="layers-outline"
              isLoading={loadingCatalog === "subsector"}
              isOpen={openCatalog === "subsector"}
              label="Subsector"
              onSelect={(value) => {
                void handleSubsectorSelection(value);
              }}
              onToggle={() => toggleCatalog("subsector")}
              options={subsectorOptions}
              placeholder="Selecciona primero un sector"
              selectedLabel={findSelectedLabel(subsectorOptions, subsectorId)}
            />
            <View style={styles.divider} />
            <AppSelectField
              disabled={!subsectorId}
              emptyMessage="El productor no tiene parcelas en el subsector seleccionado."
              icon="location-outline"
              isLoading={loadingCatalog === "parcela"}
              isOpen={openCatalog === "parcela"}
              label="Parcela"
              onSelect={(value) => {
                void handleParcelaSelection(value);
              }}
              onToggle={() => toggleCatalog("parcela")}
              options={parcelaOptions}
              placeholder="Selecciona primero un subsector"
              searchable
              searchPlaceholder="Buscar por codigo o nombre"
              selectedLabel={findSelectedLabel(parcelaOptions, parcelaId)}
            />
          </AppCard>

          {error ? (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorText} variant="caption">
                {error}
              </AppText>
            </View>
          ) : null}

          <View style={styles.actions}>
            <AppButton
              disabled={!selectedParcela}
              icon="leaf-outline"
              label="Continuar con la visita"
              onPress={() => {
                if (!selectedParcela) {
                  return;
                }

                router.push({
                  pathname: "/visitas-campo/registrar",
                  params: {
                    id: selectedParcela.id,
                    parcelaCode: selectedParcela.code,
                    parcelaName: selectedParcela.name,
                    parcelaAreaHectares: formatearArea(selectedParcela.areaHectares)
                  }
                });
              }}
            />
            <AppButton
              label="Volver"
              onPress={() => router.replace("/home")}
              variant="outline"
            />
          </View>

          <AppText style={styles.offlineNote} variant="caption">
            Esta seleccion usa la base local y sigue disponible sin conexion.
          </AppText>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function toggleCatalog(catalog: LoadingCatalog) {
    setOpenCatalog((current) => (current === catalog ? null : catalog));
  }

  async function ensureProductoresAvailable() {
    setLoadingCatalog("productor");
    setError(null);

    try {
      let totalProductores = await productoresService.countByName("");

      if (totalProductores === 0) {
        await downloadAllCatalogs();
        totalProductores = await productoresService.countByName("");
      }

      if (totalProductores === 1) {
        const [singleProductor] = await productoresService.searchByName("", 1, 0);

        if (singleProductor) {
          setSelectedProductorLabel(buildProductorLabel(singleProductor));
          await handleProductorSelection(singleProductor.id);
        }
      }
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar los productores.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function handleProductorSelection(value: string) {
    const parcelaCount = (await parcelasService.getByProductorId(value)).length;

    if (parcelaCount === 0) {
      clearSelection();
      Alert.alert(
        "Productor sin parcela",
        "Este productor no tiene una parcela asociada. Desea agregar una ahora?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Agregar parcela",
            onPress: () => {
              router.push({
                pathname: "/productores/agregar-parcela",
                params: { productorId: value }
              });
            }
          }
        ]
      );
      return;
    }

    setProductorId(value);
    setSectorId("");
    setSubsectorId("");
    setParcelaId("");
    setSectores([]);
    setSubsectores([]);
    setParcelas([]);
    setOpenCatalog(null);
    setLoadingCatalog("sector");
    setError(null);

    try {
      const nextSectores = await sectoresService.getByProductorId(value);

      setSectores(nextSectores);

      if (nextSectores.length === 1) {
        await handleSectorSelection(nextSectores[0].id, value);
      }
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar los sectores.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function handleSectorSelection(value: string, selectedProductorId = productorId) {
    setSectorId(value);
    setSubsectorId("");
    setParcelaId("");
    setSubsectores([]);
    setParcelas([]);
    setOpenCatalog(null);
    setLoadingCatalog("subsector");
    setError(null);

    try {
      const nextSubsectores = await subsectoresService.getByProductorAndSector(
        selectedProductorId,
        value
      );

      setSubsectores(nextSubsectores);

      if (nextSubsectores.length === 1) {
        await handleSubsectorSelection(nextSubsectores[0].id, selectedProductorId);
      }
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar los subsectores.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function handleSubsectorSelection(
    value: string,
    selectedProductorId = productorId
  ) {
    setSubsectorId(value);
    setParcelaId("");
    setParcelas([]);
    setOpenCatalog(null);
    setLoadingCatalog("parcela");
    setError(null);

    try {
      const nextParcelas = await parcelasService.getByProductorAndSubsector(
        selectedProductorId,
        value
      );

      setParcelas(nextParcelas);

      if (nextParcelas.length === 1) {
        await handleParcelaSelection(nextParcelas[0].id, nextParcelas);
      }
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar las parcelas.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function handleParcelaSelection(
    value: string,
    availableParcelas = parcelas
  ) {
    const selected = availableParcelas.find((parcela) => parcela.id === value);

    if (!selected) {
      return;
    }

    if (selected.isActive) {
      setParcelaId(value);
      setOpenCatalog(null);
      return;
    }

    Alert.alert(
      "Parcela inactiva",
      "Esta parcela está inactiva. ¿Deseas activarla para realizar la visita?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Activar y continuar",
          onPress: () => {
            void activateSelectedParcela(selected);
          }
        }
      ]
    );
  }

  async function activateSelectedParcela(selected: Parcela) {
    setLoadingCatalog("parcela");
    setError(null);

    try {
      const activated = await parcelasService.activateForVisit(selected.id);
      setParcelas((current) =>
        current.map((parcela) => (parcela.id === activated.id ? activated : parcela))
      );
      setParcelaId(activated.id);
      setOpenCatalog(null);
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudo activar la parcela.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function restoreCreatedParcelaSelection(
    selectedProductorId: string,
    selectedParcelaId: string
  ) {
    setLoadingCatalog("parcela");
    setError(null);

    try {
      const [productor, parcela] = await Promise.all([
        productoresService.getById(selectedProductorId),
        parcelasService.getById(selectedParcelaId)
      ]);
      const [nextSectores, nextSubsectores, nextParcelas] = await Promise.all([
        sectoresService.getByProductorId(selectedProductorId),
        subsectoresService.getByProductorAndSector(
          selectedProductorId,
          parcela.sectorId
        ),
        parcelasService.getByProductorAndSubsector(
          selectedProductorId,
          parcela.subsectorId
        )
      ]);

      setProductorId(selectedProductorId);
      setSelectedProductorLabel(buildProductorLabel(productor));
      setSectores(nextSectores);
      setSectorId(parcela.sectorId);
      setSubsectores(nextSubsectores);
      setSubsectorId(parcela.subsectorId);
      setParcelas(nextParcelas);
      setParcelaId(selectedParcelaId);
    } catch (nextError) {
      clearSelection();
      setError(
        toApiError(nextError).message ||
          "No se pudo recuperar la parcela creada. Vuelve a seleccionarla."
      );
    } finally {
      setLoadingCatalog(null);
    }
  }

  function handleNewProductorPress() {
    const db = getDatabase();
    const ownerUserId =
      getCatalogSessionUserId(db) ?? "__no_authenticated_catalog_owner__";
    const pending = db.getFirstSync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM productores AS productor
       WHERE productor.catalog_owner_user_id = ?
         AND productor.created_locally = 1
         AND NOT EXISTS (
           SELECT 1
           FROM parcelas AS parcela
           WHERE parcela.productor_id = productor.id
             AND parcela.catalog_owner_user_id = ?
             AND parcela.catalog_visible = 1
         )`,
      ownerUserId,
      ownerUserId
    );

    if (!pending?.total) {
      router.push("/productores/nuevo");
      return;
    }

    Alert.alert(
      "Productores sin parcela",
      "Hay productores pendientes. Puedes continuar con uno de ellos o crear uno nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Elegir pendiente", onPress: () => setOpenCatalog("productor") },
        { text: "Crear nuevo", onPress: () => router.push("/productores/nuevo") }
      ]
    );
  }

  function clearSelection() {
    setProductorId("");
    setSelectedProductorLabel(undefined);
    setSectorId("");
    setSubsectorId("");
    setParcelaId("");
    setSectores([]);
    setSubsectores([]);
    setParcelas([]);
  }
}

function toProductorOption(productor: Productor): AppPaginatedSelectOption {
  return {
    value: productor.id,
    label: `${buildProductorLabel(productor)}${productor.isActive ? "" : " (Inactivo)"}`,
    helper: productor.documentNumber ?? productor.publicId
  };
}

function buildProductorLabel(productor: Productor) {
  const fullName = [productor.firstName, productor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || productor.documentNumber || productor.publicId;
}

function findSelectedLabel(
  options: Array<{ value: string; label: string }>,
  value: string
) {
  return options.find((option) => option.value === value)?.label;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    paddingBottom: 18,
    backgroundColor: "#fbfcf9"
  },
  hero: {
    minHeight: 260,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 26,
    backgroundColor: "#fcfaf5"
  },
  heroImage: {
    opacity: 0.72
  },
  eyebrow: {
    color: "#08643f",
    fontSize: 13,
    letterSpacing: 2
  },
  title: {
    maxWidth: 430,
    marginTop: 28,
    color: "#052e20",
    fontSize: 35,
    lineHeight: 41
  },
  subtitle: {
    maxWidth: 450,
    marginTop: 12,
    color: "#394a44",
    fontSize: 16,
    lineHeight: 24
  },
  body: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 16
  },
  fieldsCard: {
    gap: 15,
    borderRadius: 20,
    paddingVertical: 18,
    backgroundColor: "#ffffff"
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight
  },
  errorBanner: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  errorText: {
    color: theme.colors.error
  },
  actions: {
    gap: 10,
    marginTop: 2
  },
  offlineNote: {
    textAlign: "center"
  },
  accionNuevoProductor: {
    alignSelf: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: -12,
    marginBottom: 4
  },
  accionNuevoProductorTexto: {
    color: theme.colors.textMuted,
    textAlign: "center"
  }
});

function formatearArea(valor: string | null): string {
  if (!valor) return "";
  const numero = parseFloat(valor);
  if (isNaN(numero)) return "";
  return String(Math.round(numero * 100) / 100);
}
