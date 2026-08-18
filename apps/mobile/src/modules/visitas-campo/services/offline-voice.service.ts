import { PermissionsAndroid, Platform } from "react-native";
import { assetModelPath } from "react-native-sherpa-onnx";
import {
  createPcmLiveStream,
  type PcmLiveStreamHandle
} from "react-native-sherpa-onnx/audio";
import { createSTT, type SttEngine } from "react-native-sherpa-onnx/stt";
import {
  createStreamingTTS,
  type StreamingTtsEngine,
  type TtsStreamController
} from "react-native-sherpa-onnx/tts";

const STT_MODEL_PATH = "models/sherpa-onnx-whisper-tiny";
const TTS_MODEL_PATH = "models/vits-piper-es_ES-carlfm-x_low";
const SAMPLE_RATE = 16_000;
const MIN_ANDROID_API = 29;

export class OfflineVoiceError extends Error {
  constructor(
    message: string,
    readonly code:
      | "unsupported-device"
      | "permission-denied"
      | "model-unavailable"
      | "capture-failed"
      | "no-speech"
  ) {
    super(message);
    this.name = "OfflineVoiceError";
  }
}

class OfflineVoiceService {
  private tts: StreamingTtsEngine | null = null;
  private speechController: TtsStreamController | null = null;
  private stt: SttEngine | null = null;
  private pcm: PcmLiveStreamHandle | null = null;
  private pcmChunks: number[][] = [];
  private removePcmDataListener: (() => void) | null = null;
  private removePcmErrorListener: (() => void) | null = null;
  private captureError: string | null = null;
  private operation = 0;

  isDeviceSupported() {
    return Platform.OS === "android" && Number(Platform.Version) >= MIN_ANDROID_API;
  }

  async requestPermission() {
    if (!this.isDeviceSupported()) {
      throw new OfflineVoiceError(
        "La evaluacion por voz requiere Android 10 o superior.",
        "unsupported-device"
      );
    }

    const current = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    if (current) return;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Permiso para evaluacion por voz",
        message:
          "AgroGest necesita usar el microfono mientras respondes. El audio se procesa en el telefono y no se guarda.",
        buttonPositive: "Permitir",
        buttonNegative: "Ahora no"
      }
    );

    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new OfflineVoiceError(
        "No se habilito el microfono. Puedes continuar llenando el formulario manualmente.",
        "permission-denied"
      );
    }
  }

  async speak(text: string) {
    const operation = ++this.operation;
    await this.stopListeningWithoutTranscription();
    await this.destroyStt();

    try {
      this.tts ??= await createStreamingTTS({
        modelPath: assetModelPath(TTS_MODEL_PATH),
        modelType: "vits",
        numThreads: 2,
        provider: "cpu",
        modelOptions: {
          vits: { noiseScale: 0.667, noiseScaleW: 0.8, lengthScale: 1.08 }
        }
      });
      const tts = this.tts;
      const sampleRate = await tts.getSampleRate();
      await tts.startPcmPlayer(sampleRate, 1);
      await new Promise<void>((resolve, reject) => {
        let writes = Promise.resolve();
        void tts
          .generateSpeechStream(
            text,
            { speed: 0.92 },
            {
              onChunk: (chunk) => {
                if (operation !== this.operation) return;
                writes = writes.then(() => tts.writePcmChunk(chunk.samples));
              },
              onEnd: () => {
                void writes
                  .then(() => delay(120))
                  .then(() => tts.stopPcmPlayer())
                  .then(resolve, reject);
              },
              onError: (event) => reject(new Error(event.message))
            }
          )
          .then((controller) => {
            this.speechController = controller;
          }, reject);
      });
      this.speechController = null;
    } catch {
      await this.destroyTts();
      throw new OfflineVoiceError(
        "No se pudo iniciar la voz local incluida en la aplicacion.",
        "model-unavailable"
      );
    }
  }

  async startListening() {
    ++this.operation;
    await this.requestPermission();
    await this.destroyTts();
    await this.stopListeningWithoutTranscription();
    await this.destroyStt();
    this.pcmChunks = [];
    this.captureError = null;

    try {
      this.stt = await createSTT({
        modelPath: assetModelPath(STT_MODEL_PATH),
        modelType: "whisper",
        preferInt8: true,
        numThreads: 2,
        provider: "cpu",
        modelOptions: {
          whisper: { language: "es", task: "transcribe" }
        }
      });
      this.pcm = createPcmLiveStream({ sampleRate: SAMPLE_RATE, channelCount: 1 });
      this.removePcmDataListener = this.pcm.onData((samples) => {
        this.pcmChunks.push(Array.from(samples));
      });
      this.removePcmErrorListener = this.pcm.onError((message) => {
        this.captureError = message || "capture-error";
      });
      await this.pcm.start();
    } catch {
      await this.stopListeningWithoutTranscription();
      await this.destroyStt();
      throw new OfflineVoiceError(
        "No se pudo iniciar el reconocimiento local.",
        "model-unavailable"
      );
    }
  }

  async stopListening() {
    if (!this.pcm || !this.stt) {
      throw new OfflineVoiceError("El microfono no esta escuchando.", "capture-failed");
    }

    const pcm = this.pcm;
    this.pcm = null;
    try {
      await pcm.stop();
    } finally {
      this.removeCaptureListeners();
    }

    if (this.captureError) {
      this.pcmChunks = [];
      await this.destroyStt();
      throw new OfflineVoiceError(
        "Se interrumpio la captura del microfono.",
        "capture-failed"
      );
    }

    const samples = this.pcmChunks.flat();
    this.pcmChunks = [];
    if (samples.length < SAMPLE_RATE / 4) {
      await this.destroyStt();
      throw new OfflineVoiceError("No se escucho una respuesta.", "no-speech");
    }

    try {
      const result = await this.stt.transcribeSamples(samples, SAMPLE_RATE);
      const transcript = result.text.trim();
      samples.fill(0);
      await this.destroyStt();
      if (!transcript) {
        throw new OfflineVoiceError("No se entendio la respuesta.", "no-speech");
      }
      return transcript;
    } catch (error) {
      samples.fill(0);
      await this.destroyStt();
      if (error instanceof OfflineVoiceError) throw error;
      throw new OfflineVoiceError(
        "No se pudo interpretar la respuesta localmente.",
        "capture-failed"
      );
    }
  }

  async cancel() {
    ++this.operation;
    await this.stopListeningWithoutTranscription();
    await Promise.all([this.destroyStt(), this.destroyTts()]);
    this.pcmChunks = [];
    this.captureError = null;
  }

  private async stopListeningWithoutTranscription() {
    const pcm = this.pcm;
    this.pcm = null;
    if (pcm) {
      try {
        await pcm.stop();
      } catch {
        // Cleanup must continue even when native capture has already stopped.
      }
    }
    this.removeCaptureListeners();
    for (const chunk of this.pcmChunks) chunk.fill(0);
    this.pcmChunks = [];
  }

  private removeCaptureListeners() {
    this.removePcmDataListener?.();
    this.removePcmErrorListener?.();
    this.removePcmDataListener = null;
    this.removePcmErrorListener = null;
  }

  private async destroyStt() {
    const stt = this.stt;
    this.stt = null;
    if (stt) {
      try {
        await stt.destroy();
      } catch {
        // Native resources are best-effort during interruption cleanup.
      }
    }
  }

  private async destroyTts() {
    const tts = this.tts;
    this.tts = null;
    const controller = this.speechController;
    this.speechController = null;
    if (controller) {
      try {
        await controller.cancel();
      } catch {
        // The stream may already have finished.
      }
      controller.unsubscribe();
    }
    if (tts) {
      try {
        await tts.stopPcmPlayer();
      } catch {
        // The player may not have started yet.
      }
      try {
        await tts.destroy();
      } catch {
        // Native resources are best-effort during interruption cleanup.
      }
    }
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export const offlineVoiceService = new OfflineVoiceService();
