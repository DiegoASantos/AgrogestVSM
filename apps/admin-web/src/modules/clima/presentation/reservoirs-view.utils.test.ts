import { describe, expect, it } from "vitest";

import type { Reservoir } from "../services/clima.service";
import { reservoirFixedDetails, toLocalDateTimeInput } from "./reservoirs-view.utils";

describe("reservoir view utilities", () => {
  it("keeps fixed capacity, elevation and coordinates without readings", () => {
    expect(reservoirFixedDetails(poechos)).toEqual([
      { label: "Capacidad máxima", value: "885 MMC" },
      { label: "Cota máxima", value: "108 msnm" },
      { label: "Coordenadas", value: "-4.683333, -80.500000" }
    ]);
  });

  it("formats a date for datetime-local inputs", () => {
    expect(toLocalDateTimeInput(new Date("2026-08-11T13:45:00Z"))).toMatch(
      /^2026-08-11T\d{2}:45$/u
    );
  });
});

const poechos: Reservoir = {
  publicId: "reservoir-id",
  name: "Poechos",
  department: "Piura",
  province: "Sullana",
  district: "Lancones",
  latitude: -4.683333,
  longitude: -80.5,
  capacityMaxMmc: 885,
  elevationMaxMasl: 108,
  latestCota: null,
  latestVolumeMmc: null,
  latestInflowM3s: null,
  latestOutflowM3s: null,
  latestEvaporationMm: null,
  latestDataAt: null
};
