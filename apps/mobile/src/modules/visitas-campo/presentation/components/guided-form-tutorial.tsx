import Ionicons from "@expo/vector-icons/Ionicons";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  type ScrollView,
  StyleSheet,
  View
} from "react-native";

import { AppText } from "../../../../shared/components";
export type GuidedFormTutorialStep = {
  id: string;
  title: string;
  instruction: string;
  isComplete: boolean;
  isEnabled: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  isOptional: boolean;
  nextLabel?: string;
};

type TargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type GuidedFormTutorialProps = {
  canGoBack: boolean;
  currentPosition: number;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  refreshKey: string;
  scrollRef: RefObject<ScrollView | null>;
  scrollY: number;
  step: GuidedFormTutorialStep;
  target: View | null;
  totalSteps: number;
};

const TARGET_PADDING = 7;
const TARGET_TOP_GUIDE = 128;

export function GuidedFormTutorial({
  canGoBack,
  currentPosition,
  onBack,
  onClose,
  onNext,
  refreshKey,
  scrollRef,
  scrollY,
  step,
  target,
  totalSteps
}: GuidedFormTutorialProps) {
  const rootRef = useRef<View>(null);
  const remeasureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollYRef = useRef(scrollY);
  const [rootHeight, setRootHeight] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    scrollYRef.current = scrollY;
  }, [scrollY]);

  const measureTarget = useCallback(
    (allowScroll: boolean) => {
      if (!rootRef.current || !target || rootHeight <= 0) {
        setTargetRect(null);
        return;
      }

      rootRef.current.measureInWindow((rootX, rootY) => {
        target.measureInWindow((targetX, targetY, width, height) => {
          if (width <= 0 || height <= 0) {
            setTargetRect(null);
            return;
          }

          const localY = targetY - rootY;
          const visibleBottom = rootHeight - 260;
          if (
            allowScroll &&
            scrollRef.current &&
            (localY < TARGET_TOP_GUIDE || localY + height > visibleBottom)
          ) {
            const nextY = Math.max(0, scrollYRef.current + localY - TARGET_TOP_GUIDE);
            scrollRef.current.scrollTo({ animated: true, y: nextY });
            if (remeasureTimerRef.current) {
              clearTimeout(remeasureTimerRef.current);
            }
            remeasureTimerRef.current = setTimeout(() => measureTarget(false), 360);
            return;
          }

          setTargetRect({
            x: Math.max(TARGET_PADDING, targetX - rootX - TARGET_PADDING),
            y: Math.max(TARGET_PADDING, localY - TARGET_PADDING),
            width: width + TARGET_PADDING * 2,
            height: height + TARGET_PADDING * 2
          });
        });
      });
    },
    [rootHeight, scrollRef, target]
  );

  useEffect(() => {
    setTargetRect(null);
    measureTarget(true);
    void AccessibilityInfo.announceForAccessibility(`${step.title}. ${step.instruction}`);

    return () => {
      if (remeasureTimerRef.current) {
        clearTimeout(remeasureTimerRef.current);
      }
    };
  }, [measureTarget, refreshKey, step.id, step.instruction, step.title]);

  const buttonLabel = step.isLoading
    ? "Cargando..."
    : (step.nextLabel ?? (step.isOptional && !step.isComplete ? "Omitir" : "Siguiente"));

  return (
    <View
      onLayout={(event) => setRootHeight(event.nativeEvent.layout.height)}
      pointerEvents="box-none"
      ref={rootRef}
      style={styles.root}
    >
      {targetRect ? (
        <>
          <BlockingArea height={targetRect.y} left={0} top={0} width="100%" />
          <BlockingArea
            height={targetRect.height}
            left={0}
            top={targetRect.y}
            width={targetRect.x}
          />
          <BlockingArea
            height={targetRect.height}
            left={targetRect.x + targetRect.width}
            right={0}
            top={targetRect.y}
          />
          <BlockingArea
            bottom={0}
            left={0}
            top={targetRect.y + targetRect.height}
            width="100%"
          />

          <View
            pointerEvents="none"
            style={[
              styles.targetOutline,
              {
                height: targetRect.height,
                left: targetRect.x,
                top: targetRect.y,
                width: targetRect.width
              }
            ]}
          />

          <TutorialCard
            buttonLabel={buttonLabel}
            canGoBack={canGoBack}
            currentPosition={currentPosition}
            onBack={onBack}
            onClose={onClose}
            onNext={onNext}
            rootHeight={rootHeight}
            step={step}
            targetRect={targetRect}
            totalSteps={totalSteps}
          />
        </>
      ) : (
        <View style={styles.locatingBackdrop}>
          <View style={styles.locatingCard}>
            <Ionicons color="#2d6a4f" name="navigate" size={24} />
            <AppText style={styles.locatingText} variant="label">
              Ubicando el campo...
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.exitOnlyButton}
            >
              <AppText style={styles.exitOnlyText} variant="label">
                Salir
              </AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

type BlockingAreaProps = {
  bottom?: number;
  height?: number;
  left?: number;
  right?: number;
  top?: number;
  width?: number | `${number}%`;
};

function BlockingArea(props: BlockingAreaProps) {
  return (
    <Pressable
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onPress={() => undefined}
      style={[styles.blockingArea, props]}
    />
  );
}

type TutorialCardProps = {
  buttonLabel: string;
  canGoBack: boolean;
  currentPosition: number;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  rootHeight: number;
  step: GuidedFormTutorialStep;
  targetRect: TargetRect;
  totalSteps: number;
};

function TutorialCard({
  buttonLabel,
  canGoBack,
  currentPosition,
  onBack,
  onClose,
  onNext,
  rootHeight,
  step,
  targetRect,
  totalSteps
}: TutorialCardProps) {
  const estimatedCardHeight = step.isExpanded ? 126 : 224;
  const placeBelow =
    targetRect.y + targetRect.height + estimatedCardHeight + 22 <= rootHeight;
  const cardTop = placeBelow
    ? targetRect.y + targetRect.height + 22
    : Math.max(10, targetRect.y - estimatedCardHeight - 18);

  return (
    <View style={[styles.card, { top: cardTop }]}>
      <View
        pointerEvents="none"
        style={[
          styles.arrow,
          placeBelow ? styles.arrowUp : styles.arrowDown,
          {
            left: Math.max(22, Math.min(targetRect.x + targetRect.width / 2 - 22, 310))
          }
        ]}
      />

      <View style={styles.cardHeader}>
        <View style={styles.guideBadge}>
          <Ionicons color="#1b4332" name="navigate" size={15} />
          <AppText style={styles.guideBadgeText} variant="caption">
            Tutorial {currentPosition}/{totalSteps}
          </AppText>
        </View>
        <Pressable
          accessibilityLabel="Salir del tutorial"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons color="#52615a" name="close" size={22} />
        </Pressable>
      </View>

      <AppText style={styles.cardTitle} variant="heading">
        {step.title}
      </AppText>
      <AppText style={styles.cardInstruction} variant="body">
        {step.isLoading
          ? "Espera mientras cargamos las opciones disponibles."
          : step.instruction}
      </AppText>

      {!step.isExpanded ? (
        <View style={styles.cardActions}>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoBack}
            onPress={onBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              !canGoBack && styles.disabledButton,
              pressed && canGoBack && styles.pressed
            ]}
          >
            <Ionicons color="#2d6a4f" name="arrow-back" size={18} />
            <AppText style={styles.secondaryButtonText} variant="label">
              Anterior
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!step.isEnabled || (!step.isComplete && !step.isOptional)}
            onPress={onNext}
            style={({ pressed }) => [
              styles.primaryButton,
              (!step.isEnabled || (!step.isComplete && !step.isOptional)) &&
                styles.disabledButton,
              pressed && step.isEnabled && styles.pressed
            ]}
          >
            <AppText style={styles.primaryButtonText} variant="label">
              {buttonLabel}
            </AppText>
            <Ionicons color="#ffffff" name="arrow-forward" size={18} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    elevation: 30,
    zIndex: 100
  },
  blockingArea: {
    backgroundColor: "rgba(20, 29, 25, 0.76)",
    position: "absolute"
  },
  targetOutline: {
    borderColor: "#f4c95d",
    borderRadius: 16,
    borderWidth: 3,
    position: "absolute",
    shadowColor: "#f4c95d",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 9
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e2dc",
    borderRadius: 18,
    borderWidth: 1,
    elevation: 10,
    left: 16,
    padding: 18,
    position: "absolute",
    right: 16,
    shadowColor: "#000000",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 14
  },
  arrow: {
    borderLeftColor: "transparent",
    borderLeftWidth: 12,
    borderRightColor: "transparent",
    borderRightWidth: 12,
    height: 0,
    position: "absolute",
    width: 0
  },
  arrowUp: {
    borderBottomColor: "#ffffff",
    borderBottomWidth: 13,
    top: -13
  },
  arrowDown: {
    borderTopColor: "#ffffff",
    borderTopWidth: 13,
    bottom: -13
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  guideBadge: {
    alignItems: "center",
    backgroundColor: "#f4c95d",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  guideBadgeText: {
    color: "#1b4332",
    fontWeight: "800"
  },
  closeButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38
  },
  cardTitle: {
    color: "#18392d",
    marginTop: 10
  },
  cardInstruction: {
    color: "#52615a",
    lineHeight: 22,
    marginTop: 5
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 16
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2d6a4f",
    borderRadius: 12,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#b7c9bf",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 13
  },
  secondaryButtonText: {
    color: "#2d6a4f",
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.78
  },
  locatingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(20, 29, 25, 0.76)",
    justifyContent: "center",
    padding: 24
  },
  locatingCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    gap: 10,
    maxWidth: 340,
    padding: 22,
    width: "100%"
  },
  locatingText: {
    color: "#18392d"
  },
  exitOnlyButton: {
    borderColor: "#b7c9bf",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  exitOnlyText: {
    color: "#2d6a4f"
  }
});
