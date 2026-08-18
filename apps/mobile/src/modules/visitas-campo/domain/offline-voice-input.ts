export type VoiceFormField =
  | "crop"
  | "variety"
  | "plantsCount"
  | "areaHectares"
  | "sowingDate"
  | "startVisitTime"
  | "endVisitTime"
  | "phenologicalStage"
  | "subEtapaPercentage"
  | "generalObservation";

export type VoiceCommand = "accept" | "reject" | "repeat" | "skip" | "keep" | "cancel";

export type VoiceConfirmationDecision = "commit" | "retry" | "cancel" | "ask-again";

export type VoiceSelectOption = {
  value: string;
  label: string;
  helper?: string;
};

export type VoiceOptionMatch =
  | { kind: "match"; option: VoiceSelectOption }
  | { kind: "ambiguous"; options: VoiceSelectOption[] }
  | { kind: "none" };

const UNITS: Record<string, number> = {
  cero: 0,
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29
};

const TENS: Record<string, number> = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90
};

const HUNDREDS: Record<string, number> = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900
};

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12
};

export function normalizeVoiceText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.,/:-]+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseVoiceCommand(value: string): VoiceCommand | null {
  const normalized = normalizeVoiceText(value)
    .replace(/[.,/:;-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(?:cancelar|salir)(?: asistente)?$/.test(normalized)) return "cancel";
  if (/^(?:repetir|repita|corregir|no repetir|no repita)$/.test(normalized)) {
    return "repeat";
  }
  if (/^(?:conservar|mantener)(?: este dato| el dato)?$/.test(normalized)) return "keep";
  if (/^(?:omitir|saltar)(?: este dato| el dato)?$/.test(normalized)) return "skip";
  if (/^(?:no|incorrecto|no es correcto)$/.test(normalized)) return "reject";
  if (/^(?:si|si correcto|correcto|confirmar)$/.test(normalized)) return "accept";

  return null;
}

export function decideVoiceConfirmation(value: string): VoiceConfirmationDecision {
  const command = parseVoiceCommand(value);
  if (command === "accept") return "commit";
  if (command === "reject" || command === "repeat") return "retry";
  if (command === "cancel") return "cancel";
  return "ask-again";
}

export function matchVoiceOption(
  transcript: string,
  options: VoiceSelectOption[]
): VoiceOptionMatch {
  const normalized = normalizeVoiceText(transcript);
  if (!normalized) return { kind: "none" };
  const candidates = options.map((option) => ({
    option,
    label: normalizeVoiceText(option.label),
    helper: normalizeVoiceText(option.helper ?? "")
  }));
  const exact = candidates.filter(
    (candidate) =>
      candidate.label === normalized ||
      (!!candidate.helper && candidate.helper === normalized)
  );

  if (exact.length === 1) return { kind: "match", option: exact[0].option };
  if (exact.length > 1) {
    return { kind: "ambiguous", options: exact.map((candidate) => candidate.option) };
  }

  const contained = candidates.filter(
    (candidate) =>
      normalized.includes(candidate.label) ||
      candidate.label.includes(normalized) ||
      (!!candidate.helper && normalized.includes(candidate.helper))
  );

  if (contained.length === 1) {
    return { kind: "match", option: contained[0].option };
  }
  if (contained.length > 1) {
    return {
      kind: "ambiguous",
      options: contained.map((candidate) => candidate.option)
    };
  }

  return { kind: "none" };
}

export function parseSpanishNumber(value: string): number | null {
  const normalized = normalizeVoiceText(value)
    .replace(/\b(plantas?|hectareas?|por ciento|porcentaje)\b/g, " ")
    .trim();
  const direct = Number(normalized.replace(",", ".").replace(/\s+/g, ""));

  if (normalized && Number.isFinite(direct)) return direct;

  const decimalParts = normalized.split(/\b(?:coma|punto)\b/);
  if (decimalParts.length > 2) return null;

  const integer = parseSpanishIntegerWords(decimalParts[0] ?? "");
  if (integer === null) return null;

  if (decimalParts.length === 1) return integer;

  const decimalWords = normalizeVoiceText(decimalParts[1] ?? "")
    .split(/\s+/)
    .filter((word) => word && word !== "y");
  const decimalDigits = decimalWords
    .map((word) => {
      if (/^\d+$/.test(word)) return word;
      const digit = UNITS[word];
      return digit !== undefined && digit < 10 ? String(digit) : null;
    })
    .filter((digit): digit is string => digit !== null)
    .join("");

  if (!decimalDigits || decimalDigits.length !== decimalWords.length) return null;
  return Number(`${integer}.${decimalDigits}`);
}

export function parsePlantsCount(value: string) {
  const parsed = parseSpanishNumber(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0
    ? String(parsed)
    : null;
}

export function parseAreaHectares(value: string) {
  const parsed = parseSpanishNumber(value);
  return parsed !== null && parsed > 0 ? formatNumber(parsed) : null;
}

export function parsePercentage(value: string) {
  const parsed = parseSpanishNumber(value);
  if (parsed === null || parsed < 0 || parsed > 100) return null;
  return String(Math.round(parsed / 5) * 5);
}

export function parseSpanishDate(value: string, todayIso: string) {
  const normalized = normalizeVoiceText(value);
  if (normalized === "hoy") return todayIso;
  if (normalized === "ayer") {
    const date = new Date(`${todayIso}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return formatIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  const isoMatch = normalized.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return validIsoParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const numericMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (numericMatch) {
    return validIsoParts(
      Number(numericMatch[3]),
      Number(numericMatch[2]),
      Number(numericMatch[1])
    );
  }

  const monthEntry = Object.entries(MONTHS).find(([month]) => normalized.includes(month));
  if (!monthEntry) return null;

  const beforeMonth = normalized.split(monthEntry[0])[0]?.replace(/\bde\b/g, " ") ?? "";
  const afterMonth = normalized.split(monthEntry[0])[1]?.replace(/\bde\b/g, " ") ?? "";
  const day = parseSpanishNumber(beforeMonth);
  const spokenYear = parseSpanishNumber(afterMonth);
  const fallbackYear = Number(todayIso.slice(0, 4));
  const year = spokenYear ?? fallbackYear;

  if (day === null || !Number.isInteger(day) || !Number.isInteger(year)) return null;
  return validIsoParts(year, monthEntry[1], day);
}

export function parseSpanishTime(value: string): string | null {
  const normalized = normalizeVoiceText(value);
  const period = /\b(?:pm|p m|tarde|noche)\b/.test(normalized)
    ? "PM"
    : /\b(?:am|a m|manana|madrugada)\b/.test(normalized)
      ? "AM"
      : null;
  const numeric = normalized.match(/\b(\d{1,2})(?::| y |\.)(\d{1,2})\b/);
  let hours: number | null = null;
  let minutes = 0;

  if (numeric) {
    hours = Number(numeric[1]);
    minutes = Number(numeric[2]);
  } else {
    const cleaned = normalized
      .replace(
        /\b(?:de la|del|por la|am|a m|pm|p m|manana|madrugada|tarde|noche|hora)\b/g,
        " "
      )
      .trim();
    const half = /\bmedia\b/.test(cleaned);
    const quarter = /\bcuarto\b/.test(cleaned);
    const hourWords = cleaned.split(/\b(?:y|con|media|cuarto)\b/)[0] ?? "";
    hours = parseSpanishNumber(hourWords);
    minutes = half ? 30 : quarter ? 15 : 0;
  }

  if (hours === null || !Number.isInteger(hours) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (period) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (period === "PM" ? 12 : 0);
  } else if (hours < 0 || hours > 23) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatVoiceDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const monthName = Object.entries(MONTHS).find(
    ([, month]) => month === Number(match[2])
  )?.[0];
  return `${Number(match[3])} de ${monthName ?? match[2]} de ${match[1]}`;
}

export function formatVoiceTime(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return value;
  const hour24 = Number(match[1]);
  const period = hour24 >= 12 ? "de la tarde" : "de la manana";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${match[2]} ${period}`;
}

function parseSpanishIntegerWords(value: string): number | null {
  const tokens = normalizeVoiceText(value)
    .split(/\s+/)
    .filter((token) => token && token !== "y" && token !== "de");
  if (tokens.length === 0) return null;

  let total = 0;
  let group = 0;

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      group += Number(token);
      continue;
    }
    if (UNITS[token] !== undefined) {
      group += UNITS[token];
      continue;
    }
    if (TENS[token] !== undefined) {
      group += TENS[token];
      continue;
    }
    if (HUNDREDS[token] !== undefined) {
      group += HUNDREDS[token];
      continue;
    }
    if (token === "mil") {
      total += (group || 1) * 1000;
      group = 0;
      continue;
    }
    if (token === "millon" || token === "millones") {
      total += (group || 1) * 1_000_000;
      group = 0;
      continue;
    }
    return null;
  }

  return total + group;
}

function validIsoParts(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return formatIsoDate(year, month, day);
}

function formatIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, "");
}
