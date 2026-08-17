export function canUserDeleteVisit(input: {
  agronomistUserId: string;
  canDeleteVisits: boolean | undefined;
  currentUserId: string | undefined;
}) {
  return (
    input.canDeleteVisits === true &&
    typeof input.currentUserId === "string" &&
    input.currentUserId === input.agronomistUserId
  );
}
