let pixelRatio = 2;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PixelRatio } = require("react-native");
  pixelRatio = PixelRatio.get();
} catch {
  /* test environment — fallback to 2x */
}

export const REPORT_IMAGE_WIDTH = 720 * pixelRatio;
