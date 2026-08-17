import { describe, expect, it } from "vitest";

import {
  getLosslessPngShareOptions,
  LOSSLESS_PNG_MIME_TYPE,
  LOSSLESS_PNG_UTI
} from "./report-share-options";

describe("report share options", () => {
  it("shares PNG reports as files so receiving apps do not recompress them", () => {
    expect(getLosslessPngShareOptions("receta")).toEqual({
      dialogTitle: "Compartir receta como imagen PNG de alta calidad",
      mimeType: "application/octet-stream",
      UTI: "public.data"
    });
    expect(LOSSLESS_PNG_MIME_TYPE).toBe("application/octet-stream");
    expect(LOSSLESS_PNG_UTI).toBe("public.data");
  });
});
