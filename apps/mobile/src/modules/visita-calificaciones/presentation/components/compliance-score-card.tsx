import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { COMPLIANCE_LEGEND } from "../../types";

const SCORE_COLORS = ["#b42318", "#c2410c", "#b7791f", "#007f4f"] as const;

type ComplianceScoreCardProps = {
  value: number | null;
  onChange: (value: number) => void;
};

export function ComplianceScoreCard({ value, onChange }: ComplianceScoreCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons color={theme.colors.primaryDark} name="analytics-outline" size={21} />
        </View>
        <View style={styles.headerCopy}>
          <AppText style={styles.title} variant="heading">
            Evaluacion de cumplimiento
          </AppText>
          <AppText style={styles.subtitle} variant="muted">
            Selecciona el puntaje tecnico aplicado a este modulo.
          </AppText>
        </View>
      </View>

      <View style={styles.scoreGrid}>
        {COMPLIANCE_LEGEND.map((item) => {
          const isSelected = value === item.puntaje;

          return (
            <Pressable
              accessibilityLabel={`${item.puntaje} puntos, ${item.title}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={item.puntaje}
              onPress={() => onChange(item.puntaje)}
              style={({ pressed }) => [
                styles.scoreButton,
                {
                  borderColor: SCORE_COLORS[item.puntaje],
                  backgroundColor: isSelected
                    ? SCORE_COLORS[item.puntaje]
                    : theme.colors.surface
                },
                pressed && styles.pressed
              ]}
            >
              <AppText
                style={[styles.scoreValue, isSelected && styles.scoreValueSelected]}
                variant="label"
              >
                {item.puntaje}
              </AppText>
              <AppText
                style={[styles.scoreLabel, isSelected && styles.scoreLabelSelected]}
                variant="caption"
              >
                pts
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendList}>
        {COMPLIANCE_LEGEND.map((item) => (
          <View key={item.puntaje} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: SCORE_COLORS[item.puntaje] }
              ]}
            />
            <View style={styles.legendCopy}>
              <AppText style={styles.legendTitle} variant="label">
                {item.puntaje} - {item.title}
              </AppText>
              <AppText style={styles.legendDescription} variant="caption">
                {item.description}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 14,
    ...theme.shadow.sm
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
    height: 38,
    justifyContent: "center",
    width: 38
  },
  legendCopy: {
    flex: 1,
    gap: 2
  },
  legendDescription: {
    color: theme.colors.textMuted,
    lineHeight: 16
  },
  legendDot: {
    borderRadius: theme.radius.full,
    height: 10,
    marginTop: 4,
    width: 10
  },
  legendItem: {
    flexDirection: "row",
    gap: 9
  },
  legendList: {
    gap: 9
  },
  legendTitle: {
    color: theme.colors.text,
    fontSize: 13
  },
  pressed: {
    opacity: 0.72
  },
  scoreButton: {
    alignItems: "center",
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    minWidth: 0
  },
  scoreGrid: {
    flexDirection: "row",
    gap: 8
  },
  scoreLabel: {
    color: theme.colors.textMuted,
    fontSize: 11
  },
  scoreLabelSelected: {
    color: theme.colors.textInverse
  },
  scoreValue: {
    color: theme.colors.text,
    fontSize: 22
  },
  scoreValueSelected: {
    color: theme.colors.textInverse
  },
  subtitle: {
    lineHeight: 18
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 18
  }
});
