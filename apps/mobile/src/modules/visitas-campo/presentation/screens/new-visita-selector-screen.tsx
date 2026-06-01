import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppHeader,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { parcelasService } from "../../../parcelas/services";
import type { Parcela } from "../../../parcelas/types";
import { productoresService } from "../../../productores/services";
import type { Productor } from "../../../productores/types";
import { sectoresService } from "../../../sectores/services";
import type { Sector } from "../../../sectores/types";

type OpenCatalog = "sector" | "productor" | "parcela" | null;

export function NewVisitaSelectorScreen() {
  const router = useRouter();
  const [openCatalog, setOpenCatalog] = useState<OpenCatalog>(null);
  const [sectorId, setSectorId] = useState("");
  const [productorId, setProductorId] = useState("");
  const [parcelaId, setParcelaId] = useState("");
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [productores, setProductores] = useState<Productor[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  useEffect(() => {
    void sectoresService.getAll().then(setSectores);
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
      <AppHeader
        eyebrow="Nueva visita"
        title="Selecciona la parcela"
        subtitle="Elige primero el sector territorial, luego el productor y finalmente la parcela."
      />

      <AppCard style={styles.fields}>
        <AppSelectField
          emptyMessage="No hay sectores descargados. Sincroniza los catalogos cuando tengas internet."
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
        <AppSelectField
          disabled={!sectorId}
          emptyMessage="Este sector no tiene productores con parcelas registradas."
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
        <AppSelectField
          disabled={!productorId}
          emptyMessage="El productor no tiene parcelas en el sector seleccionado."
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

      <View style={styles.actions}>
        <AppButton
          disabled={!selectedParcela}
          label="Continuar con la visita"
          onPress={() => {
            if (!selectedParcela) {
              return;
            }

            router.push({
              pathname: "/parcelas/[id]/nueva-visita",
              params: {
                id: selectedParcela.id,
                parcelaCode: selectedParcela.code,
                parcelaName: selectedParcela.name
              }
            });
          }}
        />
        <AppButton label="Cancelar" onPress={() => router.back()} variant="outline" />
      </View>

      <AppText variant="caption">
        Esta seleccion usa la base local y sigue disponible sin conexion.
      </AppText>
    </ScreenContainer>
  );

  function toggleCatalog(catalog: Exclude<OpenCatalog, null>) {
    setOpenCatalog((current) => (current === catalog ? null : catalog));
  }

  async function handleSectorSelection(value: string) {
    setSectorId(value);
    setProductorId("");
    setParcelaId("");
    setProductores(await productoresService.getBySectorId(value));
    setParcelas([]);
    setOpenCatalog(null);
  }

  async function handleProductorSelection(value: string) {
    setProductorId(value);
    setParcelaId("");
    setParcelas(await parcelasService.getByProductorAndSector(value, sectorId));
    setOpenCatalog(null);
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
    gap: 14
  },
  fields: {
    gap: 14
  },
  actions: {
    gap: 10
  }
});
