import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View
} from "react-native";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import { COMPLIANCE_LEGEND } from "../../types";
import { JUSTIFICACION_CATEGORIAS } from "../../types/justification-catalog";

const SCORE_COLORS = ["#b42318", "#c2410c", "#b7791f", "#007f4f"] as const;

type ComplianceScoreCardProps = {
  value: number | null;
  onChange: (value: number) => void;
  justificado: boolean | null;
  onJustificadoChange: (value: boolean) => void;
  categoriaJustificacion: string | null;
  onCategoriaJustificacionChange: (value: string) => void;
  motivoJustificacion: string | null;
  onMotivoJustificacionChange: (value: string) => void;
  observacion: string;
  onObservacionChange: (value: string) => void;
};

export function ComplianceScoreCard({
  value,
  onChange,
  justificado,
  onJustificadoChange,
  categoriaJustificacion,
  onCategoriaJustificacionChange,
  motivoJustificacion,
  onMotivoJustificacionChange,
  observacion,
  onObservacionChange
}: ComplianceScoreCardProps) {
  const [selector, setSelector] = useState<"categoria" | "motivo" | null>(null);
  const selectedCategory = useMemo(
    () =>
      JUSTIFICACION_CATEGORIAS.find(
        (category) => category.id === categoriaJustificacion
      ) ?? null,
    [categoriaJustificacion]
  );
  const selectedReason = useMemo(
    () =>
      selectedCategory?.motivos.find((reason) => reason.id === motivoJustificacion) ??
      null,
    [motivoJustificacion, selectedCategory]
  );
  const requiresJustification = value !== null && value < 3;

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

      {requiresJustification ? (
        <View style={styles.justificationBlock}>
          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <AppText style={styles.switchTitle} variant="label">
                Incumplimiento justificado
              </AppText>
              <AppText style={styles.switchHint} variant="caption">
                Marca si la causa no dependio del productor.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Incumplimiento justificado"
              accessibilityRole="switch"
              ios_backgroundColor={theme.colors.border}
              onValueChange={onJustificadoChange}
              thumbColor={justificado ? theme.colors.primaryDark : theme.colors.surface}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primaryMuted
              }}
              value={justificado === true}
            />
          </View>

          {justificado === true ? (
            <View style={styles.selectGroup}>
              <SelectButton
                label="Categoria"
                onPress={() => setSelector("categoria")}
                value={selectedCategory?.label ?? "Seleccionar categoria"}
              />
              <SelectButton
                disabled={!selectedCategory}
                label="Motivo"
                onPress={() => setSelector("motivo")}
                value={selectedReason?.label ?? "Seleccionar motivo"}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.observationBlock}>
        <AppText style={styles.observationTitle} variant="label">
          Observacion del paso
        </AppText>
        <TextInput
          multiline
          numberOfLines={4}
          onChangeText={onObservacionChange}
          placeholder="Escribe una observacion opcional"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.observationInput}
          textAlignVertical="top"
          value={observacion}
        />
      </View>

      <SelectionModal
        options={JUSTIFICACION_CATEGORIAS.map((category) => ({
          id: category.id,
          label: category.label
        }))}
        onClose={() => setSelector(null)}
        onSelect={(categoryId) => {
          onCategoriaJustificacionChange(categoryId);
          onMotivoJustificacionChange("");
          setSelector(null);
        }}
        title="Selecciona categoria"
        visible={selector === "categoria"}
      />
      <SelectionModal
        options={selectedCategory?.motivos ?? []}
        onClose={() => setSelector(null)}
        onSelect={(reasonId) => {
          onMotivoJustificacionChange(reasonId);
          setSelector(null);
        }}
        title="Selecciona motivo"
        visible={selector === "motivo"}
      />
    </View>
  );
}

function SelectButton({
  disabled,
  label,
  onPress,
  value
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectButton,
        disabled && styles.selectButtonDisabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <View style={styles.selectCopy}>
        <AppText style={styles.selectLabel} variant="caption">
          {label}
        </AppText>
        <AppText style={styles.selectValue} variant="label">
          {value}
        </AppText>
      </View>
      <Ionicons color={theme.colors.primaryDark} name="chevron-down" size={20} />
    </Pressable>
  );
}

function SelectionModal({
  onClose,
  onSelect,
  options,
  title,
  visible
}: {
  onClose: () => void;
  onSelect: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  title: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <AppText style={styles.modalTitle} variant="heading">
              {title}
            </AppText>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons color={theme.colors.primaryDark} name="close" size={22} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {options.map((option) => (
              <Pressable
                accessibilityRole="button"
                key={option.id}
                onPress={() => onSelect(option.id)}
                style={({ pressed }) => [
                  styles.modalOption,
                  pressed && styles.pressed
                ]}
              >
                <AppText style={styles.modalOptionText} variant="label">
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  justificationBlock: {
    borderTopColor: theme.colors.borderLight,
    borderTopWidth: 1,
    gap: 12,
    paddingTop: 12
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(8, 31, 20, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  modalCloseButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    gap: 12,
    maxHeight: "70%",
    padding: 18,
    width: "90%"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  modalList: {
    maxHeight: 360
  },
  modalOption: {
    borderBottomColor: theme.colors.borderLight,
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  modalOptionText: {
    color: theme.colors.text,
    fontSize: 16
  },
  modalTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: 20
  },
  observationBlock: {
    gap: 8
  },
  observationInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 92,
    padding: 12
  },
  observationTitle: {
    color: theme.colors.primaryDark,
    fontSize: 14
  },
  pressed: {
    opacity: 0.72
  },
  selectButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  selectButtonDisabled: {
    opacity: 0.55
  },
  selectCopy: {
    flex: 1,
    gap: 2
  },
  selectGroup: {
    gap: 8
  },
  selectLabel: {
    color: theme.colors.textMuted
  },
  selectValue: {
    color: theme.colors.text,
    fontSize: 14
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
  switchCopy: {
    flex: 1,
    gap: 2
  },
  switchHint: {
    color: theme.colors.textMuted
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  switchTitle: {
    color: theme.colors.text,
    fontSize: 14
  },
  title: {
    color: theme.colors.primaryDark,
    fontSize: 18
  }
});
