import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { parcelasService } from "../../../parcelas/services";
import type { Parcela } from "../../../parcelas/types";
import { productoresService } from "../../../productores/services";
import type { Productor } from "../../../productores/types";
import { sectoresService } from "../../../sectores/services";
import type { Sector } from "../../../sectores/types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PARCELAS_BACKGROUND = require("../../../../../assets/images/parcelas.webp");

type OpenCatalog = "sector" | "productor" | "parcela" | null;
type LoadingCatalog = Exclude<OpenCatalog, null>;

export function NewVisitaSelectorScreen() {
  const router = useRouter();
  const [openCatalog, setOpenCatalog] = useState<OpenCatalog>(null);
  const [loadingCatalog, setLoadingCatalog] = useState<LoadingCatalog | null>("sector");
  const [error, setError] = useState<string | null>(null);
  const [sectorId, setSectorId] = useState("");
  const [productorId, setProductorId] = useState("");
  const [parcelaId, setParcelaId] = useState("");
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [productores, setProductores] = useState<Productor[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  useEffect(() => {
    void loadSectores();
  }, []);

  const sectorOptions = sectores.map((sector) => ({
    value: sector.id,
    label: sector.name
  }));
  const productorOptions = productores.map((productor) => ({
    value: productor.id,
    label: buildProductorLabel(productor),
    helper: productor.documentNumber
  }));
  const parcelaOptions = parcelas.map((parcela) => ({
    value: parcela.id,
    label: parcela.name || parcela.code,
    helper: parcela.code
  }));
  const selectedParcela = parcelas.find((parcela) => parcela.id === parcelaId);

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
            Elige primero el sector territorial, luego el productor y finalmente la
            parcela.
          </AppText>
        </ImageBackground>

        <View style={styles.body}>
          <AppCard style={styles.fieldsCard}>
            <AppSelectField
              emptyMessage="No hay sectores descargados. Sincroniza los catalogos cuando tengas internet."
              icon="leaf-outline"
              isLoading={loadingCatalog === "sector"}
              isOpen={openCatalog === "sector"}
              label="Sector"
              onSelect={(value) => {
                void handleSectorSelection(value);
              }}
              onToggle={() => toggleCatalog("sector")}
              options={sectorOptions}
              placeholder="Selecciona un sector"
              selectedLabel={findSelectedLabel(sectorOptions, sectorId)}
            />
            <View style={styles.divider} />
            <AppSelectField
              disabled={!sectorId}
              emptyMessage="Este sector no tiene productores con parcelas registradas."
              icon="person-outline"
              isLoading={loadingCatalog === "productor"}
              isOpen={openCatalog === "productor"}
              label="Productor"
              onSelect={(value) => {
                void handleProductorSelection(value);
              }}
              onToggle={() => toggleCatalog("productor")}
              options={productorOptions}
              placeholder="Selecciona primero un sector"
              selectedLabel={findSelectedLabel(productorOptions, productorId)}
            />
            <View style={styles.divider} />
            <AppSelectField
              disabled={!productorId}
              emptyMessage="El productor no tiene parcelas en el sector seleccionado."
              icon="location-outline"
              isLoading={loadingCatalog === "parcela"}
              isOpen={openCatalog === "parcela"}
              label="Parcela"
              onSelect={(value) => {
                setParcelaId(value);
                setOpenCatalog(null);
              }}
              onToggle={() => toggleCatalog("parcela")}
              options={parcelaOptions}
              placeholder="Selecciona primero un productor"
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
                    parcelaName: selectedParcela.name
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

  async function loadSectores() {
    setLoadingCatalog("sector");
    setError(null);

    try {
      setSectores(await sectoresService.getAll());
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar los sectores.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function handleSectorSelection(value: string) {
    setSectorId(value);
    setProductorId("");
    setParcelaId("");
    setProductores([]);
    setParcelas([]);
    setOpenCatalog(null);
    setLoadingCatalog("productor");
    setError(null);

    try {
      setProductores(await productoresService.getBySectorId(value));
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar los productores.");
    } finally {
      setLoadingCatalog(null);
    }
  }

  async function handleProductorSelection(value: string) {
    setProductorId(value);
    setParcelaId("");
    setParcelas([]);
    setOpenCatalog(null);
    setLoadingCatalog("parcela");
    setError(null);

    try {
      setParcelas(await parcelasService.getByProductorAndSector(value, sectorId));
    } catch (nextError) {
      setError(toApiError(nextError).message || "No se pudieron cargar las parcelas.");
    } finally {
      setLoadingCatalog(null);
    }
  }
}

function buildProductorLabel(productor: Productor) {
  const fullName = [productor.firstName, productor.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || productor.documentNumber;
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
  }
});
