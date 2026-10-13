type TodayVisit = {
  visitDate: string;
  agronomistUserId: string;
  endVisitTime: string | null;
};

export function findPreferredTodayVisit<T extends TodayVisit>(
  visits: T[],
  userId: string | null,
  now: Date
): T | undefined {
  if (!userId) return undefined;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const eligible = visits.filter((visit) =>
    visit.visitDate === today && visit.agronomistUserId === userId
  );
  return eligible.find((visit) => !visit.endVisitTime) ?? eligible[0];
}
