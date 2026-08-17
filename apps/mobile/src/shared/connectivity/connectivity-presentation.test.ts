import { describe, expect, it } from "vitest";

import { getConnectivityPresentation } from "./connectivity-presentation";

describe("connectivity presentation", () => {
  it("prioritizes the absence of physical Internet", () => {
    expect(
      getConnectivityPresentation({
        effectiveMode: "offline_manual",
        isPhysicallyOnline: false,
        quality: "none"
      }).title
    ).toBe("Sin internet");
  });

  it("explains when offline mode was selected by the user", () => {
    const presentation = getConnectivityPresentation({
      effectiveMode: "offline_manual",
      isPhysicallyOnline: true,
      quality: "stable"
    });

    expect(presentation.title).toBe("Offline manual");
    expect(presentation.banner).toContain("seleccionado por ti");
  });

  it("distinguishes automatic degradation from manual offline", () => {
    const presentation = getConnectivityPresentation({
      effectiveMode: "offline_auto",
      isPhysicallyOnline: true,
      quality: "unstable"
    });

    expect(presentation.title).toBe("Conexion inestable");
    expect(presentation.description).toBe("Trabajando con datos locales");
  });
});
