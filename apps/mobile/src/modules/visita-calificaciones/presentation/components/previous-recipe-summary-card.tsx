import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import type { CalificacionModulo, RecetaAnterior } from "../../types";

type PreviousRecipeSummaryCardProps = {
  receta: RecetaAnterior | null;
  modulo: CalificacionModulo;
};

export function PreviousRecipeSummaryCard({
  receta,
  modulo
}: PreviousRecipeSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = buildSummary(receta, modulo);
  const details = buildDetails(receta, modulo);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsExpanded((current) => !current)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.iconBox}>
          <Ionicons color={theme.colors.primaryDark} name="document-text-outline" size={20} />
        </View>
        <View style={styles.headerCopy}>
          <AppText style={styles.title} variant="heading">
            Receta anterior
          </AppText>
          <AppText style={styles.summary} variant="caption">
            {summary}
          </AppText>
        </View>
        <Ionicons
          color={theme.colors.textMuted}
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
        />
      </Pressable>

      {isExpanded ? (
        <View style={styles.details}>
          {details.length === 0 ? (
            <AppText style={styles.emptyText} variant="muted">
              No hay recomendaciones previas para este modulo.
            </AppText>
          ) : (
            details.map((detail, index) => (
              <AppText key={`${detail}-${index}`} style={styles.detailText} variant="muted">
                {detail}
              </AppText>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

function buildSummary(receta: RecetaAnterior | null, modulo: CalificacionModulo) {
  if (!receta) {
    return "Buscando referencia previa...";
  }

  if (!receta.existe) {
    return "Primera visita o visita previa sin receta clasifiable.";
  }

  const count = buildDetails(receta, modulo).length;
  const fecha = receta.fechaVisita ? ` del ${receta.fechaVisita}` : "";

  return `${count} recomendacion${count === 1 ? "" : "es"}${fecha}.`;
}

function buildDetails(receta: RecetaAnterior | null, modulo: CalificacionModulo) {
  if (!receta?.existe) {
    return [];
  }

  if (modulo === "plagas" || modulo === "enfermedades") {
    const objetivo = modulo === "plagas" ? "plaga" : "enfermedad";

    return (receta.fitosanidad ?? [])
      .filter((item) => item.objetivo === objetivo)
      .map((item) =>
        [
          item.objetivoNombre,
          item.ingredienteActivoNombre,
          item.marcaProductoNombre,
          item.dosisIa ? `${item.dosisIa}` : null
        ]
          .filter(Boolean)
          .join(" - ")
      );
  }

  if (modulo === "nutricion") {
    return (receta.fertilizacion ?? []).map((item) =>
      [
        item.fertilizanteNombre,
        item.viaAplicacion,
        item.dosis ? `${item.dosis} ${item.unidadDosis ?? ""}`.trim() : null
      ]
        .filter(Boolean)
        .join(" - ")
    );
  }

  if (modulo === "riego") {
    return receta.riego ? [receta.riego.tipoRecomendacion] : [];
  }

  return (receta.labores ?? []).map((item) => item.labor);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: 12,
    ...theme.shadow.sm
  },
  detailText: {
    lineHeight: 18
  },
  details: {
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    gap: 8,
    marginTop: 12,
    paddingTop: 12
  },
  emptyText: {
    fontStyle: "italic"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: theme.colors.primaryMuted,
    borderRadius: theme.radius.full,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  pressed: {
    opacity: 0.72
  },
  summary: {
    color: theme.colors.textMuted,
    lineHeight: 17
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 17
  }
});
