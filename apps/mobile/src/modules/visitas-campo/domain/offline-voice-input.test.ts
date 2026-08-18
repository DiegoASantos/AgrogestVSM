import { describe, expect, it } from "vitest";

import {
  decideVoiceConfirmation,
  matchVoiceOption,
  parseAreaHectares,
  parsePercentage,
  parsePlantsCount,
  parseSpanishDate,
  parseSpanishNumber,
  parseSpanishTime,
  parseVoiceCommand
} from "./offline-voice-input";

describe("offline voice input", () => {
  it("interpreta numeros agricolas hablados", () => {
    expect(parseSpanishNumber("mil doscientas plantas")).toBe(1200);
    expect(parsePlantsCount("mil doscientos")).toBe("1200");
    expect(parseAreaHectares("dos coma cinco hectareas")).toBe("2.5");
  });

  it("normaliza porcentajes al paso de cinco", () => {
    expect(parsePercentage("treinta y tres por ciento")).toBe("35");
    expect(parsePercentage("ciento cinco")).toBeNull();
  });

  it("interpreta fechas en espanol", () => {
    expect(parseSpanishDate("quince de agosto de dos mil veintiseis", "2026-08-17")).toBe(
      "2026-08-15"
    );
    expect(parseSpanishDate("ayer", "2026-08-17")).toBe("2026-08-16");
    expect(parseSpanishDate("31/02/2026", "2026-08-17")).toBeNull();
  });

  it("interpreta horas en formato de 24 horas", () => {
    expect(parseSpanishTime("ocho y media de la manana")).toBe("08:30");
    expect(parseSpanishTime("tres y cuarto de la tarde")).toBe("15:15");
    expect(parseSpanishTime("25:00")).toBeNull();
  });

  it("resuelve catalogos sin depender de tildes", () => {
    expect(
      matchVoiceOption("mango", [
        { value: "1", label: "Mango", helper: "MAN" },
        { value: "2", label: "Palta", helper: "PAL" }
      ])
    ).toEqual({ kind: "match", option: { value: "1", label: "Mango", helper: "MAN" } });
  });

  it("detecta coincidencias ambiguas", () => {
    expect(
      matchVoiceOption("kent", [
        { value: "1", label: "Kent temprano" },
        { value: "2", label: "Kent tardio" }
      ]).kind
    ).toBe("ambiguous");
  });

  it("reconoce comandos del dialogo", () => {
    expect(parseVoiceCommand("si correcto")).toBe("accept");
    expect(parseVoiceCommand("no, repetir")).toBe("repeat");
    expect(parseVoiceCommand("corregir")).toBe("repeat");
    expect(parseVoiceCommand("conservar este dato")).toBe("keep");
    expect(parseVoiceCommand("cancelar asistente")).toBe("cancel");
    expect(parseVoiceCommand("no hay plagas visibles")).toBeNull();
  });

  it("resuelve las transiciones de confirmacion", () => {
    expect(decideVoiceConfirmation("si")).toBe("commit");
    expect(decideVoiceConfirmation("no")).toBe("retry");
    expect(decideVoiceConfirmation("cancelar")).toBe("cancel");
    expect(decideVoiceConfirmation("quizas")).toBe("ask-again");
  });
});
