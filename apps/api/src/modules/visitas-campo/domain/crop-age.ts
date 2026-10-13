function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

export function formatCropAge(sowingDate: string | null, visitDate: string): string {
  if (!sowingDate) return "";
  const sowing = parseIsoDate(sowingDate);
  const visit = parseIsoDate(visitDate);
  if (!sowing || !visit || sowing > visit) return "";

  let completeMonths =
    (visit.getUTCFullYear() - sowing.getUTCFullYear()) * 12 +
    visit.getUTCMonth() - sowing.getUTCMonth();
  if (visit.getUTCDate() < sowing.getUTCDate()) completeMonths -= 1;

  const years = Math.floor(completeMonths / 12);
  const months = completeMonths % 12;
  return `${years} ${years === 1 ? "año" : "años"}, ${months} ${months === 1 ? "mes" : "meses"}`;
}
