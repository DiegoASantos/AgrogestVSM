import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { harvestPaymentSchema, harvestPaymentBanks } from "@agrogest/validation";
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
const BANCOS: AppSelectOption[] = harvestPaymentBanks.map((value) => ({
  value,
  label: value === "CAJA_PIURA" ? "CAJA PIURA" : value
}));

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
    const parsed = harvestPaymentSchema.safeParse({
      productorId,
      creditorFirstName: nombres,
      creditorLastName: apellidos,
      creditorDocumentType: tipo,
      creditorDocumentNumber: documento.replace(/\s/g, ""),
      bank: banco,
      accountNumber: cuenta.replace(/\s/g, "")
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
      return;
    }

    try {
      savePagoCosecha(parsed.data);
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
