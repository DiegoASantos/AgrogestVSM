# Modelos de voz offline

Estos modelos se incluyen en el binario Android y se ejecutan localmente mediante
`react-native-sherpa-onnx`. El audio capturado no se escribe en archivos.

- STT: `sherpa-onnx-whisper-tiny`, Whisper Tiny multilingue INT8, publicado por
  sherpa-onnx. SHA-256 del archivo de origen:
  `c46116994e539aa165266d96b325252728429c12535eb9d8b6a2b10f129e66b1`.
- TTS: `vits-piper-es_ES-carlfm-x_low`, voz espanola carlfm, publicada para
  Piper/sherpa-onnx. SHA-256 del archivo de origen:
  `15585c5add2ab1915ce69e8c966c7c9fb0b6afb21f9b92f18110fda5a4787f99`.

El archivo `MODEL_CARD` de la voz se conserva junto al modelo. Antes de sustituir
un modelo deben verificarse su licencia, procedencia, hash y compatibilidad con el
runtime nativo.
