import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppStatusBadge,
  AppText,
  ScreenContainer
} from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { toApiError } from "../../../../shared/services";
import { useAuthSession } from "../../../auth/hooks/use-auth-session";
import { visitaPdfReportService, visitasCampoService } from "../../services";
import { visitaRecetaPdfReportService } from "../../../visita-recetas/services";
import type { RecentVisitaCampo, VisitaCampo } from "../../types";

type PdfAction = "diagnostico" | "receta";

export function VisitasHistoryScreen() {
  const router = useRouter();
  const { session } = useAuthSession();
  const [visitas, setVisitas] = useState<RecentVisitaCampo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePdfAction, setActivePdfAction] = useState<{
    visitaId: string;
    action: PdfAction;
  } | null>(null);

  const loadVisitas = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!session.accessToken) {
      setVisitas([]);
      setIsLoading(false);
      setError("Inicia sesion para consultar tu historial.");
      return;
    }

    try {
      setVisitas(visitasCampoService.getByAccessToken(session.accessToken));
    } catch (nextError) {
      setVisitas([]);
      setError(toApiError(nextError).message || "No se pudo cargar el historial.");
    } finally {
      setIsLoading(false);
    }
  }, [session.accessToken]);

  useFocusEffect(loadVisitas);

  return (
    <ScreenContainer contentStyle={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          eyebrow="Visitas de campo"
          title="Historial"
          subtitle="Consulta las visitas que registraste desde este dispositivo."
        />

        {isLoading ? (
          <AppCard>
            <AppText variant="muted">Cargando historial...</AppText>
          </AppCard>
        ) : null}

        {!isLoading && error ? (
          <AppCard>
            <AppHeader title="No se pudo cargar el historial" subtitle={error} />
            <AppButton label="Reintentar" onPress={loadVisitas} />
          </AppCard>
        ) : null}

        {!isLoading && !error && visitas.length === 0 ? (
          <AppCard>
            <AppEmptyState
              title="Todavia no registraste visitas"
              message="Cuando guardes una visita desde la app aparecera aqui."
            />
          </AppCard>
        ) : null}

        {!isLoading && !error
          ? visitas.map((visita) => (
              <HistoryItem
                key={visita.id}
                onPress={() =>
                  router.push({
                    pathname: "/visitas-campo/[id]",
                    params: { id: visita.id }
                  })
                }
                onShareDiagnostico={() => {
                  void handlePdfAction(visita.id, "diagnostico");
                }}
                onShareReceta={() => {
                  void handlePdfAction(visita.id, "receta");
                }}
                pdfAction={
                  activePdfAction?.visitaId === visita.id ? activePdfAction.action : null
                }
                visita={visita}
              />
            ))
          : null}
      </ScrollView>
    </ScreenContainer>
  );
  async function handlePdfAction(visitaId: string, action: PdfAction) {
    if (activePdfAction) {
      return;
    }

    setActivePdfAction({ visitaId, action });

    try {
      if (action === "diagnostico") {
        await visitaPdfReportService.share(visitaId);
      } else {
        await visitaRecetaPdfReportService.share(visitaId);
      }
    } catch (nextError) {
      const apiError = toApiError(nextError);
      Alert.alert(
        "No se pudo compartir el PDF",
        apiError.message || "Intenta nuevamente."
      );
    } finally {
      setActivePdfAction(null);
    }
  }
}

function HistoryItem({
  onPress,
  onShareDiagnostico,
  onShareReceta,
  pdfAction,
  visita
}: {
  onPress: () => void;
  onShareDiagnostico: () => void;
  onShareReceta: () => void;
  pdfAction: PdfAction | null;
  visita: RecentVisitaCampo;
}) {
  return (
    <AppCard style={styles.visitCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.visitPressable, pressed && styles.pressed]}
      >
        <View style={styles.visitRow}>
          <View style={styles.iconWrap}>
            <Ionicons color="#08643f" name="clipboard-outline" size={23} />
          </View>
          <View style={styles.visitCopy}>
            <AppText variant="label">
              {visita.parcelaName ? `Visita a ${visita.parcelaName}` : "Visita de campo"}
            </AppText>
            <AppText style={styles.visitDate} variant="caption">
              {formatVisitDateTime(visita.visitDate, visita.startVisitTime)}
            </AppText>
          </View>
          <AppStatusBadge
            label={syncLabel(visita.syncStatus)}
            variant={syncVariant(visita.syncStatus)}
          />
          <Ionicons color="#064b31" name="chevron-forward" size={21} />
        </View>
      </Pressable>

      <View style={styles.pdfActions}>
        <View style={styles.pdfActionButton}>
          <AppButton
            icon="share-social-outline"
            label="Compartir diagnostico"
            loading={pdfAction === "diagnostico"}
            onPress={onShareDiagnostico}
            size="small"
            variant="secondary"
          />
        </View>
        <View style={styles.pdfActionButton}>
          <AppButton
            icon="receipt-outline"
            label="Compartir receta"
            loading={pdfAction === "receta"}
            onPress={onShareReceta}
            size="small"
            variant="outline"
          />
        </View>
      </View>
    </AppCard>
  );
}

function formatVisitDateTime(visitDate: string, startVisitTime: string) {
  const date = new Date(`${visitDate}T${startVisitTime || "00:00:00"}`);

  if (Number.isNaN(date.getTime())) {
    return `${visitDate}, ${startVisitTime}`;
  }

  return date.toLocaleString("es-PE", {
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function syncLabel(status: VisitaCampo["syncStatus"]) {
  if (status === "synced") {
    return "Sincronizada";
  }

  if (status === "error") {
    return "Con error";
  }

  return "Pendiente";
}

function syncVariant(status: VisitaCampo["syncStatus"]) {
  if (status === "synced") {
    return "success" as const;
  }

  if (status === "error") {
    return "error" as const;
  }

  return "warning" as const;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0
  },
  scrollContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18
  },
  visitCard: {
    paddingHorizontal: 13,
    paddingVertical: 13
  },
  visitPressable: {
    borderRadius: theme.radius.md
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: theme.colors.primaryMuted
  },
  visitCopy: {
    minWidth: 0,
    flex: 1
  },
  visitDate: {
    marginTop: 2
  },
  pdfActions: {
    flexDirection: "column",
    gap: 8,
    marginTop: 12
  },
  pdfActionButton: {
    flex: 1
  },
  pressed: {
    opacity: 0.8
  }
});
