import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppDetailRow,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { toApiError } from "../../../../shared/services";
import { productoresService } from "../../services";
import type { Productor } from "../../types";

export function ProductorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productorId = toSingleParam(params.id);

  const [productor, setProductor] = useState<Productor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productorId) {
      setIsLoading(false);
      setError("No se recibio un identificador de productor valido.");
      return;
    }

    void loadProductor(productorId);
  }, [productorId]);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando detalle del productor...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="Error" subtitle={error} />
            <AppButton
              label="Volver al listado"
              onPress={() => router.replace("/productores")}
            />
          </AppCard>
        ) : null}

        {!isLoading && !error && productor ? (
          <>
            <AppCard>
              <View style={styles.headerRow}>
                <AppHeader
                  title={`Productor ${productor.documentNumber}`}
                  style={styles.headerText}
                />
                <AppStatusBadge
                  label={productor.isActive ? "Activo" : "Inactivo"}
                  variant={productor.isActive ? "success" : "neutral"}
                />
              </View>

              <View style={styles.details}>
                <AppDetailRow
                  label="Tipo doc."
                  value={String(productor.documentTypeId)}
                />
                <AppDetailRow label="Documento" value={productor.documentNumber} />
                <AppDetailRow
                  label="Correo"
                  value={productor.email || "No registrado"}
                />
                <AppDetailRow
                  label="Telefono"
                  value={productor.phone || "No registrado"}
                />
                <AppDetailRow
                  label="Direccion"
                  value={productor.address || "No registrada"}
                />
                <AppDetailRow label="Public ID" value={productor.publicId} />
              </View>
            </AppCard>

            <View style={styles.actions}>
              <AppButton
                label="Ver sectores"
                onPress={() =>
                  router.push({
                    pathname: "/productores/sectores",
                    params: {
                      productorId: productor.id,
                      documentNumber: productor.documentNumber
                    }
                  })
                }
              />
              <AppButton
                label="Volver al listado"
                onPress={() => router.back()}
                variant="outline"
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );

  async function loadProductor(id: string) {
    setIsLoading(true);
    setError(null);

    try {
      const nextProductor = await productoresService.getById(id);
      setProductor(nextProductor);
    } catch (nextError) {
      const apiError = toApiError(nextError);
      setError(apiError.message || "No se pudo obtener el detalle.");
    } finally {
      setIsLoading(false);
    }
  }
}

function toSingleParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    gap: 16
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  headerText: {
    flex: 1
  },
  details: {
    gap: 2
  },
  actions: {
    gap: 10,
    paddingBottom: 12
  }
});
