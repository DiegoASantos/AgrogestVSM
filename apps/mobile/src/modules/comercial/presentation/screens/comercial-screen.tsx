import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Switch, View } from "react-native";
import { harvestRecordSchema, type HarvestCreditorInput } from "@agrogest/validation";

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
import { ApiError, ApiOfflineModeError, ApiTimeoutError } from "../../../../shared/services";
import {
  getAcreedoresCosechaLocales,
  refreshAcreedoresCosecha,
  saveAcreedorCosecha,
  type AcreedorCosecha
} from "../../services/acreedores-cosecha.service";
import { issueProducerCreditorAccess } from "../../services/acreedores-cosecha.remote";
import { saveRegistroCosecha } from "../../services/registros-cosecha.service";
import {
  getCreditorAutofill,
  getPendingCreditorFields,
  type CreditorAutofill,
  type CreditorPendingField
} from "./creditor-autofill";
import { isProducerWebUrlAllowed } from "./producer-web-url";

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

type ComercialScreenProps = { step?: "acreedores" | "cosecha" };

export function ComercialScreen({ step = "acreedores" }: ComercialScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ productorId?: string; acreedorId?: string }>();
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
  const isCreditorProductorPersona = acreedorEsProductor && creditorAutofill !== null;
  const pendingCreditorFields = getPendingCreditorFields(creditorAutofill);
  const recoveredCreditorName = [creditorAutofill?.firstName, creditorAutofill?.lastName]
    .filter(Boolean)
    .join(" ");
  const creditorOptions = useMemo(
    () =>
      acreedores.filter((acreedor) => acreedor.approvalStatus === "APPROVED").map((acreedor) => ({
        value: acreedor.localId,
        label: formatCreditorName(acreedor),
        helper: `${acreedor.bank} · ${maskAccount(acreedor.accountNumber)}`
      })),
    [acreedores]
  );

  useEffect(() => {
    if (creditorOptions.length === 1) {
      setAcreedorPagoId(creditorOptions[0].value);
    } else if (
      acreedores.length > 0 &&
      !creditorOptions.some((acreedor) => acreedor.value === acreedorPagoId)
    ) {
      setAcreedorPagoId("");
    }
  }, [acreedorPagoId, acreedores.length, creditorOptions]);

  useEffect(() => {
    if (step !== "cosecha") return;

    const selectedId = params.productorId;
    if (!selectedId) {
      setError("Selecciona primero un productor en Acreedores de pago.");
      return;
    }

    let active = true;
    setProductorId(selectedId);
    setAcreedorPagoId(params.acreedorId ?? "");
    setAcreedores(getAcreedoresCosechaLocales(selectedId));

    void productoresService.getById(selectedId).then(
      (item) => {
        if (active) setProductor(toProductorOption(item).label);
      },
      () => {
        if (active) setError("No se pudo cargar el productor seleccionado.");
      }
    );

    void refreshAcreedoresCosecha(selectedId).then(
      (items) => {
        if (active) setAcreedores(items);
      },
      () => {
        // El listado local permanece disponible sin conexion.
      }
    );

    return () => {
      active = false;
    };
  }, [params.acreedorId, params.productorId, step]);

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

  async function compartirAcceso() {
    const url = process.env.EXPO_PUBLIC_PRODUCTOR_WEB_URL?.trim();
    if (!selectedProductor?.serverId || !isProducerWebUrlAllowed(url)) {
      Alert.alert(
        "Acceso no disponible",
        "Selecciona un productor sincronizado y configura la web pública."
      );
      return;
    }

    let access: { code: string; expiresAt: string };
    try {
      access = await issueProducerCreditorAccess(selectedProductor.serverId);
    } catch (requestError) {
      if (requestError instanceof ApiOfflineModeError) {
        Alert.alert(
          "Modo sin conexión",
          "Cambia la conexión de la app a Automático para solicitar un código."
        );
      } else if (requestError instanceof ApiTimeoutError) {
        Alert.alert(
          "El servidor no responde",
          "La solicitud tardó demasiado. Comprueba el acceso al servidor de AgroGest e inténtalo de nuevo."
        );
      } else if (requestError instanceof ApiError) {
        const status = requestError.statusCode ? ` (HTTP ${requestError.statusCode})` : "";
        Alert.alert(
          "No se pudo generar el código",
          `${requestError.message}${status}`
        );
      } else {
        Alert.alert(
          "No se pudo conectar con AgroGest",
          "Comprueba que el teléfono pueda acceder al servidor de AgroGest e inténtalo de nuevo."
        );
      }
      return;
    }

    try {
      const producerName = [selectedProductor.firstName, selectedProductor.lastName]
        .filter(Boolean).join(" ").trim();
      await Share.share({
        message: `Buen día${producerName ? `, ${producerName}` : ""}.\n\nLe comparto el enlace para registrar sus datos para el pago:\n\n${url}\n\nCódigo de acceso: ${access.code}\nVálido por 180 días.\nNo compartas este código con otra persona.`
      });
    } catch {
      Alert.alert(
        "No se pudo abrir compartir",
        "El código ya se generó. Vuelve a intentarlo para compartirlo."
      );
    }
  }

  async function actualizarAcreedores() {
    if (!productorId) return;
    try {
      setAcreedores(await refreshAcreedoresCosecha(productorId));
      setError(null);
    } catch {
      setError("No se pudieron actualizar los acreedores. Se muestran los datos locales.");
    }
  }

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
      saveAcreedorCosecha(validation);
      setAcreedores(getAcreedoresCosechaLocales(productorId));
      Alert.alert(
        "Acreedor guardado",
        "El perfil quedó pendiente de aprobación. Puedes agregar otro acreedor."
      );
      setError(null);
      setBanco("");
      setCuenta("");
    } catch {
      setError("No se pudo guardar el acreedor localmente.");
    }
  }

  function openCosecha() {
    if (!productorId || creditorOptions.length === 0) return;
    setError(null);
    router.push({
      pathname: "/comercial/cosecha",
      params: { productorId, acreedorId: acreedorPagoId }
    });
  }

  function guardarRegistro() {
    if (!creditorOptions.some((acreedor) => acreedor.value === acreedorPagoId)) {
      setError("Selecciona un acreedor aprobado antes de registrar la cosecha.");
      return;
    }

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
      Alert.alert(
        "Cosecha guardada",
        "El registro se sincronizara cuando haya conexion."
      );
    } catch {
      setError("No se pudo guardar el registro localmente.");
    }
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <FormScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <AppText style={styles.title} variant="title">
            {step === "cosecha" ? "Registro de cosecha" : "Comercial"}
          </AppText>
          <AppText style={styles.subtitle} variant="body">
            {step === "cosecha"
              ? "Registra las jabas y el acreedor que recibirá el pago."
              : "Registra acreedores y continúa con los datos de cada cosecha."}
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

        {step === "acreedores" ? (
          <>
            <AppCard style={styles.sectionCard}>
              <SectionHeader
                icon="people-outline"
                subtitle="Comparte el formulario para que el productor registre sus datos; agrega un acreedor manualmente si hace falta."
                title="Acreedores de pago"
              />
              {productorId ? (
                <AppButton
                  label="Compartir formulario con el productor"
                  icon="share-social-outline"
                  onPress={() => { void compartirAcceso(); }}
                />
              ) : null}
              {productorId ? (
                <AppButton
                  label="Actualizar estados de acreedores"
                  icon="refresh-outline"
                  onPress={() => { void actualizarAcreedores(); }}
                />
              ) : null}
              {productorId ? (
                <View style={styles.creditorList}>
                  <AppText style={styles.creditorListTitle} variant="label">
                    {acreedores.length === 0
                      ? "Aun no hay acreedores registrados"
                      : `${acreedores.length} acreedor${acreedores.length === 1 ? "" : "es"} registrado${acreedores.length === 1 ? "" : "s"}`}
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
                        <AppText variant="caption">
                          {acreedor.approvalStatus === "APPROVED"
                            ? "Aprobado"
                            : acreedor.approvalStatus === "OBSERVED"
                              ? "Observado"
                              : "Pendiente de aprobación"}
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
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.primaryMuted
                  }}
                  value={acreedorEsProductor}
                />
              </View>

              {isCreditorProductorPersona && creditorAutofill ? (
                <View style={styles.creditorSummary}>
                  <Ionicons
                    color={theme.colors.primaryDark}
                    name="checkmark-circle"
                    size={21}
                  />
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
                  <Ionicons
                    color={theme.colors.warning}
                    name="information-circle"
                    size={20}
                  />
                  <AppText style={styles.manualNoticeText} variant="caption">
                    Este productor no es una persona. Registra los datos del acreedor
                    manualmente.
                  </AppText>
                </View>
              ) : null}

              {!isCreditorProductorPersona ||
              pendingCreditorFields.includes("firstName") ? (
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
              {!isCreditorProductorPersona ||
              pendingCreditorFields.includes("lastName") ? (
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
              {!isCreditorProductorPersona ||
              pendingCreditorFields.includes("documentType") ? (
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
              {!isCreditorProductorPersona ||
              pendingCreditorFields.includes("documentNumber") ? (
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

            <AppButton
              label="Guardar acreedor"
              icon="person-add-outline"
              onPress={guardarAcreedor}
            />

            <AppButton
              disabled={!productorId || creditorOptions.length === 0}
              icon="leaf-outline"
              label="Cosecha"
              onPress={openCosecha}
              variant="secondary"
            />
            {!productorId || creditorOptions.length === 0 ? (
              <AppText style={styles.helper} variant="caption">
                Selecciona un productor y espera la aprobación de un acreedor para continuar a Cosecha.
              </AppText>
            ) : null}
          </>
        ) : (
          <>
            <AppButton
              icon="arrow-back-outline"
              label="Volver a acreedores"
              onPress={() => router.back()}
              variant="outline"
            />

            <AppCard style={styles.sectionCard}>
              <SectionHeader
                icon="cash-outline"
                subtitle="Paso 2: registra las jabas y el acreedor que recibira el pago."
                title="Registro de cosecha"
              />
              <AppSelectField
                disabled={!productorId || creditorOptions.length === 0}
                emptyMessage="Aún no hay acreedores aprobados para este productor."
                isOpen={openAcreedorPago}
                label="Acreedor a pagar"
                onClose={() => setOpenAcreedorPago(false)}
                onSelect={(value) => {
                  setAcreedorPagoId(value);
                  setOpenAcreedorPago(false);
                }}
                onToggle={() => setOpenAcreedorPago((value) => !value)}
                options={creditorOptions}
                placeholder={
                  productorId
                    ? "Selecciona el acreedor"
                    : "Selecciona primero el productor"
                }
                selectedLabel={
                  creditorOptions.find((item) => item.value === acreedorPagoId)?.label
                }
              />
              {productorId && creditorOptions.length === 0 ? (
                <AppText style={styles.helper} variant="caption">
                  Espera la aprobación del analista para registrar una cosecha.
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
              <HarvestDatePicker
                maxDate={today}
                onChange={setFechaCosecha}
                value={fechaCosecha}
              />
              <AppText style={styles.helper} variant="caption">
                Puedes modificar la fecha de cosecha, sin superar la fecha actual.
              </AppText>
              <AppButton
                disabled={!productorId || acreedores.length === 0}
                label="Guardar registro de cosecha"
                icon="save-outline"
                onPress={guardarRegistro}
              />
            </AppCard>
          </>
        )}

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

type HarvestDatePickerProps = {
  maxDate: string;
  onChange: (value: string) => void;
  value: string;
};

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];

function HarvestDatePicker({ maxDate, onChange, value }: HarvestDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(parseLocalDate(value) ?? new Date())
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (visibleMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const monthCells = Array.from(
    { length: cellCount },
    (_, index) => index - firstWeekday + 1
  );
  const latestMonth = getMonthStart(parseLocalDate(maxDate) ?? new Date());
  const canGoForward = visibleMonth.getTime() < latestMonth.getTime();

  return (
    <View style={styles.datePicker}>
      <AppText variant="label">Fecha de cosecha</AppText>
      <Pressable
        accessibilityLabel={`Fecha de cosecha: ${value}. Abrir calendario`}
        accessibilityRole="button"
        onPress={() => {
          if (!isOpen)
            setVisibleMonth(getMonthStart(parseLocalDate(value) ?? new Date()));
          setIsOpen((current) => !current);
        }}
        style={styles.dateTrigger}
      >
        <AppText variant="body">{value}</AppText>
        <Ionicons color={theme.colors.primaryDark} name="calendar-outline" size={21} />
      </Pressable>
      {isOpen ? (
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <Pressable
              accessibilityLabel="Mes anterior"
              accessibilityRole="button"
              onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}
              style={styles.calendarArrow}
            >
              <Ionicons color={theme.colors.primaryDark} name="chevron-back" size={20} />
            </Pressable>
            <AppText style={styles.calendarTitle} variant="label">
              {MONTHS[month]} {year}
            </AppText>
            <Pressable
              accessibilityLabel="Mes siguiente"
              accessibilityRole="button"
              disabled={!canGoForward}
              onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}
              style={[styles.calendarArrow, !canGoForward && styles.calendarDisabled]}
            >
              <Ionicons
                color={theme.colors.primaryDark}
                name="chevron-forward"
                size={20}
              />
            </Pressable>
          </View>
          <View style={styles.calendarGrid}>
            {WEEKDAYS.map((day, index) => (
              <View key={`${day}-${index}`} style={styles.calendarCell}>
                <AppText style={styles.calendarWeekday} variant="caption">
                  {day}
                </AppText>
              </View>
            ))}
            {monthCells.map((day, index) => {
              if (day < 1 || day > daysInMonth) {
                return <View key={`empty-${index}`} style={styles.calendarCell} />;
              }

              const dateValue = formatLocalDate(new Date(year, month, day));
              const isFuture = dateValue > maxDate;
              const isSelected = dateValue === value;

              return (
                <Pressable
                  accessibilityLabel={dateValue}
                  accessibilityRole="button"
                  disabled={isFuture}
                  key={dateValue}
                  onPress={() => {
                    onChange(dateValue);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.calendarCell,
                    isSelected && styles.calendarSelected,
                    isFuture && styles.calendarDisabled
                  ]}
                >
                  <AppText
                    style={isSelected ? styles.calendarSelectedText : undefined}
                    variant="body"
                  >
                    {day}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function getAutofillForProductor(productor: Productor | null): CreditorAutofill | null {
  const documentTypeCode = productor?.documentTypeId
    ? (tiposDocumentoRepository.obtenerPorId(productor.documentTypeId)?.code ?? null)
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
  datePicker: { gap: 6 },
  dateTrigger: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 14
  },
  calendarPanel: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  calendarArrow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    width: 40
  },
  calendarTitle: { color: theme.colors.primaryDark, textTransform: "capitalize" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    width: "14.2857%"
  },
  calendarWeekday: { color: theme.colors.textMuted },
  calendarSelected: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.full
  },
  calendarSelectedText: { color: theme.colors.textInverse },
  calendarDisabled: { opacity: 0.35 },
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
  return [acreedor.creditorFirstName, acreedor.creditorLastName]
    .filter(Boolean)
    .join(" ");
}

function maskAccount(account: string) {
  return account.length <= 4 ? account : `•••• ${account.slice(-4)}`;
}

function getLocalDate() {
  return formatLocalDate(new Date());
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return formatLocalDate(date) === value ? date : null;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
