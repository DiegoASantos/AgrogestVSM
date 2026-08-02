import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View
} from "react-native";

import {
  AppButton,
  AppCard,
  AppInput,
  AppSelectField,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { getNowIsoString } from "../../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../../shared/database/sync-outbox";
import { getDatabase } from "../../../../shared/database/connection";
import { productoresRepository } from "../../repositories/productores.repository";
import { generatePublicId } from "../../../../shared/utils/local-id";

const ENTITY_TYPE_OPTIONS = [
  { value: "persona", label: "Persona" },
  { value: "fundo", label: "Fundo" },
  { value: "cooperativa", label: "Cooperativa" }
];

export function NuevoProductorScreen() {
  const router = useRouter();
  const [entityType, setEntityType] = useState<"persona" | "fundo" | "cooperativa">("persona");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openEntityType, setOpenEntityType] = useState(false);

  function validate(): string | null {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedDocumentNumber = documentNumber.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();

    if (!normalizedFirstName) {
      return "El nombre es obligatorio.";
    }
    if (normalizedFirstName.length > 100) {
      return "El nombre no puede superar 100 caracteres.";
    }
    if (entityType === "persona" && !normalizedLastName) {
      return "Los apellidos son obligatorios para personas.";
    }
    if (normalizedLastName.length > 100) {
      return "Los apellidos no pueden superar 100 caracteres.";
    }
    const hasDocType = documentTypeId.trim() !== "";
    const hasDocNumber = normalizedDocumentNumber !== "";
    if (entityType === "persona" && hasDocType !== hasDocNumber) {
      return "Tipo y numero de documento deben registrarse juntos.";
    }
    if (hasDocType && (!Number.isInteger(Number(documentTypeId)) || Number(documentTypeId) < 1)) {
      return "El tipo de documento no es valido.";
    }
    if (normalizedDocumentNumber.length > 20) {
      return "El numero de documento no puede superar 20 caracteres.";
    }
    if (normalizedPhone.length > 20) {
      return "El telefono no puede superar 20 caracteres.";
    }
    if (
      normalizedEmail &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
        normalizedEmail.length > 150)
    ) {
      return "Ingresa un email valido de hasta 150 caracteres.";
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const id = generatePublicId();
      const publicId = generatePublicId();
      const now = getNowIsoString();

      const db = getDatabase();
      db.withTransactionSync(() => {
        productoresRepository.insert({
          id,
          publicId,
          entityType,
          documentTypeId:
            entityType === "persona" && documentTypeId
              ? Number(documentTypeId)
              : null,
          documentNumber:
            entityType === "persona" ? documentNumber.trim() || null : null,
          firstName: firstName.trim(),
          lastName: entityType === "persona" ? lastName.trim() || null : null,
          phone: phone.trim() || null,
          email: email.trim().toLowerCase() || null,
          address: address.trim() || null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          serverId: null,
          syncStatus: "pending" as const,
          syncErrorMessage: null
        });

        insertSyncOutboxEntry(db, {
          entityType: "productores",
          entityLocalId: id,
          operation: "create",
          createdAt: now
        });
      });

      router.replace({
        pathname: "/visitas-campo/nueva",
        params: {
          nuevoProductorId: id,
          nuevoProductorLabel: buildLabel()
        }
      });
    } catch {
      setError("Error al guardar el productor.");
    } finally {
      setIsSaving(false);
    }
  }

  function buildLabel() {
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    return fullName || documentNumber || "Nuevo productor";
  }

  const entityTypeLabel = ENTITY_TYPE_OPTIONS.find((o) => o.value === entityType)?.label ?? "Persona";
  const isPersona = entityType === "persona";

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppText variant="title" style={styles.pageTitle}>
          Nuevo productor
        </AppText>
        <AppText variant="body" style={{ color: theme.colors.textMuted, marginBottom: 8 }}>
          Registra los datos del productor. La parcela puede agregarse ahora o despues.
        </AppText>

        <AppCard style={styles.fieldsCard}>
          <AppSelectField
            label="Tipo de entidad"
            placeholder="Selecciona el tipo"
            icon="people-outline"
            options={ENTITY_TYPE_OPTIONS}
            isOpen={openEntityType}
            isLoading={false}
            onSelect={(value) => {
              setEntityType(value as typeof entityType);
              setOpenEntityType(false);
              if (value !== "persona") {
                setDocumentTypeId("");
                setDocumentNumber("");
                setLastName("");
              }
            }}
            onToggle={() => setOpenEntityType((prev) => !prev)}
            onClose={() => setOpenEntityType(false)}
            selectedLabel={entityTypeLabel}
          />

          <View style={styles.divider} />

          <AppInput
            label={isPersona ? "Nombres" : "Nombre de la entidad"}
            placeholder={isPersona ? "Ej: Juan Carlos" : "Ej: Fundo San Pedro"}
            value={firstName}
            onChangeText={setFirstName}
          />

          {isPersona ? (
            <>
              <AppInput
                label="Apellidos"
                placeholder="Ej: Perez Lopez"
                value={lastName}
                onChangeText={setLastName}
              />
              <View style={styles.divider} />
              <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
                Documento (opcional)
              </AppText>
              <AppInput
                label="Tipo de documento"
                placeholder="Ej: 1 para DNI"
                value={documentTypeId}
                onChangeText={setDocumentTypeId}
                keyboardType="numeric"
              />
              <AppInput
                label="Numero de documento"
                placeholder="Ej: 12345678"
                value={documentNumber}
                onChangeText={setDocumentNumber}
              />
            </>
          ) : null}

          <View style={styles.divider} />
          <AppText variant="caption" style={{ color: theme.colors.textMuted }}>
            Datos de contacto (opcional)
          </AppText>
          <AppInput
            label="Telefono"
            placeholder="Ej: 987654321"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <AppInput
            label="Email"
            placeholder="Ej: productor@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppInput
            label="Direccion"
            placeholder="Ej: Av. Principal 123"
            value={address}
            onChangeText={setAddress}
          />
        </AppCard>

        {error ? (
          <View style={styles.errorBanner}>
            <AppText variant="caption" style={styles.errorText}>{error}</AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton
            label="Guardar productor"
            onPress={handleSave}
            disabled={!firstName.trim() || isSaving}
            loading={isSaving}
            icon="save-outline"
          />
          <AppButton
            label="Cancelar"
            onPress={() => router.back()}
            variant="outline"
          />
        </View>

        <AppText style={styles.offlineNote} variant="caption">
          El productor se guarda localmente y se sincroniza cuando haya conexion.
        </AppText>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 0, paddingVertical: 0 },
  scrollContent: { padding: 18, gap: 14 },
  pageTitle: { color: theme.colors.primaryDark, marginBottom: 4 },
  fieldsCard: { padding: 16, gap: 14, backgroundColor: theme.colors.surface },
  divider: { height: 1, backgroundColor: theme.colors.borderLight },
  errorBanner: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.errorMuted
  },
  errorText: { color: theme.colors.error },
  actions: { gap: 10 },
  offlineNote: { textAlign: "center" }
});
