import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import type { HarvestPaymentInput } from "@agrogest/validation";

import {
  AppButton,
  AppCard,
  AppInput,
  AppPaginatedSelectField,
  AppSelectField,
  AppText,
  FormScrollView,
  ScreenContainer,
  type AppPaginatedSelectOption,
  type AppSelectOption
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { productoresService } from "../../../productores/services/productores.service";
import type { Productor } from "../../../productores/types";
import { tiposDocumentoRepository } from "../../../tipos-documento/repositories/tipos-documento.repository";
import { savePagoCosecha } from "../../services/pagos-cosecha.service";
import {
  getCreditorAutofill,
  getPendingCreditorFields,
  type CreditorAutofill,
  type CreditorPendingField
} from "./creditor-autofill";

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

type CreditorAutofilledFields = Record<CreditorPendingField, boolean>;

const EMPTY_CREDITOR_AUTOFILLED_FIELDS: CreditorAutofilledFields = {
  firstName: false,
  lastName: false,
  documentType: false,
  documentNumber: false
};

export function ComercialScreen() {
  const [productorId, setProductorId] = useState("");
  const [productor, setProductor] = useState<string>();
  const [selectedProductor, setSelectedProductor] = useState<Productor | null>(null);
  const [acreedorEsProductor, setAcreedorEsProductor] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<CreditorAutofilledFields>(
    EMPTY_CREDITOR_AUTOFILLED_FIELDS
  );
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

  const creditorAutofill = useMemo(
    () => getAutofillForProductor(selectedProductor),
    [selectedProductor]
  );
  const isCreditorProductorPersona =
    acreedorEsProductor && creditorAutofill !== null;
  const pendingCreditorFields = getPendingCreditorFields(creditorAutofill);
  const recoveredCreditorName = [creditorAutofill?.firstName, creditorAutofill?.lastName]
    .filter(Boolean)
    .join(" ");

  const loadProductorOptions = useCallback(
    async (query: string, page: number, pageSize: number) => {
      const offset = (page - 1) * pageSize;
      const [items, total] = await Promise.all([
        productoresService.searchWithVisibleParcelas(query, pageSize, offset),
        productoresService.countWithVisibleParcelas(query)
      ]);

      return { options: items.map(toProductorOption), total };
    },
    []
  );

  function applyCreditorAutofill(nextProductor: Productor | null) {
    const autofill = getAutofillForProductor(nextProductor);

    setNombres((current) =>
      replaceDerivedCreditorValue(
        current,
        autofilledFields.firstName,
        autofill?.firstName ?? null,
        ""
      )
    );
    setApellidos((current) =>
      replaceDerivedCreditorValue(
        current,
        autofilledFields.lastName,
        autofill?.lastName ?? null,
        ""
      )
    );
    setTipo((current) =>
      replaceDerivedCreditorValue(
        current,
        autofilledFields.documentType,
        autofill?.documentType ?? null,
        "DNI"
      )
    );
    setDocumento((current) =>
      replaceDerivedCreditorValue(
        current,
        autofilledFields.documentNumber,
        autofill?.documentNumber ?? null,
        ""
      )
    );
    setAutofilledFields({
      firstName: Boolean(autofill?.firstName),
      lastName: Boolean(autofill?.lastName),
      documentType: Boolean(autofill?.documentType),
      documentNumber: Boolean(autofill?.documentNumber)
    });

    return autofill;
  }

  async function handleProductorSelection(option: AppPaginatedSelectOption) {
    setError(null);

    try {
      const nextProductor = await productoresService.getById(option.value);
      setProductorId(option.value);
      setProductor(option.label);
      setSelectedProductor(nextProductor);

      if (acreedorEsProductor) {
        applyCreditorAutofill(nextProductor);
      }
    } catch {
      setProductorId("");
      setProductor(undefined);
      setSelectedProductor(null);
      setError("No se pudieron cargar los datos del productor seleccionado.");
    }
  }

  function handleAcreedorEsProductorChange(value: boolean) {
    setAcreedorEsProductor(value);
    setError(null);

    if (!value) {
      setAutofilledFields(EMPTY_CREDITOR_AUTOFILLED_FIELDS);
      return;
    }

    applyCreditorAutofill(selectedProductor);
  }

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
      setBanco("");
      setCuenta("");
    } catch {
      setError("No se pudieron guardar los datos localmente.");
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <FormScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <AppText style={styles.title} variant="title">
            Comercial
          </AppText>
          <AppText style={styles.subtitle} variant="body">
            Paso 1: registra los datos para el pago de cosecha.
          </AppText>
        </View>

        <AppCard style={styles.sectionCard}>
          <SectionHeader
            icon="leaf-outline"
            subtitle="Elige un productor con parcelas asignadas a tu usuario."
            title="Productor de la cosecha"
          />
          <AppPaginatedSelectField
            emptyMessage="No tienes productores con parcelas disponibles. Sincroniza tus catalogos cuando tengas internet."
            icon="person-outline"
            isOpen={openProductor}
            label="Productor"
            onClose={() => setOpenProductor(false)}
            onSearch={loadProductorOptions}
            onSelect={(option) => {
              void handleProductorSelection(option);
            }}
            onToggle={() => setOpenProductor((value) => !value)}
            placeholder="Busca por nombre o documento"
            searchPlaceholder="Buscar por nombre o documento"
            selectedLabel={productor}
          />
        </AppCard>

        <AppCard style={styles.sectionCard}>
          <SectionHeader
            icon="person-circle-outline"
            subtitle="Indica a quien se realizara el abono."
            title="Datos del acreedor"
          />
          <View style={styles.switchCard}>
            <View style={styles.switchTextArea}>
              <AppText style={styles.switchTitle} variant="label">
                El acreedor es el productor
              </AppText>
              <AppText variant="caption">
                Completamos sus datos registrados para evitar digitarlos nuevamente.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="El acreedor es el productor"
              accessibilityRole="switch"
              disabled={!selectedProductor}
              ios_backgroundColor={theme.colors.border}
              onValueChange={handleAcreedorEsProductorChange}
              thumbColor={
                acreedorEsProductor ? theme.colors.primaryDark : theme.colors.surface
              }
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryMuted }}
              value={acreedorEsProductor}
            />
          </View>

          {isCreditorProductorPersona && creditorAutofill ? (
            <View style={styles.creditorSummary}>
              <Ionicons color={theme.colors.primaryDark} name="checkmark-circle" size={21} />
              <View style={styles.creditorSummaryText}>
                <AppText style={styles.creditorSummaryTitle} variant="label">
                  {pendingCreditorFields.length === 0
                    ? "Datos del productor listos para el pago"
                    : "Datos recuperados del productor"}
                </AppText>
                {recoveredCreditorName ? (
                  <AppText variant="caption">{recoveredCreditorName}</AppText>
                ) : null}
                {creditorAutofill.documentType && creditorAutofill.documentNumber ? (
                  <AppText variant="caption">
                    {creditorAutofill.documentType} {creditorAutofill.documentNumber}
                  </AppText>
                ) : null}
                {pendingCreditorFields.length > 0 ? (
                  <AppText variant="caption">
                    Completa: {formatPendingCreditorFields(pendingCreditorFields)}.
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : acreedorEsProductor ? (
            <View style={styles.manualNotice}>
              <Ionicons color={theme.colors.warning} name="information-circle" size={20} />
              <AppText style={styles.manualNoticeText} variant="caption">
                Este productor no es una persona. Registra los datos del acreedor
                manualmente.
              </AppText>
            </View>
          ) : null}

          {!isCreditorProductorPersona || pendingCreditorFields.includes("firstName") ? (
            <AppInput
                label="Nombres del acreedor"
                value={nombres}
                onChangeText={(value) => {
                  setNombres(value);
                  setAutofilledFields((current) => ({ ...current, firstName: false }));
                }}
                placeholder="Ej: Maria Elena"
              />
          ) : null}
          {!isCreditorProductorPersona || pendingCreditorFields.includes("lastName") ? (
              <AppInput
                label="Apellidos del acreedor"
                value={apellidos}
                onChangeText={(value) => {
                  setApellidos(value);
                  setAutofilledFields((current) => ({ ...current, lastName: false }));
                }}
                placeholder="Ej: Perez Lopez"
              />
          ) : null}
          {!isCreditorProductorPersona || pendingCreditorFields.includes("documentType") ? (
              <AppSelectField
                label="Tipo de documento"
                placeholder="Selecciona"
                options={DOCUMENTOS}
                isOpen={openTipo}
                onToggle={() => setOpenTipo((value) => !value)}
                onClose={() => setOpenTipo(false)}
                onSelect={(value) => {
                  setTipo(value as "DNI" | "RUC");
                  setAutofilledFields((current) => ({
                    ...current,
                    documentType: false
                  }));
                  setOpenTipo(false);
                }}
                selectedLabel={tipo}
              />
          ) : null}
          {!isCreditorProductorPersona || pendingCreditorFields.includes("documentNumber") ? (
              <AppInput
                label="Numero de documento"
                value={documento}
                onChangeText={(value) => {
                  setDocumento(value.replace(/\D/g, ""));
                  setAutofilledFields((current) => ({
                    ...current,
                    documentNumber: false
                  }));
                }}
                keyboardType="number-pad"
                placeholder={tipo === "DNI" ? "8 digitos" : "11 digitos"}
              />
          ) : null}
        </AppCard>

        <AppCard style={styles.sectionCard}>
          <SectionHeader
            icon="card-outline"
            subtitle="Ingresa la cuenta bancaria o el CCI del acreedor."
            title="Cuenta de abono"
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
        </AppCard>

        {error ? (
          <AppText style={styles.error} variant="caption">
            {error}
          </AppText>
        ) : null}
        <AppButton label="Guardar datos de pago" icon="save-outline" onPress={guardar} />
      </FormScrollView>
    </ScreenContainer>
  );
}

type SectionHeaderProps = {
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
  title: string;
};

function SectionHeader({ icon, subtitle, title }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons color={theme.colors.primaryDark} name={icon} size={21} />
      </View>
      <View style={styles.sectionHeaderText}>
        <AppText style={styles.sectionTitle} variant="heading">
          {title}
        </AppText>
        <AppText style={styles.sectionSubtitle} variant="caption">
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

function getAutofillForProductor(productor: Productor | null): CreditorAutofill | null {
  const documentTypeCode = productor?.documentTypeId
    ? tiposDocumentoRepository.obtenerPorId(productor.documentTypeId)?.code ?? null
    : null;

  return getCreditorAutofill(productor, documentTypeCode);
}

function replaceDerivedCreditorValue<T>(
  currentValue: T,
  previousValueWasAutofilled: boolean,
  nextAutofillValue: T | null,
  emptyValue: T
): T {
  if (nextAutofillValue !== null) {
    return nextAutofillValue;
  }

  return previousValueWasAutofilled ? emptyValue : currentValue;
}

function formatPendingCreditorFields(fields: CreditorPendingField[]) {
  const labels: Record<CreditorPendingField, string> = {
    firstName: "nombres",
    lastName: "apellidos",
    documentType: "tipo de documento",
    documentNumber: "numero de documento"
  };

  return fields.map((field) => labels[field]).join(", ");
}

function toProductorOption(productor: Productor): AppPaginatedSelectOption {
  const label = [productor.firstName, productor.lastName].filter(Boolean).join(" ");

  return {
    value: productor.id,
    label: label || productor.documentNumber || productor.publicId,
    helper: productor.documentNumber ?? undefined
  };
}

const styles = StyleSheet.create({
  container: { padding: 0 },
  content: { padding: 18, gap: 14, paddingBottom: 30 },
  intro: { gap: 4, paddingVertical: 4 },
  title: { color: theme.colors.primaryDark },
  subtitle: { color: theme.colors.textMuted },
  sectionCard: { gap: 16, padding: 16 },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  sectionIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  sectionHeaderText: { flex: 1, gap: 2 },
  sectionTitle: { color: theme.colors.primaryDark },
  sectionSubtitle: { color: theme.colors.textMuted },
  switchCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    padding: 14
  },
  switchTextArea: { flex: 1, gap: 3 },
  switchTitle: { color: theme.colors.text },
  creditorSummary: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  creditorSummaryText: { flex: 1, gap: 2 },
  creditorSummaryTitle: { color: theme.colors.primaryDark },
  manualNotice: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.warningMuted,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 9,
    padding: 12
  },
  manualNoticeText: { color: theme.colors.text, flex: 1 },
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
