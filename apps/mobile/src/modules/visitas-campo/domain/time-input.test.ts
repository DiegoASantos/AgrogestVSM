import { describe, expect, it } from "vitest";

import {
  formatEditable12HourInput,
  formatTimeFor12HourInput,
  isComplete12HourInput,
  normalize12HourTimeForApi,
  resolveInitialEndVisitTime,
  validateVisitEndTime
} from "./time-input";

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

  it("convierte entre formato de 12 horas y hora de API", () => {
    expect(normalize12HourTimeForApi("03:45", "PM")).toBe("15:45");
    expect(formatTimeFor12HourInput("00:05:00")).toEqual({
      time: "12:05",
      period: "AM"
    });
  });

  it("usa la hora existente o la hora actual para finalizar", () => {
    const now = new Date(2026, 7, 15, 16, 7);
    expect(resolveInitialEndVisitTime("10:30:00", now)).toBe("10:30");
    expect(resolveInitialEndVisitTime(null, now)).toBe("16:07");
  });

  it("rechaza una hora final anterior a la inicial", () => {
    expect(validateVisitEndTime("08:00", "07:59")).toBe(
      "La hora de fin no puede ser anterior a la hora de inicio."
    );
    expect(validateVisitEndTime("08:00", "08:00")).toBeNull();
  });
});
