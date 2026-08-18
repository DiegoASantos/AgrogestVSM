/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const { withDangerousMod } = require("expo/config-plugins");

const MODEL_DIRECTORIES = ["sherpa-onnx-whisper-tiny", "vits-piper-es_ES-carlfm-x_low"];

module.exports = function withOfflineVoiceModels(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const sourceRoot = path.join(modConfig.modRequest.projectRoot, "assets", "models");
      const targetRoot = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets",
        "models"
      );

      fs.mkdirSync(targetRoot, { recursive: true });
      for (const modelDirectory of MODEL_DIRECTORIES) {
        const source = path.join(sourceRoot, modelDirectory);
        const target = path.join(targetRoot, modelDirectory);
        if (!fs.existsSync(source)) {
          throw new Error(`Falta el modelo offline requerido: ${source}`);
        }
        fs.rmSync(target, { force: true, recursive: true });
        fs.cpSync(source, target, { recursive: true });
      }

      return modConfig;
    }
  ]);
};
