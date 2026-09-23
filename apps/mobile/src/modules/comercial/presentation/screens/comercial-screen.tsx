import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import type { HarvestPaymentInput } from "@agrogest/validation";
import {
  AppButton,
  AppCard,
  AppInput,
  AppPaginatedSelectField,
  AppSelectField,
  AppText,
  ScreenContainer,
  type AppSelectOption
} from "../../../../shared/components";
import { productoresService } from "../../../productores/services/productores.service";
import { theme } from "../../../../shared/constants/theme";
import { savePagoCosecha } from "../../services/pagos-cosecha.service";

const DOCUMENTOS: AppSelectOption[] = [
  { value: "DNI", label: "DNI" },
  { value: "RUC", label: "RUC" }
];
const BANCOS: AppSelectOption[] = [
  { value: "INTERBANK", label: "INTERBANK" },
  { value: "BCP", label: "BCP" },
  { value: "CAJA_PIURA", label: "CAJA PIURA" },
  { value: "BBVA", label: "BBVA" }
];

type PagoCosechaFormInput = Omit<HarvestPaymentInput, "bank"> & { bank: string };

export function ComercialScreen() {
  const [productorId, setProductorId] = useState("");
  const [productor, setProductor] = useState<string>();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [tipo, setTipo] = useState<"DNI" | "RUC">("DNI");
  const [documento, setDocumento] = useState("");
  const [banco, setBanco] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [openProductor, setOpenProductor] = useState(false);
  const [openTipo, setOpenTipo] = useState(false);
  const [openBanco, setOpenBanco] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    const validation = validatePagoCosecha({
      productorId,
      creditorFirstName: nombres,
      creditorLastName: apellidos,
      creditorDocumentType: tipo,
      creditorDocumentNumber: documento.replace(/\s/g, ""),
      bank: banco,
      accountNumber: cuenta.replace(/\s/g, "")
    });

    if (typeof validation === "string") {
      setError(validation);
      return;
    }

    try {
      savePagoCosecha(validation);
      Alert.alert("Guardado local", "Los datos se sincronizaran cuando haya conexion.");
      setError(null);
      setNombres("");
      setApellidos("");
      setDocumento("");
      setBanco("");
      setCuenta("");
    } catch {
      setError("No se pudieron guardar los datos localmente.");
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppText style={styles.title} variant="title">
          Comercial
        </AppText>
        <AppText style={styles.subtitle} variant="body">
          Paso 1: datos de pago de cosecha.
        </AppText>
        <AppCard style={styles.card}>
          <AppPaginatedSelectField
            isOpen={openProductor}
            label="Productor"
            onClose={() => setOpenProductor(false)}
            onSearch={async (query, limit, offset) => {
              const [items, total] = await Promise.all([
                productoresService.searchByName(query, limit, offset),
                productoresService.countByName(query)
              ]);

              return {
                options: items.map((item) => ({
                  value: item.id,
                  label:
                    [item.firstName, item.lastName].filter(Boolean).join(" ") ||
                    item.documentNumber ||
                    item.id
                })),
                total
              };
            }}
            onSelect={(option) => {
              setProductorId(option.value);
              setProductor(option.label);
            }}
            onToggle={() => setOpenProductor((value) => !value)}
            placeholder="Busca y selecciona un productor"
            selectedLabel={productor}
          />
          <AppInput
            label="Nombres del acreedor"
            value={nombres}
            onChangeText={setNombres}
            placeholder="Ej: Maria Elena"
          />
          <AppInput
            label="Apellidos del acreedor"
            value={apellidos}
            onChangeText={setApellidos}
            placeholder="Ej: Perez Lopez"
          />
          <AppSelectField
            label="Tipo de documento"
            placeholder="Selecciona"
            options={DOCUMENTOS}
            isOpen={openTipo}
            onToggle={() => setOpenTipo((value) => !value)}
            onClose={() => setOpenTipo(false)}
            onSelect={(value) => {
              setTipo(value as "DNI" | "RUC");
              setOpenTipo(false);
            }}
            selectedLabel={tipo}
          />
          <AppInput
            label="Numero de documento"
            value={documento}
            onChangeText={(value) => setDocumento(value.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder={tipo === "DNI" ? "8 digitos" : "11 digitos"}
          />
          <AppSelectField
            label="Banco"
            placeholder="Selecciona el banco"
            options={BANCOS}
            isOpen={openBanco}
            onToggle={() => setOpenBanco((value) => !value)}
            onClose={() => setOpenBanco(false)}
            onSelect={(value) => {
              setBanco(value);
              setOpenBanco(false);
            }}
            selectedLabel={BANCOS.find((item) => item.value === banco)?.label}
          />
          <AppInput
            label="Numero de cuenta o CCI"
            value={cuenta}
            onChangeText={(value) => setCuenta(value.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={30}
            placeholder="Hasta 30 digitos"
          />
          {error ? (
            <AppText style={styles.error} variant="caption">
              {error}
            </AppText>
          ) : null}
          <AppButton
            label="Guardar datos de pago"
            icon="save-outline"
            onPress={guardar}
          />
        </AppCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 0 },
  content: { padding: 18, gap: 14 },
  title: { color: theme.colors.primaryDark },
  subtitle: { color: theme.colors.textMuted },
  card: { gap: 14, padding: 16 },
  error: { color: theme.colors.error }
});

function validatePagoCosecha(input: PagoCosechaFormInput): HarvestPaymentInput | string {
  if (!input.productorId.trim()) {
    return "Selecciona un productor.";
  }

  if (!input.creditorFirstName.trim() || !input.creditorLastName.trim()) {
    return "Ingresa los nombres y apellidos del acreedor.";
  }

  const documentLength = input.creditorDocumentType === "DNI" ? 8 : 11;
  if (!new RegExp(`^\\d{${documentLength}}$`).test(input.creditorDocumentNumber)) {
    return `El ${input.creditorDocumentType} debe tener ${documentLength} digitos.`;
  }

  if (!BANCOS.some((bank) => bank.value === input.bank)) {
    return "Selecciona un banco valido.";
  }

  if (!/^\d{1,30}$/.test(input.accountNumber)) {
    return "Ingresa un numero de cuenta o CCI de hasta 30 digitos.";
  }

  return {
    ...input,
    bank: input.bank as HarvestPaymentInput["bank"],
    productorId: input.productorId.trim(),
    creditorFirstName: input.creditorFirstName.trim(),
    creditorLastName: input.creditorLastName.trim()
  };
}
