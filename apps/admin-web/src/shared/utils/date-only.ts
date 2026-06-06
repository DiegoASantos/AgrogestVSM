const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value: string): Date | null {
  const match = value.trim().match(DATE_ONLY_PATTERN);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    parsedDate.getFullYear() !== Number(year) ||
    parsedDate.getMonth() !== Number(month) - 1 ||
    parsedDate.getDate() !== Number(day)
  ) {
    return null;
  }

  return parsedDate;
}

export function formatDateOnly(value: string, locale = "es-PE") {
  const date = parseDateOnly(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium"
  }).format(date);
}
