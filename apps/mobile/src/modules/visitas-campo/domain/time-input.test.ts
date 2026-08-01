import { describe, expect, it } from "vitest";

import { formatEditable12HourInput, isComplete12HourInput } from "./time-input";

describe("time input editing", () => {
  it("preserva la posición de los dígitos mientras el usuario borra", () => {
    expect(formatEditable12HourInput("03:45", "03:4")).toBe("03:4");
    expect(formatEditable12HourInput("03:4", "03:")).toBe("03:");
    expect(formatEditable12HourInput("03:", "03")).toBe("03");
    expect(formatEditable12HourInput("0", "")).toBe("");
  });

  it("formatea una nueva hora al completar cuatro dígitos", () => {
    expect(formatEditable12HourInput("23", "239")).toBe("02:39");
    expect(isComplete12HourInput("02:39")).toBe(true);
    expect(isComplete12HourInput("02:3")).toBe(false);
  });
});
