import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "../../../../shared/components";
import { theme } from "../../../../shared/constants/theme";
import {
  decideVoiceConfirmation,
  formatVoiceDate,
  formatVoiceTime,
  matchVoiceOption,
  parseAreaHectares,
  parsePercentage,
  parsePlantsCount,
  parseSpanishDate,
  parseSpanishTime,
  parseVoiceCommand,
  type VoiceFormField,
  type VoiceSelectOption
} from "../../domain/offline-voice-input";
import { offlineVoiceService } from "../../services/offline-voice.service";
import type { NewVisitaCampoFormValues } from "../../types";

type AssistantPhase =
  | "waiting"
  | "speaking"
  | "preparing"
  | "listening"
  | "processing"
  | "complete"
  | "error";

type ListeningPurpose = "answer" | "confirmation";

type PendingValue = {
  value: string;
  spoken: string;
};

type VoiceVisitAssistantModalProps = {
  visible: boolean;
  today: string;
  values: NewVisitaCampoFormValues;
  cropOptions: VoiceSelectOption[];
  varietyOptions: VoiceSelectOption[];
  phenologicalStageOptions: VoiceSelectOption[];
  isLoadingVarieties: boolean;
  isLoadingPhenologicalStages: boolean;
  onApply: (field: VoiceFormField, value: string) => void;
  onClose: () => void;
};

const FIELDS: VoiceFormField[] = [
  "crop",
  "variety",
  "plantsCount",
  "areaHectares",
  "sowingDate",
  "startVisitTime",
  "endVisitTime",
  "phenologicalStage",
  "subEtapaPercentage",
  "generalObservation"
];

const OPTIONAL_FIELDS = new Set<VoiceFormField>([
  "plantsCount",
  "areaHectares",
  "sowingDate",
  "endVisitTime",
  "subEtapaPercentage",
  "generalObservation"
]);

export function VoiceVisitAssistantModal({
  visible,
  today,
  values,
  cropOptions,
  varietyOptions,
  phenologicalStageOptions,
  isLoadingVarieties,
  isLoadingPhenologicalStages,
  onApply,
  onClose
}: VoiceVisitAssistantModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<AssistantPhase>("waiting");
  const [purpose, setPurpose] = useState<ListeningPurpose>("answer");
  const [prompt, setPrompt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listeningTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef(0);
  const processing = useRef(false);
  const introCompleted = useRef(false);
  const listeningPurpose = useRef<ListeningPurpose>("answer");
  const pendingValueRef = useRef<PendingValue | null>(null);
  const propsRef = useRef({
    today,
    values,
    cropOptions,
    varietyOptions,
    phenologicalStageOptions,
    isLoadingVarieties,
    isLoadingPhenologicalStages,
    onApply,
    onClose
  });
  propsRef.current = {
    today,
    values,
    cropOptions,
    varietyOptions,
    phenologicalStageOptions,
    isLoadingVarieties,
    isLoadingPhenologicalStages,
    onApply,
    onClose
  };

  const progress = useMemo(
    () =>
      Math.round(((Math.min(stepIndex, FIELDS.length - 1) + 1) / FIELDS.length) * 100),
    [stepIndex]
  );
  useEffect(() => {
    if (!visible) return;
    const activeSession = ++session.current;
    processing.current = false;
    introCompleted.current = false;
    listeningPurpose.current = "answer";
    pendingValueRef.current = null;
    setStepIndex(0);
    setPhase("waiting");
    setPurpose("answer");
    setPrompt("Preparando la evaluacion por voz sin internet.");
    setTranscript("");
    setError(null);

    void (async () => {
      try {
        await offlineVoiceService.requestPermission();
        if (session.current !== activeSession) return;
        setPrompt(
          "La voz se procesa solo en este telefono. Puedes decir repetir o cancelar en cualquier momento."
        );
        setPhase("speaking");
        await offlineVoiceService.speak(
          "Iniciaremos los datos basicos de la visita. La voz se procesa solo en este telefono. Puedes decir repetir o cancelar en cualquier momento."
        );
        if (session.current !== activeSession) return;
        introCompleted.current = true;
        setPhase("waiting");
      } catch (caughtError) {
        showError(caughtError);
      }
    })();

    return () => {
      session.current += 1;
      introCompleted.current = false;
      pendingValueRef.current = null;
      clearListeningTimeout();
      void offlineVoiceService.cancel();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || phase !== "waiting" || !introCompleted.current) return;
    const step = getStep(stepIndex, propsRef.current);
    if (!step.ready) {
      setPrompt(step.prompt);
      return;
    }
    void askCurrentStep(step.prompt);
  }, [
    visible,
    phase,
    stepIndex,
    cropOptions,
    varietyOptions,
    phenologicalStageOptions,
    isLoadingVarieties,
    isLoadingPhenologicalStages
  ]);

  useEffect(() => {
    if (!visible) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") closeAssistant();
    });
    return () => subscription.remove();
  }, [visible]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={closeAssistant}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText style={styles.eyebrow} variant="eyebrow">
              VOZ 100 % OFFLINE
            </AppText>
            <AppText style={styles.title} variant="title">
              Evaluacion asistida
            </AppText>
          </View>
          <Pressable
            accessibilityLabel="Cerrar asistente de voz"
            accessibilityRole="button"
            onPress={closeAssistant}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons color="#ffffff" name="close" size={30} />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, statusIconStyle(phase)]}>
              <Ionicons color="#ffffff" name={statusIconName(phase)} size={42} />
            </View>
            <AppText style={styles.stepLabel} variant="label">
              {phase === "complete"
                ? "Paso 1 completado"
                : `Pregunta ${stepIndex + 1} de ${FIELDS.length}`}
            </AppText>
            <AppText style={styles.prompt} variant="heading">
              {prompt}
            </AppText>
            <AppText style={styles.statusText} variant="body">
              {phaseDescription(phase, purpose)}
            </AppText>
          </View>

          {transcript ? (
            <View style={styles.transcriptCard}>
              <AppText style={styles.transcriptLabel} variant="caption">
                SE ESCUCHO
              </AppText>
              <AppText style={styles.transcriptText} variant="heading">
                “{transcript}”
              </AppText>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons color={theme.colors.error} name="alert-circle" size={24} />
              <AppText style={styles.errorText} variant="body">
                {error}
              </AppText>
            </View>
          ) : null}

          {phase === "listening" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void finishListening()}
              style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}
            >
              <Ionicons color="#ffffff" name="stop" size={24} />
              <AppText style={styles.stopButtonText} variant="label">
                Terminar respuesta
              </AppText>
            </Pressable>
          ) : null}

          {phase === "listening" && purpose === "confirmation" ? (
            <View style={styles.confirmButtons}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void confirmWithButton(true)}
                style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
              >
                <Ionicons color="#ffffff" name="checkmark-circle" size={25} />
                <AppText style={styles.confirmButtonText} variant="label">
                  Si, es correcto
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void confirmWithButton(false)}
                style={({ pressed }) => [
                  styles.confirmButton,
                  styles.rejectButton,
                  pressed && styles.pressed
                ]}
              >
                <Ionicons color={theme.colors.text} name="refresh" size={24} />
                <AppText style={styles.rejectButtonText} variant="label">
                  No, repetir
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {phase === "complete" ? (
            <Pressable
              accessibilityRole="button"
              onPress={closeAssistant}
              style={({ pressed }) => [styles.reviewButton, pressed && styles.pressed]}
            >
              <Ionicons color="#ffffff" name="document-text" size={23} />
              <AppText style={styles.reviewButtonText} variant="label">
                Revisar formulario
              </AppText>
            </Pressable>
          ) : null}

          {phase === "error" ? (
            <Pressable
              accessibilityRole="button"
              onPress={closeAssistant}
              style={({ pressed }) => [styles.manualButton, pressed && styles.pressed]}
            >
              <AppText style={styles.manualButtonText} variant="label">
                Continuar manualmente
              </AppText>
            </Pressable>
          ) : null}

          <AppText style={styles.privacy} variant="caption">
            El audio se procesa en memoria y no se guarda ni se envia por internet.
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  async function askCurrentStep(nextPrompt: string) {
    const activeSession = session.current;
    setTranscript("");
    pendingValueRef.current = null;
    setError(null);
    setPrompt(nextPrompt);
    setPhase("speaking");
    try {
      await offlineVoiceService.speak(nextPrompt);
      if (session.current !== activeSession) return;
      await beginListening("answer", 10_000);
    } catch (caughtError) {
      showError(caughtError);
    }
  }

  async function beginListening(nextPurpose: ListeningPurpose, timeoutMs: number) {
    const activeSession = session.current;
    listeningPurpose.current = nextPurpose;
    setPurpose(nextPurpose);
    setPhase("preparing");
    try {
      await offlineVoiceService.startListening();
      if (session.current !== activeSession) return;
      setPhase("listening");
      clearListeningTimeout();
      listeningTimeout.current = setTimeout(() => {
        void finishListening();
      }, timeoutMs);
    } catch (caughtError) {
      showError(caughtError);
    }
  }

  async function finishListening() {
    if (processing.current) return;
    processing.current = true;
    clearListeningTimeout();
    setPhase("processing");
    try {
      const nextTranscript = await offlineVoiceService.stopListening();
      setTranscript(nextTranscript);
      if (listeningPurpose.current === "confirmation") {
        await handleConfirmation(nextTranscript);
      } else {
        await handleAnswer(nextTranscript);
      }
    } catch (caughtError) {
      const message = toVoiceErrorMessage(caughtError);
      setError(message);
      setPrompt(`${message} Vamos a intentarlo nuevamente.`);
      setPhase("speaking");
      try {
        await offlineVoiceService.speak(`${message} Vamos a intentarlo nuevamente.`);
        setPhase("waiting");
      } catch (speakError) {
        showError(speakError);
      }
    } finally {
      processing.current = false;
    }
  }

  async function handleAnswer(nextTranscript: string) {
    const command = parseVoiceCommand(nextTranscript);
    const field = FIELDS[stepIndex];
    if (!field) return;

    if (command === "cancel") {
      closeAssistant();
      return;
    }
    if (command === "repeat" || command === "reject") {
      setPhase("waiting");
      return;
    }
    if (command === "keep") {
      const existingValue = propsRef.current.values[field];
      if (!existingValue) {
        await rejectAnswer("Este campo aun no tiene un valor para conservar.");
        return;
      }
      await requestConfirmation({
        value: existingValue,
        spoken: getSpokenValue(field, existingValue, propsRef.current)
      });
      return;
    }
    if (command === "skip") {
      if (!OPTIONAL_FIELDS.has(field)) {
        await rejectAnswer("Este dato es obligatorio y no se puede omitir.");
        return;
      }
      await requestConfirmation({ value: "", spoken: "omitir este dato" });
      return;
    }

    const parsed = parseFieldAnswer(field, nextTranscript, propsRef.current);
    if (parsed.kind === "invalid") {
      await rejectAnswer(parsed.message);
      return;
    }
    await requestConfirmation(parsed.pending);
  }

  async function requestConfirmation(nextPending: PendingValue) {
    const activeSession = session.current;
    pendingValueRef.current = nextPending;
    const confirmationPrompt = `Entendi ${nextPending.spoken}. Es correcto?`;
    setPrompt(confirmationPrompt);
    setPhase("speaking");
    try {
      await offlineVoiceService.speak(confirmationPrompt);
      if (session.current !== activeSession) return;
      await beginListening("confirmation", 6_000);
    } catch (caughtError) {
      showError(caughtError);
    }
  }

  async function handleConfirmation(nextTranscript: string) {
    const decision = decideVoiceConfirmation(nextTranscript);
    if (decision === "cancel") {
      closeAssistant();
      return;
    }
    if (decision === "commit") {
      commitPendingValue();
      return;
    }
    if (decision === "retry") {
      pendingValueRef.current = null;
      setPhase("waiting");
      return;
    }
    await rejectConfirmation();
  }

  async function confirmWithButton(accept: boolean) {
    if (processing.current) return;
    processing.current = true;
    clearListeningTimeout();
    await offlineVoiceService.cancel();
    processing.current = false;
    if (accept) commitPendingValue();
    else {
      pendingValueRef.current = null;
      setPhase("waiting");
    }
  }

  function commitPendingValue() {
    const field = FIELDS[stepIndex];
    const confirmedValue = pendingValueRef.current;
    if (!field || !confirmedValue) {
      setPhase("waiting");
      return;
    }
    propsRef.current.onApply(field, confirmedValue.value);
    pendingValueRef.current = null;
    setTranscript("");
    if (stepIndex >= FIELDS.length - 1) {
      void completeAssistant();
      return;
    }
    setStepIndex((current) => current + 1);
    setPhase("waiting");
  }

  async function completeAssistant() {
    setPhase("speaking");
    setPrompt("Terminamos el registro por voz. Revisa los datos antes de continuar.");
    try {
      await offlineVoiceService.speak(
        "Terminamos el registro por voz. Revisa los datos antes de continuar."
      );
      setPhase("complete");
    } catch (caughtError) {
      showError(caughtError);
    }
  }

  async function rejectAnswer(message: string) {
    setError(message);
    setPrompt(`${message} Repite tu respuesta.`);
    setPhase("speaking");
    try {
      await offlineVoiceService.speak(`${message} Repite tu respuesta.`);
      setPhase("waiting");
    } catch (caughtError) {
      showError(caughtError);
    }
  }

  async function rejectConfirmation() {
    setError("Responde si o no.");
    setPrompt("No pude confirmar. Responde si o no.");
    setPhase("speaking");
    try {
      await offlineVoiceService.speak("No pude confirmar. Responde si o no.");
      await beginListening("confirmation", 6_000);
    } catch (caughtError) {
      showError(caughtError);
    }
  }

  function showError(caughtError: unknown) {
    clearListeningTimeout();
    setError(toVoiceErrorMessage(caughtError));
    setPrompt("No se pudo continuar con la evaluacion por voz.");
    setPhase("error");
  }

  function closeAssistant() {
    session.current += 1;
    introCompleted.current = false;
    pendingValueRef.current = null;
    clearListeningTimeout();
    void offlineVoiceService.cancel();
    propsRef.current.onClose();
  }

  function clearListeningTimeout() {
    if (listeningTimeout.current) clearTimeout(listeningTimeout.current);
    listeningTimeout.current = null;
  }
}

type StepContext = Pick<
  VoiceVisitAssistantModalProps,
  | "today"
  | "values"
  | "cropOptions"
  | "varietyOptions"
  | "phenologicalStageOptions"
  | "isLoadingVarieties"
  | "isLoadingPhenologicalStages"
  | "onApply"
  | "onClose"
>;

function getStep(index: number, context: StepContext) {
  const field = FIELDS[index];
  const current = field ? context.values[field] : "";
  const currentPrompt = current
    ? ` El valor actual es ${getSpokenValue(field, current, context)}. Puedes decir conservar o indicar otro valor.`
    : "";

  switch (field) {
    case "crop":
      return selectorStep("Indica el cultivo", context.cropOptions, false, currentPrompt);
    case "variety":
      return selectorStep(
        "Indica la variedad",
        context.varietyOptions,
        context.isLoadingVarieties,
        currentPrompt
      );
    case "plantsCount":
      return {
        ready: true,
        prompt: `Indica el numero de plantas. Por ejemplo, mil doscientas. Tambien puedes decir omitir.${currentPrompt}`
      };
    case "areaHectares":
      return {
        ready: true,
        prompt: `Indica el area en hectareas. Por ejemplo, dos coma cinco. Tambien puedes decir omitir.${currentPrompt}`
      };
    case "sowingDate":
      return {
        ready: true,
        prompt: `Indica la fecha de siembra. Por ejemplo, quince de agosto de dos mil veintiseis. Tambien puedes decir omitir.${currentPrompt}`
      };
    case "startVisitTime":
      return {
        ready: true,
        prompt: `Indica la hora de inicio. Por ejemplo, ocho y media de la manana.${currentPrompt}`
      };
    case "endVisitTime":
      return {
        ready: true,
        prompt: `Indica la hora de fin si ya termino la visita. Tambien puedes decir omitir.${currentPrompt}`
      };
    case "phenologicalStage":
      return selectorStep(
        "Indica la etapa fenologica",
        context.phenologicalStageOptions,
        context.isLoadingPhenologicalStages,
        currentPrompt
      );
    case "subEtapaPercentage":
      return {
        ready: true,
        prompt: `Indica el porcentaje de avance, entre cero y cien. Se ajustara de cinco en cinco. Tambien puedes decir omitir.${currentPrompt}`
      };
    case "generalObservation":
      return {
        ready: true,
        prompt: `Indica una observacion general. Habla en una frase corta. Tambien puedes decir omitir.${currentPrompt}`
      };
    default:
      return { ready: false, prompt: "Preparando la siguiente pregunta." };
  }
}

function selectorStep(
  label: string,
  options: VoiceSelectOption[],
  loading: boolean,
  currentPrompt: string
) {
  if (loading || options.length === 0) {
    return { ready: false, prompt: `Preparando opciones para ${label.toLowerCase()}.` };
  }
  const optionNames = options.map((option) => option.label).join(", ");
  return {
    ready: true,
    prompt: `${label}. Las opciones son: ${optionNames}.${currentPrompt}`
  };
}

function parseFieldAnswer(
  field: VoiceFormField,
  transcript: string,
  context: StepContext
) {
  if (field === "crop" || field === "variety" || field === "phenologicalStage") {
    const options =
      field === "crop"
        ? context.cropOptions
        : field === "variety"
          ? context.varietyOptions
          : context.phenologicalStageOptions;
    const match = matchVoiceOption(transcript, options);
    if (match.kind === "match") {
      return {
        kind: "valid" as const,
        pending: { value: match.option.value, spoken: match.option.label }
      };
    }
    if (match.kind === "ambiguous") {
      return {
        kind: "invalid" as const,
        message: `La respuesta coincide con ${match.options.map((option) => option.label).join(" y ")}. Indica una opcion completa.`
      };
    }
    return {
      kind: "invalid" as const,
      message: "La respuesta no coincide con una opcion disponible."
    };
  }

  let value: string | null = transcript.trim();
  let spoken = transcript.trim();
  if (field === "plantsCount") value = parsePlantsCount(transcript);
  if (field === "areaHectares") value = parseAreaHectares(transcript);
  if (field === "sowingDate") value = parseSpanishDate(transcript, context.today);
  if (field === "startVisitTime" || field === "endVisitTime") {
    value = parseSpanishTime(transcript);
  }
  if (field === "subEtapaPercentage") value = parsePercentage(transcript);

  if (value === null || !value.trim()) {
    return {
      kind: "invalid" as const,
      message: "No pude convertir la respuesta en un valor valido."
    };
  }
  if (field === "sowingDate") spoken = formatVoiceDate(value);
  if (field === "startVisitTime" || field === "endVisitTime") {
    spoken = formatVoiceTime(value);
  }
  if (field === "subEtapaPercentage") spoken = `${value} por ciento`;
  if (field === "plantsCount") spoken = `${value} plantas`;
  if (field === "areaHectares") spoken = `${value} hectareas`;

  return { kind: "valid" as const, pending: { value, spoken } };
}

function getSpokenValue(field: VoiceFormField, value: string, context: StepContext) {
  if (field === "crop" || field === "variety" || field === "phenologicalStage") {
    const options =
      field === "crop"
        ? context.cropOptions
        : field === "variety"
          ? context.varietyOptions
          : context.phenologicalStageOptions;
    return options.find((option) => option.value === value)?.label ?? value;
  }
  if (field === "sowingDate") return formatVoiceDate(value);
  if (field === "startVisitTime" || field === "endVisitTime")
    return formatVoiceTime(value);
  if (field === "plantsCount") return `${value} plantas`;
  if (field === "areaHectares") return `${value} hectareas`;
  if (field === "subEtapaPercentage") return `${value} por ciento`;
  return value;
}

function toVoiceErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "La evaluacion por voz no esta disponible en este dispositivo.";
}

function phaseDescription(phase: AssistantPhase, purpose: ListeningPurpose) {
  switch (phase) {
    case "speaking":
      return "Escucha la pregunta.";
    case "preparing":
      return "Preparando el microfono y el modelo local...";
    case "listening":
      return purpose === "confirmation"
        ? "Di si o no. Tambien puedes usar los botones."
        : "Habla ahora. Pulsa Terminar respuesta cuando acabes.";
    case "processing":
      return "Interpretando la respuesta dentro del telefono...";
    case "complete":
      return "La visita aun no se ha guardado. Revisa el formulario.";
    case "error":
      return "El formulario manual sigue disponible y conserva tus datos.";
    default:
      return "Un momento...";
  }
}

function statusIconName(phase: AssistantPhase) {
  if (phase === "listening") return "mic" as const;
  if (phase === "processing" || phase === "preparing") return "hourglass" as const;
  if (phase === "complete") return "checkmark" as const;
  if (phase === "error") return "alert" as const;
  return "volume-high" as const;
}

function statusIconStyle(phase: AssistantPhase) {
  if (phase === "listening") return styles.statusIconListening;
  if (phase === "complete") return styles.statusIconComplete;
  if (phase === "error") return styles.statusIconError;
  return null;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f7f3e8" },
  header: {
    alignItems: "center",
    backgroundColor: "#064b31",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#b7e4c7", letterSpacing: 1.2 },
  title: { color: "#ffffff", fontSize: 24 },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  progressTrack: { backgroundColor: "#d8e2dc", height: 7 },
  progressFill: { backgroundColor: "#f4a261", height: 7 },
  content: { gap: 18, padding: 20, paddingBottom: 36 },
  statusCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e2dc",
    borderRadius: 24,
    borderWidth: 1,
    padding: 24
  },
  statusIcon: {
    alignItems: "center",
    backgroundColor: "#2d6a4f",
    borderRadius: 42,
    height: 84,
    justifyContent: "center",
    marginBottom: 18,
    width: 84
  },
  statusIconListening: { backgroundColor: "#e76f51" },
  statusIconComplete: { backgroundColor: "#2d6a4f" },
  statusIconError: { backgroundColor: theme.colors.error },
  stepLabel: { color: "#52796f", marginBottom: 8 },
  prompt: { color: "#1b4332", fontSize: 23, lineHeight: 31, textAlign: "center" },
  statusText: { color: "#52796f", marginTop: 14, textAlign: "center" },
  transcriptCard: {
    backgroundColor: "#e9f5ee",
    borderColor: "#95d5b2",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18
  },
  transcriptLabel: { color: "#52796f", letterSpacing: 1 },
  transcriptText: { color: "#1b4332", fontSize: 20, marginTop: 6 },
  errorCard: {
    alignItems: "center",
    backgroundColor: "#fff4f1",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    padding: 16
  },
  errorText: { color: theme.colors.error, flex: 1 },
  stopButton: {
    alignItems: "center",
    backgroundColor: "#e76f51",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: 20
  },
  stopButtonText: { color: "#ffffff", fontSize: 17 },
  confirmButtons: { gap: 12 },
  confirmButton: {
    alignItems: "center",
    backgroundColor: "#2d6a4f",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: 20
  },
  confirmButtonText: { color: "#ffffff", fontSize: 17 },
  rejectButton: { backgroundColor: "#ffffff", borderColor: "#b7c9bd", borderWidth: 1 },
  rejectButtonText: { color: theme.colors.text, fontSize: 17 },
  reviewButton: {
    alignItems: "center",
    backgroundColor: "#064b31",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 62,
    paddingHorizontal: 20
  },
  reviewButtonText: { color: "#ffffff", fontSize: 17 },
  manualButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#52796f",
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 20
  },
  manualButtonText: { color: "#1b4332", fontSize: 17 },
  privacy: { color: "#52796f", lineHeight: 20, textAlign: "center" },
  pressed: { opacity: 0.78 }
});
