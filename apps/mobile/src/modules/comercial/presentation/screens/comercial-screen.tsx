import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import {
  harvestRecordSchema,
  type HarvestCreditorInput
} from "@agrogest/validation";

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
import {
  getAcreedoresCosechaLocales,
  refreshAcreedoresCosecha,
  saveAcreedorCosecha,
  type AcreedorCosecha
} from "../../services/acreedores-cosecha.service";
import { saveRegistroCosecha } from "../../services/registros-cosecha.service";
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

type AcreedorCosechaFormInput = Omit<HarvestCreditorInput, "bank"> & { bank: string };

type CreditorAutofilledFields = Record<CreditorPendingField, boolean>;

const EMPTY_CREDITOR_AUTOFILLED_FIELDS: CreditorAutofilledFields = {
  firstName: false,
  lastName: false,
  documentType: false,
  documentNumber: false
};

export function ComercialScreen() {
  const today = useMemo(getLocalDate, []);
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
  const [acreedores, setAcreedores] = useState<AcreedorCosecha[]>([]);
  const [acreedorPagoId, setAcreedorPagoId] = useState("");
  const [jabas, setJabas] = useState("");
  const [precioJaba, setPrecioJaba] = useState("");
  const [fechaCosecha, setFechaCosecha] = useState(today);
  const [openProductor, setOpenProductor] = useState(false);
  const [openTipo, setOpenTipo] = useState(false);
  const [openBanco, setOpenBanco] = useState(false);
  const [openAcreedorPago, setOpenAcreedorPago] = useState(false);
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
  const creditorOptions = useMemo(
    () =>
      acreedores.map((acreedor) => ({
        value: acreedor.localId,
        label: formatCreditorName(acreedor),
        helper: `${acreedor.bank} · ${maskAccount(acreedor.accountNumber)}`
      })),
    [acreedores]
  );

  useEffect(() => {
    if (acreedores.length === 1) {
      setAcreedorPagoId(acreedores[0].localId);
    } else if (!acreedores.some((acreedor) => acreedor.localId === acreedorPagoId)) {
      setAcreedorPagoId("");
    }
  }, [acreedorPagoId, acreedores]);

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
      setAcreedorPagoId("");
      setAcreedores(getAcreedoresCosechaLocales(option.value));

      if (acreedorEsProductor) {
        applyCreditorAutofill(nextProductor);
      }

      try {
        setAcreedores(await refreshAcreedoresCosecha(option.value));
      } catch {
        // Los acreedores locales y pendientes siguen disponibles sin conexion.
      }
    } catch {
      setProductorId("");
      setProductor(undefined);
      setSelectedProductor(null);
      setAcreedores([]);
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

  function guardarAcreedor() {
    const validation = validateAcreedorCosecha({
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
      const localId = saveAcreedorCosecha(validation);
      setAcreedores(getAcreedoresCosechaLocales(productorId));
      setAcreedorPagoId(localId);
      Alert.alert("Acreedor guardado", "Puedes agregar otro o registrar la cosecha.");
      setError(null);
      setBanco("");
      setCuenta("");
    } catch {
      setError("No se pudo guardar el acreedor localmente.");
    }
  }

  function guardarRegistro() {
    const validation = harvestRecordSchema.safeParse({
      productorId,
      creditorId: acreedorPagoId,
      crateQuantity: Number(jabas),
      cratePrice: precioJaba.trim().replace(",", "."),
      registrationDate: today,
      harvestDate: fechaCosecha.trim()
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? "Completa los datos de cosecha.");
      return;
    }

    try {
      saveRegistroCosecha(validation.data);
      setError(null);
      setJabas("");
      setPrecioJaba("");
      setFechaCosecha(today);
      Alert.alert("Cosecha guardada", "El registro se sincronizara cuando haya conexion.");
    } catch {
      setError("No se pudo guardar el registro localmente.");
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
            Registra acreedores y los datos de pago de cada cosecha.
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
            icon="people-outline"
            subtitle="Paso 1: registra uno o varios acreedores del productor."
            title="Acreedores de pago"
          />
          {productorId ? (
            <View style={styles.creditorList}>
              <AppText style={styles.creditorListTitle} variant="label">
                {acreedores.length === 0
                  ? "Aun no hay acreedores registrados"
                  : `${acreedores.length} acreedor${acreedores.length === 1 ? "" : "es"} disponible${acreedores.length === 1 ? "" : "s"}`}
              </AppText>
              {acreedores.map((acreedor) => (
                <View key={acreedor.localId} style={styles.creditorRow}>
                  <Ionicons
                    color={theme.colors.primaryDark}
                    name="person-circle-outline"
                    size={22}
                  />
                  <View style={styles.creditorRowText}>
                    <AppText variant="label">{formatCreditorName(acreedor)}</AppText>
                    <AppText variant="caption">
                      {acreedor.bank} · {maskAccount(acreedor.accountNumber)}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
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

        <AppButton label="Guardar acreedor" icon="person-add-outline" onPress={guardarAcreedor} />

        <AppCard style={styles.sectionCard}>
          <SectionHeader
            icon="cash-outline"
            subtitle="Paso 2: registra las jabas y el acreedor que recibira el pago."
            title="Registro de cosecha"
          />
          <AppSelectField
            disabled={!productorId || acreedores.length === 0}
            emptyMessage="Registra primero un acreedor para este productor."
            isOpen={openAcreedorPago}
            label="Acreedor a pagar"
            onClose={() => setOpenAcreedorPago(false)}
            onSelect={(value) => {
              setAcreedorPagoId(value);
              setOpenAcreedorPago(false);
            }}
            onToggle={() => setOpenAcreedorPago((value) => !value)}
            options={creditorOptions}
            placeholder={productorId ? "Selecciona el acreedor" : "Selecciona primero el productor"}
            selectedLabel={creditorOptions.find((item) => item.value === acreedorPagoId)?.label}
          />
          {productorId && acreedores.length === 0 ? (
            <AppText style={styles.helper} variant="caption">
              Agrega un acreedor en el paso 1 para continuar.
            </AppText>
          ) : null}
          <AppInput
            keyboardType="number-pad"
            label="Cantidad de jabas"
            onChangeText={(value) => setJabas(value.replace(/\D/g, ""))}
            placeholder="Ej: 120"
            value={jabas}
          />
          <AppInput
            keyboardType="decimal-pad"
            label="Precio por jaba (S/)"
            onChangeText={(value) => setPrecioJaba(value.replace(/[^0-9.,]/g, ""))}
            placeholder="Ej: 12.50"
            value={precioJaba}
          />
          <AppInput editable={false} label="Fecha actual" value={today} />
          <AppInput
            label="Fecha de cosecha"
            maxLength={10}
            onChangeText={setFechaCosecha}
            placeholder="AAAA-MM-DD"
            value={fechaCosecha}
          />
          <AppText style={styles.helper} variant="caption">
            Puedes modificar la fecha de cosecha, sin superar la fecha actual.
          </AppText>
          <AppButton label="Guardar registro de cosecha" icon="save-outline" onPress={guardarRegistro} />
        </AppCard>

        {error ? (
          <AppText style={styles.error} variant="caption">
            {error}
          </AppText>
        ) : null}
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
  creditorList: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  creditorListTitle: { color: theme.colors.primaryDark },
  creditorRow: {
    alignItems: "center",
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 9,
    paddingTop: 8
  },
  creditorRowText: { flex: 1, gap: 2 },
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
  helper: { color: theme.colors.textMuted },
  error: { color: theme.colors.error }
});

function validateAcreedorCosecha(
  input: AcreedorCosechaFormInput
): HarvestCreditorInput | string {
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
    bank: input.bank as HarvestCreditorInput["bank"],
    productorId: input.productorId.trim(),
    creditorFirstName: input.creditorFirstName.trim(),
    creditorLastName: input.creditorLastName.trim()
  };
}

function formatCreditorName(acreedor: AcreedorCosecha) {
  return [acreedor.creditorFirstName, acreedor.creditorLastName].filter(Boolean).join(" ");
}

function maskAccount(account: string) {
  return account.length <= 4 ? account : `•••• ${account.slice(-4)}`;
}

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
